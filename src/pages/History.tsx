import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Package, Star, User, ArrowUpDown, Trophy, Heart, TrendingUp, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ImpactScoreCard } from '@/components/ImpactScoreCard';

interface DonationItemInfo {
  id: string;
  title: string;
  description: string | null;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type: string | null;
  rating: number | null;
  image_url: string | null;
  expiry_date: string | null;
}

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
  items?: DonationItemInfo[];
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
    otherPersonId: string;
    donationTitle: string;
  }>({
    open: false,
    requestId: '',
    type: 'donor',
    otherPersonName: '',
    otherPersonId: '',
    donationTitle: ''
  });
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId: string; donationTitle: string; requestId: string } | null>(null);
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

  const getApproxLocation = (location: string): string => {
    if (!location) return '';
    const parts = location.split(',').map(p => p.trim());
    // Extract city/state/country - skip first part (exact address) and last parts if they're just numbers
    const meaningful = parts.filter(p => p && !/^\d{6}$/.test(p) && !/^\d+[\s/]/.test(p));
    // Take last 2-3 meaningful parts (city, state, country)
    if (meaningful.length <= 2) return meaningful.join(', ');
    return meaningful.slice(-3).join(', ');
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

      const completedIds = (completedData || []).map(d => d.id);

      // Fetch individual items for completed donations (same as Impact Tracker)
      let itemsByDonation: Record<string, { quantity: string; quantity_unit: string }[]> = {};
      if (completedIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('donation_items')
          .select('donation_id, quantity, quantity_unit')
          .in('donation_id', completedIds);

        if (itemsData && itemsData.length > 0) {
          itemsData.forEach(item => {
            if (!itemsByDonation[item.donation_id]) {
              itemsByDonation[item.donation_id] = [];
            }
            itemsByDonation[item.donation_id].push({ quantity: item.quantity, quantity_unit: item.quantity_unit });
          });
        }
      }

      const calcPeople = (qty: string, unit: string) => {
        const num = parseFloat(qty);
        if (isNaN(num) || num <= 0) return 0;
        const u = (unit || 'kg').toLowerCase();
        if (u === 'kg' || u === 'litre' || u === 'litres' || u === 'l') return Math.ceil(num * 2);
        if (u === 'g' || u === 'grams' || u === 'gram' || u === 'ml') return num <= 100 ? 1 : Math.ceil(num / 500);
        return Math.ceil(num);
      };

      const calcPeopleHelped = (completedData || []).reduce((sum, d) => {
        const items = itemsByDonation[d.id];
        if (items && items.length > 0) {
          return sum + items.reduce((s, item) => s + calcPeople(item.quantity, item.quantity_unit), 0);
        }
        return sum + calcPeople(d.quantity, d.quantity_unit);
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
      // Fetch donation items for all donations
      const allDonationIds = enrichedDonations.map(d => d.id);
      if (allDonationIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('donation_items')
          .select('id, donation_id, title, description, quantity, quantity_unit, food_type, diet_type, rating, image_url, expiry_date')
          .in('donation_id', allDonationIds);
        if (itemsData) {
          const itemsMap: Record<string, DonationItemInfo[]> = {};
          itemsData.forEach((item: any) => {
            if (!itemsMap[item.donation_id]) itemsMap[item.donation_id] = [];
            itemsMap[item.donation_id].push(item);
          });
          enrichedDonations.forEach((d: any) => {
            d.items = itemsMap[d.id] || [];
          });
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
        // Fetch items for receiver requests
        const reqDonationIds = [...new Set(requestsData.map(r => r.food_donations?.id).filter(Boolean))];
        if (reqDonationIds.length > 0) {
          const { data: reqItemsData } = await supabase
            .from('donation_items')
            .select('id, donation_id, title, description, quantity, quantity_unit, food_type, diet_type, rating, image_url, expiry_date')
            .in('donation_id', reqDonationIds);
          if (reqItemsData) {
            const reqItemsMap: Record<string, DonationItemInfo[]> = {};
            reqItemsData.forEach((item: any) => {
              if (!reqItemsMap[item.donation_id]) reqItemsMap[item.donation_id] = [];
              reqItemsMap[item.donation_id].push(item);
            });
            requestsData.forEach((r: any) => {
              if (r.food_donations) {
                r.food_donations.items = reqItemsMap[r.food_donations.id] || [];
              }
            });
          }
        }
      }
      if (requestsError) throw requestsError;
      setRequests(requestsData || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRateUser = (requestId: string, type: 'donor' | 'receiver', otherPersonName: string, otherPersonId: string, donationTitle: string) => {
    setRatingDialog({ open: true, requestId, type, otherPersonName, otherPersonId, donationTitle });
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
      setRatingDialog({ open: false, requestId: '', type: 'donor', otherPersonName: '', otherPersonId: '', donationTitle: '' });
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
                <div className="space-y-4">
                  {completedDonations.map(donation => {
                    const items = donation.items && donation.items.length > 0 ? donation.items : null;
                    const allImages = items 
                      ? items.map(i => i.image_url).filter(Boolean) as string[]
                      : donation.image_url ? [donation.image_url] : [];
                    const displayTitle = items ? items.map(i => i.title).join(', ') : donation.title;

                    return (
                      <Card key={donation.id} className="overflow-hidden">
                        {/* Image gallery */}
                        {allImages.length > 0 && (
                          <div className={`grid gap-0.5 ${allImages.length === 1 ? 'grid-cols-1' : allImages.length === 2 ? 'grid-cols-2' : allImages.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                            {allImages.map((url, idx) => (
                              <div key={idx} className={`overflow-hidden ${allImages.length === 1 ? 'h-48' : 'h-32'}`}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-3 sm:p-4 space-y-2.5">
                          {/* Title + badge */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">{displayTitle}</h3>
                            <Badge variant="secondary" className="shrink-0 text-xs">{t('history.completed')}</Badge>
                          </div>

                          {/* Items list */}
                          <div className="space-y-1">
                            {items ? items.map(item => (
                              <div key={item.id} className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span className="shrink-0">{item.title}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="shrink-0">{item.quantity} {item.quantity_unit}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate">{item.food_type}</span>
                                  {item.diet_type && (
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.diet_type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                  )}
                                </div>
                                {item.expiry_date && (
                                  <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 ml-[18px]">
                                    <Clock className="h-2.5 w-2.5 shrink-0" />
                                    <span>{new Date(item.expiry_date).toLocaleDateString()} {new Date(item.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                  </div>
                                )}
                              </div>
                            )) : (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span className="shrink-0">{donation.quantity} {donation.quantity_unit}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate">{donation.food_type}</span>
                                </div>
                                {donation.expiry_date && (
                                  <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 ml-[18px]">
                                    <Clock className="h-2.5 w-2.5 shrink-0" />
                                    <span>{new Date(donation.expiry_date).toLocaleDateString()} {new Date(donation.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(donation.created_at).toLocaleDateString()}
                            </span>
                            {donation.pickup_location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[200px]">{getApproxLocation(donation.pickup_location)}</span>
                              </span>
                            )}
                            {donation.completed_request?.requester_profile && (
                              <span className="flex items-center gap-1 text-primary">
                                <User className="h-3 w-3" />
                                {t('common.to')} {donation.completed_request.requester_profile.first_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
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
                <div className="space-y-4">
                  {deletedDonations.map(donation => {
                    const items = donation.items && donation.items.length > 0 ? donation.items : null;
                    const allImages = items
                      ? items.map(i => i.image_url).filter(Boolean) as string[]
                      : donation.image_url ? [donation.image_url] : [];
                    const displayTitle = items ? items.map(i => i.title).join(', ') : donation.title;

                    return (
                      <Card key={donation.id} className="overflow-hidden opacity-75">
                        {allImages.length > 0 && (
                          <div className={`grid gap-0.5 grayscale ${allImages.length === 1 ? 'grid-cols-1' : allImages.length === 2 ? 'grid-cols-2' : allImages.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                            {allImages.map((url, idx) => (
                              <div key={idx} className={`overflow-hidden ${allImages.length === 1 ? 'h-48' : 'h-32'}`}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-3 sm:p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">{displayTitle}</h3>
                            <Badge variant="destructive" className="shrink-0 text-xs">{t('history.deleted')}</Badge>
                          </div>

                          <div className="space-y-1">
                            {items ? items.map(item => (
                              <div key={item.id} className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span className="shrink-0">{item.title}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="shrink-0">{item.quantity} {item.quantity_unit}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate">{item.food_type}</span>
                                </div>
                                {item.expiry_date && (
                                  <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 ml-[18px]">
                                    <Clock className="h-2.5 w-2.5 shrink-0" />
                                    <span>{new Date(item.expiry_date).toLocaleDateString()} {new Date(item.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                  </div>
                                )}
                              </div>
                            )) : (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Package className="h-3 w-3 shrink-0" />
                                  <span className="shrink-0">{donation.quantity} {donation.quantity_unit}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate">{donation.food_type}</span>
                                </div>
                                {donation.expiry_date && (
                                  <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 ml-[18px]">
                                    <Clock className="h-2.5 w-2.5 shrink-0" />
                                    <span>{new Date(donation.expiry_date).toLocaleDateString()} {new Date(donation.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(donation.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
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
                <div className="space-y-4">
                  {sortedRequests.map(request => {
                    const donation = request.food_donations;
                    const items = (donation as any)?.items?.length > 0 ? ((donation as any).items as DonationItemInfo[]) : null;
                    const allImages = items
                      ? items.map(i => i.image_url).filter(Boolean) as string[]
                      : donation?.image_url ? [donation.image_url] : [];
                    const displayTitle = items ? items.map(i => i.title).join(', ') : donation?.title;

                    return (
                      <Card key={request.id} className="overflow-hidden">
                        {allImages.length > 0 && (
                          <div className={`grid gap-0.5 ${allImages.length === 1 ? 'grid-cols-1' : allImages.length === 2 ? 'grid-cols-2' : allImages.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                            {allImages.map((url, idx) => (
                              <div key={idx} className={`overflow-hidden ${allImages.length === 1 ? 'h-48' : 'h-32'}`}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-3 sm:p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm sm:text-base leading-snug line-clamp-2">{displayTitle}</h3>
                            <Badge variant="default" className="shrink-0 text-xs">{t('history.received')}</Badge>
                          </div>

                          <div className="space-y-1">
                            {items ? items.map(item => (
                              <div key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Package className="h-3 w-3 shrink-0" />
                                <span>{item.title} • {item.quantity} {item.quantity_unit} • {item.food_type}</span>
                                {item.diet_type && (
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.diet_type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                )}
                                {item.expiry_date && (
                                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                    <Clock className="h-3 w-3" />
                                    {new Date(item.expiry_date).toLocaleDateString()} {new Date(item.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                              </div>
                            )) : (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Package className="h-3 w-3 shrink-0" />
                                <span>{donation?.quantity} {donation?.quantity_unit} • {donation?.food_type}</span>
                                {donation?.expiry_date && (
                                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                    <Clock className="h-3 w-3" />
                                    {new Date(donation.expiry_date).toLocaleDateString()} {new Date(donation.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                            {donation?.pickup_location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[200px]">{getApproxLocation(donation.pickup_location)}</span>
                              </span>
                            )}
                            {(donation as any)?.profiles && (
                              <span className="flex items-center gap-1 text-primary">
                                <User className="h-3 w-3" />
                                {t('common.from')} {(donation as any).profiles.first_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
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

          <DialogFooter>
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
