import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Package, Star, User, ArrowUpDown, Trophy } from 'lucide-react';
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
  const {
    user,
    loading
  } = useAuth();
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
      case 'quantity-high':
        return sorted.sort((a, b) => parseFloat(b.quantity) - parseFloat(a.quantity));
      case 'quantity-low':
        return sorted.sort((a, b) => parseFloat(a.quantity) - parseFloat(b.quantity));
      case 'type-az':
        return sorted.sort((a, b) => a.food_type.localeCompare(b.food_type));
      case 'type-za':
        return sorted.sort((a, b) => b.food_type.localeCompare(a.food_type));
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
      case 'quantity-high':
        return sorted.sort((a, b) => parseFloat(b.food_donations?.quantity || '0') - parseFloat(a.food_donations?.quantity || '0'));
      case 'quantity-low':
        return sorted.sort((a, b) => parseFloat(a.food_donations?.quantity || '0') - parseFloat(b.food_donations?.quantity || '0'));
      case 'type-az':
        return sorted.sort((a, b) => (a.food_donations?.food_type || '').localeCompare(b.food_donations?.food_type || ''));
      case 'type-za':
        return sorted.sort((a, b) => (b.food_donations?.food_type || '').localeCompare(a.food_donations?.food_type || ''));
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
      // Get completed donations count
      const { data: completedData, error: completedError } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id)
        .eq('status', 'completed')
        .is('deleted_at', null);
      
      if (completedError) throw completedError;
      
      // Get unique people helped (receivers)
      const { data: helpedData, error: helpedError } = await supabase
        .from('food_requests')
        .select('requester_id, donation_id')
        .eq('status', 'completed');
      
      if (helpedError) throw helpedError;
      
      // Filter to only requests for this user's donations
      const userDonationIds = completedData?.map(d => d.id) || [];
      const uniqueReceivers = new Set(
        helpedData?.filter(r => userDonationIds.includes(r.donation_id))
          .map(r => r.requester_id)
      );
      
      // Get reliability score
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('reliability_score')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      setDonationStats({
        completedDonations: completedData?.length || 0,
        peopleHelped: uniqueReceivers.size
      });
      setReliabilityScore(profileData?.reliability_score || 100);
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
    }
  };
  const fetchUserType = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('user_type').eq('id', user.id).single();
      if (error) throw error;
      setUserType(data?.user_type);
    } catch (error) {
      console.error('Failed to load user type:', error);
    }
  };
  const fetchHistory = async () => {
    if (!user) return;
    try {
      // Fetch ALL user's donations including completed ones
      const {
        data: donationsData,
        error: donationsError
      } = await supabase.from('food_donations').select('*').eq('donor_id', user.id).or('status.eq.completed,deleted_at.not.is.null').order('created_at', {
        ascending: false
      });
      if (donationsError) throw donationsError;

      // For each completed donation, fetch the completed request and receiver info
      const enrichedDonations: FoodDonation[] = donationsData || [];
      if (donationsData) {
        const completedDonationIds = donationsData.filter(d => d.status === 'completed').map(d => d.id);
        if (completedDonationIds.length > 0) {
          const {
            data: completedRequests
          } = await supabase.from('food_requests').select('id, donation_id, requester_id, created_at, donor_rating, receiver_rating').in('donation_id', completedDonationIds).eq('status', 'completed');
          if (completedRequests) {
            // Fetch receiver profiles
            const requesterIds = [...new Set(completedRequests.map(r => r.requester_id))];
            const {
              data: receiverProfiles
            } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', requesterIds);

            // Attach receiver info to donations
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

      // Fetch only COMPLETED user's requests (status = 'completed')
      const {
        data: requestsData,
        error: requestsError
      } = await supabase.from('food_requests').select(`
          *,
          food_donations(*),
          profiles!requester_id(first_name, last_name, email)
        `).eq('requester_id', user.id).eq('status', 'completed').order('created_at', {
        ascending: false
      });

      // Fetch donor profiles for each donation
      if (requestsData) {
        const donorIds = [...new Set(requestsData.map(r => r.food_donations?.donor_id).filter(Boolean))];
        const {
          data: donorProfiles
        } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', donorIds);

        // Attach donor profiles to food_donations
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
    setRatingDialog({
      open: true,
      requestId,
      type,
      otherPersonName
    });
    setSelectedRating(0);
  };
  const submitRating = async () => {
    if (selectedRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setSubmittingRating(true);
    try {
      const updateField = ratingDialog.type === 'donor' ? 'receiver_rating' : 'donor_rating';
      const {
        error
      } = await supabase.from('food_requests').update({
        [updateField]: selectedRating
      }).eq('id', ratingDialog.requestId);
      if (error) throw error;
      toast.success('Rating submitted successfully!');
      setRatingDialog({
        open: false,
        requestId: '',
        type: 'donor',
        otherPersonName: ''
      });
      setSelectedRating(0);
      fetchHistory(); // Refresh data
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };
  if (loading || loadingData) {
    return <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Completed History</h1>
          <p className="text-muted-foreground">
            {userType === 'donor' ? 'View your complete donation history including completed and deleted donations' : 'View your completed donations and received food'}
          </p>
        </div>

        <Tabs defaultValue="donated" className="space-y-6">
          <TabsList>
            {userType !== 'receiver' && <TabsTrigger value="donated">{t('history.donatedFood')} ({donations.length})</TabsTrigger>}
            {userType !== 'receiver' && <TabsTrigger value="achievements" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {t('history.achievements')}
            </TabsTrigger>}
            {userType === 'receiver' && <TabsTrigger value="received">{t('history.receivedFood')} ({requests.length})</TabsTrigger>}
          </TabsList>
          
          {/* Achievements Tab for Donors */}
          {userType !== 'receiver' && (
            <TabsContent value="achievements" className="space-y-4">
              <ImpactScoreCard
                completedDonations={donationStats.completedDonations}
                reliabilityScore={reliabilityScore}
                peopleHelped={donationStats.peopleHelped}
                isTopDonor={donationStats.completedDonations >= 50}
              />
            </TabsContent>
          )}
          
          {userType !== 'receiver' && <TabsContent value="donated" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={donationSort} onValueChange={setDonationSort}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-newest">Date (Newest First)</SelectItem>
                      <SelectItem value="date-oldest">Date (Oldest First)</SelectItem>
                      <SelectItem value="title-az">Title (A-Z)</SelectItem>
                      <SelectItem value="title-za">Title (Z-A)</SelectItem>
                      <SelectItem value="quantity-high">Quantity (High to Low)</SelectItem>
                      <SelectItem value="quantity-low">Quantity (Low to High)</SelectItem>
                      <SelectItem value="type-az">Food Type (A-Z)</SelectItem>
                      <SelectItem value="type-za">Food Type (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Tabs defaultValue="completed" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="completed">Completed ({completedDonations.length})</TabsTrigger>
                  <TabsTrigger value="deleted">Deleted ({deletedDonations.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="completed" className="space-y-4">
                {completedDonations.length === 0 ? <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No completed donations yet</p>
                    </CardContent>
                  </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedDonations.map(donation => <Card key={donation.id} className="overflow-hidden">
                    {donation.image_url && <div className="w-full h-48 overflow-hidden bg-muted">
                        <img src={donation.image_url} alt={donation.title} className="w-full h-full object-cover" />
                      </div>}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl">{donation.title}</CardTitle>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {donation.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {donation.completed_request?.requester_profile && <div className="flex items-center gap-2 text-sm bg-primary/5 px-3 py-2 rounded-md">
                          <User className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Received by</p>
                            <p className="text-muted-foreground">{donation.completed_request.requester_profile.first_name} {donation.completed_request.requester_profile.last_name}</p>
                          </div>
                        </div>}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{donation.quantity} {donation.quantity_unit} • {donation.food_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{donation.pickup_location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Donated: {new Date(donation.created_at).toLocaleDateString()}</span>
                      </div>
                      {donation.completed_request && <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50 mt-2">
                          <p className="text-sm font-semibold text-foreground">Mutual Ratings</p>
                          <div className="space-y-2">
                            {/* Rating you gave */}
                            {donation.completed_request.receiver_rating ? <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-blue-500 fill-blue-500" />
                                <span className="text-sm">
                                  You rated them: {donation.completed_request.receiver_rating}/5 ({getRatingLabel(donation.completed_request.receiver_rating)})
                                </span>
                              </div> : <Button size="sm" variant="outline" onClick={() => handleRateUser(donation.completed_request!.id, 'donor', `${donation.completed_request?.requester_profile?.first_name} ${donation.completed_request?.requester_profile?.last_name}`)}>
                                <Star className="h-4 w-4 mr-2" />
                                Rate Receiver
                              </Button>}
                          </div>
                        </div>}
                    </CardContent>
                  </Card>)}
                  </div>}
                </TabsContent>
                
                <TabsContent value="deleted" className="space-y-4">
                {deletedDonations.length === 0 ? <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No deleted donations</p>
                    </CardContent>
                  </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deletedDonations.map(donation => <Card key={donation.id} className="overflow-hidden">
                        {donation.image_url && <div className="w-full h-48 overflow-hidden bg-muted">
                            <img src={donation.image_url} alt={donation.title} className="w-full h-full object-cover" />
                          </div>}
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-xl">{donation.title}</CardTitle>
                            <Badge variant="destructive">Deleted</Badge>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {donation.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>{donation.quantity} {donation.quantity_unit} • {donation.food_type}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{donation.pickup_location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Donated: {new Date(donation.created_at).toLocaleDateString()}</span>
                          </div>
                          {donation.rating && <div className="flex items-center gap-2 pt-2 border-t">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">
                                {getFreshnessLabel(donation.rating)} ({donation.rating}/5)
                              </span>
                            </div>}
                        </CardContent>
                      </Card>)}
                  </div>}
                </TabsContent>
              </Tabs>
            </TabsContent>}
          
          {userType !== 'donor' && <TabsContent value="received" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={requestSort} onValueChange={setRequestSort}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-newest">Date (Newest First)</SelectItem>
                    <SelectItem value="date-oldest">Date (Oldest First)</SelectItem>
                    <SelectItem value="title-az">Title (A-Z)</SelectItem>
                    <SelectItem value="title-za">Title (Z-A)</SelectItem>
                    <SelectItem value="quantity-high">Quantity (High to Low)</SelectItem>
                    <SelectItem value="quantity-low">Quantity (Low to High)</SelectItem>
                    <SelectItem value="type-az">Food Type (A-Z)</SelectItem>
                    <SelectItem value="type-za">Food Type (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {sortedRequests.length === 0 ? <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed requests yet</p>
                </CardContent>
              </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedRequests.map(request => <Card key={request.id} className="overflow-hidden">
                    {request.food_donations?.image_url && <div className="w-full h-48 overflow-hidden bg-muted">
                        <img src={request.food_donations.image_url} alt={request.food_donations.title} className="w-full h-full object-cover" />
                      </div>}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl">{request.food_donations?.title}</CardTitle>
                        <Badge variant="default">Received</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {request.food_donations?.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {request.food_donations?.profiles && <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                          <User className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Donor</p>
                            <p className="text-muted-foreground">{request.food_donations.profiles.first_name} {request.food_donations.profiles.last_name}</p>
                          </div>
                        </div>}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{request.food_donations?.quantity} {request.food_donations?.quantity_unit} • {request.food_donations?.food_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{request.food_donations?.pickup_location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Received: {new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50 mt-2">
                        <p className="text-sm font-semibold text-foreground">Ratings</p>
                        <div className="space-y-2">
                          {/* Rating you gave */}
                          {request.donor_rating ? <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-blue-500 fill-blue-500" />
                              <span className="text-sm">
                                You rated them: {request.donor_rating}/5 ({getRatingLabel(request.donor_rating)})
                              </span>
                            </div> : <Button size="sm" variant="outline" onClick={() => handleRateUser(request.id, 'receiver', request.food_donations?.profiles ? `${request.food_donations.profiles.first_name} ${request.food_donations.profiles.last_name}` : 'the donor')}>
                              <Star className="h-4 w-4 mr-2" />
                              Rate Donor
                            </Button>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}
            </TabsContent>}
        </Tabs>
      </div>

      {/* Rating Dialog */}
      <Dialog open={ratingDialog.open} onOpenChange={open => setRatingDialog({
      ...ratingDialog,
      open
    })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {ratingDialog.otherPersonName}</DialogTitle>
            <DialogDescription>
              How would you rate your experience with {ratingDialog.otherPersonName}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center gap-2 py-8">
            {[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => setSelectedRating(star)} className="transition-all hover:scale-110">
                <Star className={`h-10 w-10 ${star <= selectedRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              </button>)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setRatingDialog({
              open: false,
              requestId: '',
              type: 'donor',
              otherPersonName: ''
            });
            setSelectedRating(0);
          }}>
              Cancel
            </Button>
            <Button onClick={submitRating} disabled={submittingRating || selectedRating === 0}>
              {submittingRating ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}