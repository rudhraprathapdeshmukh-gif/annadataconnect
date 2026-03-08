import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Package, Star, User, ArrowUpDown, Trophy, Heart, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ImpactScoreCard } from '@/components/ImpactScoreCard';

interface FoodDonation {
  id: string;
  title: string;
  description: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  expiry_date: string;
  pickup_location: string;
  status: string;
  created_at: string;
  rating: number | null;
  image_url?: string | null;
  donor_id: string;
  deleted_at?: string | null;
  completed_request?: {
    id: string;
    created_at: string;
    donor_rating: number | null;
    receiver_rating: number | null;
    requester_profile?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

interface FoodRequest {
  id: string;
  donation_id: string;
  requester_id: string;
  status: string;
  message: string;
  created_at: string;
  accepted_at: string | null;
  donor_rating: number | null;
  receiver_rating: number | null;
  food_donations: FoodDonation & {
    profiles?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function History() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [ratingDialog, setRatingDialog] = useState<{
    open: boolean;
    requestId: string;
    type: 'donor' | 'receiver';
    otherPersonName: string;
  }>({
    open: false,
    requestId: '',
    type: 'donor',
    otherPersonName: ''
  });
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [donationSort, setDonationSort] = useState('date-newest');
  const [requestSort, setRequestSort] = useState('date-newest');
  const [donationStats, setDonationStats] = useState({
    completedDonations: 0,
    peopleHelped: 0
  });
  const [reliabilityScore, setReliabilityScore] = useState(100);
  const [userName, setUserName] = useState('');
  

  const getFreshnessLabel = (rating: number): string => {
    switch (rating) {
      case 1: return t('freshness.aged');
      case 2: return t('freshness.poor');
      case 3: return t('freshness.okay');
      case 4: return t('freshness.fresh');
      case 5: return t('freshness.justMade');
      default: return '';
    }
  };

  const getRatingLabel = (rating: number): string => {
    switch (rating) {
      case 5: return t('ratings.excellent');
      case 4: return t('ratings.good');
      case 3: return t('ratings.average');
      case 2: return t('ratings.poor');
      case 1: return t('ratings.veryPoor');
      default: return t('ratings.rate');
    }
  };

  const sortDonations = (donations: FoodDonation[], sortType: string) => {
    const sorted = [...donations];
    switch (sortType) {
      case 'date-newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date-oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'title-az':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-za':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  };

  const sortRequests = (requests: FoodRequest[], sortType: string) => {
    const sorted = [...requests];
    switch (sortType) {
      case 'date-newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date-oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'title-az':
        return sorted.sort((a, b) => (a.food_donations?.title || '').localeCompare(b.food_donations?.title || ''));
      case 'title-za':
        return sorted.sort((a, b) => (b.food_donations?.title || '').localeCompare(a.food_donations?.title || ''));
      default:
        return sorted;
    }
  };

  const completedDonations = sortDonations(donations.filter(d => d.status === 'completed' && !d.deleted_at), donationSort);
  const deletedDonations = sortDonations(donations.filter(d => d.deleted_at), donationSort);
  const sortedRequests = sortRequests(requests, requestSort);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchUserType();
      fetchDonationStats();
    }
  }, [user]);

  const fetchDonationStats = async () => {
    if (!user) return;
    try {
      const { data: completedData, error: completedError } = await supabase
        .from('food_donations')
        .select('id, quantity, quantity_unit')
        .eq('donor_id', user.id)
        .eq('status', 'completed')
        .is('deleted_at', null);
      
      if (completedError) throw completedError;
      
      // Calculate people helped using weighted logic (same as Impact Tracker)
      const calcPeopleHelped = (completedData || []).reduce((sum, d) => {
        const num = parseFloat(d.quantity);
        if (isNaN(num) || num <= 0) return sum;
        const unit = (d.quantity_unit || 'kg').toLowerCase();
        if (unit === 'kg' || unit === 'litre' || unit === 'litres' || unit === 'l') {
          return sum + Math.ceil(num * 2);
        }
        if (unit === 'g' || unit === 'grams' || unit === 'gram' || unit === 'ml') {
          return sum + (num <= 100 ? 1 : Math.ceil(num / 500));
        }
        return sum + Math.ceil(num);
      }, 0);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('reliability_score')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      setDonationStats({
        completedDonations: completedData?.length || 0,
        peopleHelped: calcPeopleHelped
      });
      setReliabilityScore(profileData?.reliability_score || 100);
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
    }
  };

  const fetchUserType = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, first_name, last_name')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setUserType(data?.user_type);
      const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(' ') || 'Donor';
      setUserName(fullName);
    } catch (error) {
      console.error('Failed to load user type:', error);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data: donationsData, error: donationsError } = await supabase
        .from('food_donations')
        .select('*')
        .eq('donor_id', user.id)
        .or('status.eq.completed,deleted_at.not.is.null')
        .order('created_at', { ascending: false });
      
      if (donationsError) throw donationsError;

      const enrichedDonations: FoodDonation[] = donationsData || [];
      if (donationsData) {
        const completedDonationIds = donationsData.filter(d => d.status === 'completed').map(d => d.id);
        if (completedDonationIds.length > 0) {
          const { data: completedRequests } = await supabase
            .from('food_requests')
            .select('id, donation_id, requester_id, created_at, donor_rating, receiver_rating')
            .in('donation_id', completedDonationIds)
            .eq('status', 'completed');
          
          if (completedRequests) {
            const requesterIds = [...new Set(completedRequests.map(r => r.requester_id))];
            const { data: receiverProfiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email')
              .in('id', requesterIds);

            enrichedDonations.forEach((donation: any) => {
              const request = completedRequests.find(r => r.donation_id === donation.id);
              if (request && receiverProfiles) {
                const receiver = receiverProfiles.find(p => p.id === request.requester_id);
                if (receiver) {
                  donation.completed_request = {
                    id: request.id,
                    created_at: request.created_at,
                    donor_rating: request.donor_rating,
                    receiver_rating: request.receiver_rating,
                    requester_profile: {
                      first_name: receiver.first_name,
                      last_name: receiver.last_name,
                      email: receiver.email
                    }
                  };
                }
              }
            });
          }
        }
      }
      setDonations(enrichedDonations);

      const { data: requestsData, error: requestsError } = await supabase
        .from('food_requests')
        .select(`*, food_donations(*), profiles!requester_id(first_name, last_name, email)`)
        .eq('requester_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (requestsData) {
        const donorIds = [...new Set(requestsData.map(r => r.food_donations?.donor_id).filter(Boolean))];
        const { data: donorProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', donorIds);

        requestsData.forEach(request => {
          if (request.food_donations && donorProfiles) {
            const donor = donorProfiles.find(p => p.id === request.food_donations.donor_id);
            if (donor) {
              (request.food_donations as any).profiles = {
                first_name: donor.first_name,
                last_name: donor.last_name,
                email: donor.email
              };
            }
          }
        });
      }
      if (requestsError) throw requestsError;
      setRequests(requestsData || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRateUser = (requestId: string, type: 'donor' | 'receiver', otherPersonName: string) => {
    setRatingDialog({ open: true, requestId, type, otherPersonName });
    setSelectedRating(0);
  };

  const submitRating = async () => {
    if (selectedRating === 0) {
      toast.error(t('history.selectRating'));
      return;
    }
    setSubmittingRating(true);
    try {
      const updateField = ratingDialog.type === 'donor' ? 'receiver_rating' : 'donor_rating';
      const { error } = await supabase
        .from('food_requests')
        .update({ [updateField]: selectedRating })
        .eq('id', ratingDialog.requestId);
      if (error) throw error;
      toast.success(t('history.ratingSubmitted'));
      setRatingDialog({ open: false, requestId: '', type: 'donor', otherPersonName: '' });
      setSelectedRating(0);
      fetchHistory();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(t('history.failedSubmitRating'));
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">{t('history.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {userType === 'donor' ? t('history.donorDescription') : t('history.receiverDescription')}
          </p>
        </div>

        {userType !== 'receiver' && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Card className="p-2 sm:p-4 text-center min-w-0">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-red-500" />
              <p className="text-lg sm:text-2xl font-bold">{donationStats.completedDonations}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('history.donations')}</p>
            </Card>
            <Card className="p-2 sm:p-4 text-center min-w-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-lg sm:text-2xl font-bold">{donationStats.peopleHelped}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('history.helped')}</p>
            </Card>
            <Card className="p-2 sm:p-4 text-center min-w-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-green-500" />
              <p className="text-lg sm:text-2xl font-bold">{Math.round(reliabilityScore)}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('history.reliability')}</p>
            </Card>
          </div>
        )}

        <Tabs defaultValue="donated" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 h-auto p-1 overflow-hidden">
            {userType !== 'receiver' && (
              <>
                <TabsTrigger value="donated" className="text-[11px] sm:text-sm py-2 px-1.5 sm:px-3 min-w-0 overflow-hidden">
                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                  <span className="truncate">{t('history.completed')} ({completedDonations.length})</span>
                </TabsTrigger>
                <TabsTrigger value="deleted" className="text-[11px] sm:text-sm py-2 px-1.5 sm:px-3 min-w-0 overflow-hidden">
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                  <span className="truncate">{t('history.deleted')} ({deletedDonations.length})</span>
                </TabsTrigger>
              </>
            )}
            {userType === 'receiver' && (
              <TabsTrigger value="received" className="text-[11px] sm:text-sm py-2 px-1.5 sm:px-3 col-span-2 w-full min-w-0 overflow-hidden">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                <span className="truncate">{t('history.received')} ({requests.length})</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          {userType !== 'receiver' && (
            <TabsContent value="donated" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Select value={donationSort} onValueChange={setDonationSort}>
                  <SelectTrigger className="w-[140px] h-9">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    <SelectValue placeholder={t('common.sort')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-newest">{t('common.newest')}</SelectItem>
                    <SelectItem value="date-oldest">{t('common.oldest')}</SelectItem>
                    <SelectItem value="title-az">{t('common.az')}</SelectItem>
                    <SelectItem value="title-za">{t('common.za')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {completedDonations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('history.noCompletedDonations')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedDonations.map(donation => (
                    <Card key={donation.id} className="overflow-hidden">
                      <div className="flex">
                        {donation.image_url && (
                          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0">
                            <img src={donation.image_url} alt={donation.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 p-3 md:p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base truncate">{donation.title}</h3>
                            <Badge variant="secondary" className="shrink-0 text-xs">{t('history.completed')}</Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {donation.quantity} {donation.quantity_unit} • {donation.food_type}
                            </p>
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(donation.created_at).toLocaleDateString()}
                            </p>
                            {donation.pickup_location && (
                              <p className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{donation.pickup_location}</span>
                              </p>
                            )}
                            {donation.completed_request?.requester_profile && (
                              <p className="flex items-center gap-1 text-primary">
                                <User className="h-3 w-3" />
                                {t('common.to')} {donation.completed_request.requester_profile.first_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {userType !== 'receiver' && (
            <TabsContent value="deleted" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Select value={donationSort} onValueChange={setDonationSort}>
                  <SelectTrigger className="w-[140px] h-9">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    <SelectValue placeholder={t('common.sort')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-newest">{t('common.newest')}</SelectItem>
                    <SelectItem value="date-oldest">{t('common.oldest')}</SelectItem>
                    <SelectItem value="title-az">{t('common.az')}</SelectItem>
                    <SelectItem value="title-za">{t('common.za')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {deletedDonations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('history.noDeletedDonations')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {deletedDonations.map(donation => (
                    <Card key={donation.id} className="overflow-hidden opacity-75">
                      <div className="flex">
                        {donation.image_url && (
                          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 grayscale">
                            <img src={donation.image_url} alt={donation.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 p-3 md:p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base truncate">{donation.title}</h3>
                            <Badge variant="destructive" className="shrink-0 text-xs">{t('history.deleted')}</Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {donation.quantity} {donation.quantity_unit} • {donation.food_type}
                            </p>
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(donation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
          
          {userType !== 'donor' && (
            <TabsContent value="received" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Select value={requestSort} onValueChange={setRequestSort}>
                  <SelectTrigger className="w-[140px] h-9">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    <SelectValue placeholder={t('common.sort')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-newest">{t('common.newest')}</SelectItem>
                    <SelectItem value="date-oldest">{t('common.oldest')}</SelectItem>
                    <SelectItem value="title-az">{t('common.az')}</SelectItem>
                    <SelectItem value="title-za">{t('common.za')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sortedRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('history.noReceivedFood')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sortedRequests.map(request => (
                    <Card key={request.id} className="overflow-hidden">
                      <div className="flex">
                        {request.food_donations?.image_url && (
                          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0">
                            <img src={request.food_donations.image_url} alt={request.food_donations.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 p-3 md:p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base truncate">
                              {request.food_donations?.title}
                            </h3>
                            <Badge variant="default" className="shrink-0 text-xs">{t('history.received')}</Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {request.food_donations?.quantity} {request.food_donations?.quantity_unit} • {request.food_donations?.food_type}
                            </p>
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            {request.food_donations?.pickup_location && (
                              <p className="flex items-start gap-1">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{request.food_donations.pickup_location}</span>
                              </p>
                            )}
                            {request.food_donations?.profiles && (
                              <p className="flex items-center gap-1 text-primary">
                                <User className="h-3 w-3" />
                                {t('common.from')} {request.food_donations.profiles.first_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={ratingDialog.open} onOpenChange={(open) => setRatingDialog({ ...ratingDialog, open })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('history.rate')} {ratingDialog.otherPersonName}</DialogTitle>
            <DialogDescription>
              {t('history.howWasExperience')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center gap-2 py-6">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star} 
                onClick={() => setSelectedRating(star)} 
                className="transition-all hover:scale-110 touch-target"
              >
                <Star className={`h-10 w-10 ${star <= selectedRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
              </button>
            ))}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setRatingDialog({ open: false, requestId: '', type: 'donor', otherPersonName: '' });
                setSelectedRating(0);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1"
              onClick={submitRating} 
              disabled={submittingRating || selectedRating === 0}
            >
              {submittingRating ? t('common.submitting') : t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
