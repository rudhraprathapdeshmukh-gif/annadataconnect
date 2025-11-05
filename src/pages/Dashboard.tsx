import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Map from '@/components/Map';
import RequestCard from '@/components/RequestCard';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Package, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useCountdown } from '@/hooks/useCountdown';

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
  donor_id: string;
  rating: number | null;
  latitude?: number;
  longitude?: number;
  image_url?: string | null;
}

interface FoodRequest {
  id: string;
  donation_id: string;
  requester_id: string;
  status: string;
  message: string;
  created_at: string;
  accepted_at: string | null;
  food_donations: FoodDonation;
  profiles: {
    full_name: string;
    email: string;
    phone_number?: string;
  };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myDonations, setMyDonations] = useState<FoodDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [isDonorView, setIsDonorView] = useState(true);
  const [canToggle, setCanToggle] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchDonations();
    if (user) {
      fetchMyDonations();
      fetchRequests();
      fetchMyRequests();
    }
  }, [user]);

  // Determine user role and toggle availability
  useEffect(() => {
    const isDonor = myDonations.length > 0;
    const isReceiver = myRequests.length > 0 || myDonations.length === 0;
    
    // User can toggle if they have both donated and requested
    setCanToggle(isDonor && myRequests.length > 0);
    
    // Set default view based on role
    if (isDonor && !isReceiver) {
      setIsDonorView(true);
    } else if (isReceiver && !isDonor) {
      setIsDonorView(false);
    }
  }, [myDonations, myRequests]);

  // Real-time subscription for food_requests updates
  useEffect(() => {
    if (!user) return;

    const requestsChannel = supabase
      .channel('food_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_requests'
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('Real-time request update:', payload);
          }
          // Refresh requests when any change occurs
          fetchRequests();
          fetchMyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
    };
  }, [user]);

  // Real-time subscription for food_donations updates (for map)
  useEffect(() => {
    if (!user) return;

    const donationsChannel = supabase
      .channel('food_donations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_donations',
          filter: 'status=eq.available'
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('Real-time donation update:', payload);
          }
          // Refresh donations when any change occurs
          fetchDonations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(donationsChannel);
    };
  }, [user]);

  const fetchDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('food_donations')
        .select('id, title, description, pickup_location, status, latitude, longitude, quantity, quantity_unit, food_type, donor_id, created_at, expiry_date, rating, image_url')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      toast.error('Failed to load donations');
    } finally {
      setLoadingDonations(false);
    }
  };

  const fetchMyDonations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('food_donations')
        .select('id, title, description, pickup_location, status, latitude, longitude, quantity, quantity_unit, food_type, donor_id, created_at, expiry_date, rating, image_url')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyDonations(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load my donations:', error);
      }
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          food_donations(*),
          profiles(full_name, email, phone_number)
        `)
        .in('donation_id', (
          await supabase
            .from('food_donations')
            .select('id')
            .eq('donor_id', user.id)
        ).data?.map(d => d.id) || [])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load requests:', error);
      }
      toast.error('Failed to load requests');
    }
  };

  const fetchMyRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          food_donations(*),
          profiles(full_name, email, phone_number)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load my requests:', error);
      }
      toast.error('Failed to load requests');
    }
  };

  const requestFood = async (donationId: string) => {
    if (!user) return;

    try {
      // Check if user is trying to request their own donation
      const donation = donations.find(d => d.id === donationId);
      if (donation && donation.donor_id === user.id) {
        toast.error('You cannot request your own donation');
        return;
      }

      // Check for existing pending request
      const { data: existing } = await supabase
        .from('food_requests')
        .select('id')
        .eq('donation_id', donationId)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (existing && existing.length > 0) {
        toast.error('You already have a pending request for this donation');
        return;
      }

      const { error } = await supabase
        .from('food_requests')
        .insert({
          donation_id: donationId,
          requester_id: user.id,
          message: 'I would like to request this food donation.',
        });

      if (error) throw error;
      toast.success('Food request sent successfully!');
      fetchMyRequests();
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      const updateData: any = { status: action };
      
      if (action === 'approved') {
        updateData.accepted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('food_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error updating request:', error);
        }
        throw error;
      }
      
      toast.success(`Request ${action} successfully!`);
      fetchRequests();
      fetchMyRequests();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to update request:', error);
      }
      toast.error(`Failed to ${action} request`);
    }
  };

  if (loading || loadingDonations) {
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
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {isDonorView ? 'Donation Requests' : 'Available Food Donations'}
            </h1>
            <p className="text-muted-foreground">
              {isDonorView 
                ? 'Manage incoming food requests from your community' 
                : 'Browse and request food from generous donors in your community'}
            </p>
          </div>
          {canToggle && (
            <div className="flex items-center gap-2">
              <Label htmlFor="view-toggle" className="text-sm">Receiver</Label>
              <Switch
                id="view-toggle"
                checked={isDonorView}
                onCheckedChange={setIsDonorView}
              />
              <Label htmlFor="view-toggle" className="text-sm">Donor</Label>
            </div>
          )}
        </div>

{isDonorView ? (
          <div className="space-y-4">
            {requests.filter(r => r.status !== 'rejected').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No requests received yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {requests.filter(r => r.status !== 'rejected').map((request) => {
                  const expiryTime = request.accepted_at 
                    ? new Date(new Date(request.accepted_at).getTime() + 10 * 60 * 1000)
                    : null;
                  
                  return (
                  <DonorRequestCard 
                    key={request.id} 
                    request={request} 
                    expiryTime={expiryTime}
                    onAccept={() => handleRequestAction(request.id, 'approved')}
                    onReject={() => handleRequestAction(request.id, 'rejected')}
                  />
                  );
                })}
                </div>
              )}
          </div>
        ) : (
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            </TabsList>
            
            <TabsContent value="map" className="space-y-4">
              <Map donations={donations} />
            </TabsContent>
            
            <TabsContent value="my-requests" className="space-y-4">
              {myRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">You haven't made any requests yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myRequests.map((request) => {
                    const expiryTime = request.accepted_at 
                      ? new Date(new Date(request.accepted_at).getTime() + 10 * 60 * 1000)
                      : null;
                    
                    return (
                      <RequestCard key={request.id} request={request} expiryTime={expiryTime} />
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="list" className="space-y-4">
              {donations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No donations available at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {donations.map((donation) => (
                    <Card key={donation.id} className="flex flex-col">
                      {donation.image_url && (
                        <div className="w-full h-48 overflow-hidden">
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
                          <Badge variant="secondary">{donation.food_type}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {donation.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{donation.quantity} {donation.quantity_unit}</span>
                        </div>
                        {donation.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-yellow-500">{'★'.repeat(donation.rating)}</span>
                            <span className="text-muted-foreground">{'★'.repeat(5 - donation.rating)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{donation.pickup_location}</span>
                        </div>
                        {donation.expiry_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Expires: {new Date(donation.expiry_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          onClick={() => requestFood(donation.id)}
                        >
                          Request Food
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

interface DonorRequestCardProps {
  request: FoodRequest;
  expiryTime: Date | null;
  onAccept: () => void;
  onReject: () => void;
}

function DonorRequestCard({ request, expiryTime, onAccept, onReject }: DonorRequestCardProps) {
  const countdown = useCountdown(expiryTime);
  
  return (
    <Card>
      {request.food_donations.image_url && (
        <div className="w-full h-48 overflow-hidden">
          <img
            src={request.food_donations.image_url}
            alt={request.food_donations.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{request.food_donations.title}</CardTitle>
          <Badge variant={
            request.status === 'approved' ? 'default' :
            request.status === 'rejected' ? 'destructive' :
            'secondary'
          }>
            {request.status}
          </Badge>
        </div>
        <CardDescription>
          Requested by: {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
        </CardDescription>
        {request.profiles && (
          <div className="text-sm text-muted-foreground space-y-1 mt-2">
            {request.profiles.email && <div>Email: {request.profiles.email}</div>}
            {request.profiles.phone_number && <div>Phone: {request.profiles.phone_number}</div>}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{request.message}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{request.food_donations.quantity} {request.food_donations.quantity_unit}</span>
        </div>
        {request.food_donations.rating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-500">{'★'.repeat(request.food_donations.rating)}</span>
            <span className="text-muted-foreground">{'★'.repeat(5 - request.food_donations.rating)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
        </div>
        {request.status === 'approved' && expiryTime && (
          <div className={`flex items-center gap-2 text-sm font-semibold ${
            countdown.expired ? 'text-destructive' : 'text-primary'
          }`}>
            <Clock className="h-4 w-4" />
            {countdown.expired ? (
              <span>Time Expired</span>
            ) : (
              <span>
                Time remaining: {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
              </span>
            )}
          </div>
        )}
      </CardContent>
      {request.status === 'pending' && (
        <CardFooter className="gap-2">
          <Button
            className="flex-1"
            onClick={onAccept}
          >
            <Check className="h-4 w-4 mr-2" />
            Accept
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onReject}
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
