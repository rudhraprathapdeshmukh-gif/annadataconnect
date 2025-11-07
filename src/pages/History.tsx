import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Package, Star, User } from 'lucide-react';

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
}

interface FoodRequest {
  id: string;
  donation_id: string;
  requester_id: string;
  status: string;
  message: string;
  created_at: string;
  accepted_at: string | null;
  food_donations: FoodDonation & {
    profiles?: {
      full_name: string;
      email: string;
    };
  };
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function History() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchUserType();
    }
  }, [user]);

  const fetchUserType = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserType(data?.user_type);
    } catch (error) {
      console.error('Failed to load user type:', error);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;

    try {
      // Fetch ALL user's donations including soft-deleted ones (claimed + deleted)
      const { data: donationsData, error: donationsError } = await supabase
        .from('food_donations')
        .select('*')
        .eq('donor_id', user.id)
        .or('status.eq.claimed,deleted_at.not.is.null')
        .order('created_at', { ascending: false });

      if (donationsError) throw donationsError;
      setDonations(donationsData || []);

      // Fetch only COMPLETED user's requests (status = 'completed')
      const { data: requestsData, error: requestsError } = await supabase
        .from('food_requests')
        .select(`
          *,
          food_donations!inner(*),
          profiles!requester_id(full_name, email)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Fetch donor profiles for each donation
      if (requestsData) {
        const donorIds = [...new Set(requestsData.map(r => r.food_donations?.donor_id).filter(Boolean))];
        const { data: donorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', donorIds);

        // Attach donor profiles to food_donations
        requestsData.forEach(request => {
          if (request.food_donations && donorProfiles) {
            const donor = donorProfiles.find(p => p.id === request.food_donations.donor_id);
            if (donor) {
              (request.food_donations as any).profiles = { full_name: donor.full_name, email: donor.email };
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

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Completed History</h1>
          <p className="text-muted-foreground">
            {userType === 'donor' 
              ? 'View your complete donation history including completed and deleted donations'
              : 'View your completed donations and received food'}
          </p>
        </div>

        <Tabs defaultValue={userType === 'receiver' ? 'received' : 'donated'} className="space-y-6">
          <TabsList>
            {userType !== 'receiver' && (
              <TabsTrigger value="donated">Donated Food ({donations.length})</TabsTrigger>
            )}
            {userType !== 'donor' && (
              <TabsTrigger value="received">Received Food ({requests.length})</TabsTrigger>
            )}
          </TabsList>
          
          {userType !== 'receiver' && (
            <TabsContent value="donated" className="space-y-4">
            {donations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed donations yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {donations.map((donation) => (
                  <Card key={donation.id} className="overflow-hidden">
                    {donation.image_url && (
                      <div className="w-full h-48 overflow-hidden bg-muted">
                        <img 
                          src={donation.image_url} 
                          alt={donation.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl">{donation.title}</CardTitle>
                        <Badge variant={donation.deleted_at ? "destructive" : "secondary"}>
                          {donation.deleted_at ? "Deleted" : "Completed"}
                        </Badge>
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
                      {donation.rating && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">Rating: {donation.rating}/5</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </TabsContent>
          )}
          
          {userType !== 'donor' && (
            <TabsContent value="received" className="space-y-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No completed requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    {request.food_donations?.image_url && (
                      <div className="w-full h-48 overflow-hidden bg-muted">
                        <img 
                          src={request.food_donations.image_url} 
                          alt={request.food_donations.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
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
                      {request.food_donations?.profiles && (
                        <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                          <User className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">Donor</p>
                            <p className="text-muted-foreground">{request.food_donations.profiles.full_name}</p>
                          </div>
                        </div>
                      )}
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
                      {request.food_donations?.rating && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">Rating: {request.food_donations.rating}/5</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
