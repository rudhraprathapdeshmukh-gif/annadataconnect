import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import RequestCard from '@/components/RequestCard';
import ChatDialog from '@/components/ChatDialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, MapPin, Package, Check, X, Clock, Phone, Mail, Edit, Trash2, User, Info, Upload, KeyRound, Star } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useCountdown } from '@/hooks/useCountdown';
import { getFreshnessLabel } from '@/lib/freshnessLabels';

interface PublicDonation {
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
  latitude?: number;
  longitude?: number;
  image_url?: string | null;
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
  donor_id: string;
  rating: number | null;
  latitude?: number;
  longitude?: number;
  image_url?: string | null;
  phone_number?: string | null;
  donor_profile?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
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
  food_donations: FoodDonation;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState<PublicDonation[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myDonations, setMyDonations] = useState<FoodDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; user_type: string; avatar_url?: string } | null>(null);
  const [editingDonation, setEditingDonation] = useState<FoodDonation | null>(null);
  const [deletingDonationId, setDeletingDonationId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    quantity: '',
    pickup_location: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchDonations();
    if (user) {
      fetchUserProfile();
      fetchMyDonations();
      fetchRequests();
      fetchMyRequests();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, user_type, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
      }

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load user profile:', error);
      }
    }
  };


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

  // Real-time subscription for food_donations updates
  useEffect(() => {
    if (!user) return;

    const donationsChannel = supabase
      .channel('food_donations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_donations'
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('Real-time donation update:', payload);
          }
          // Refresh all donation lists when any donation changes
          fetchDonations();
          fetchMyDonations();
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
        .select('id, title, description, pickup_location, status, latitude, longitude, quantity, quantity_unit, food_type, created_at, expiry_date, rating, image_url')
        .eq('status', 'available')
        .is('deleted_at', null);

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
        .select('id, title, description, pickup_location, status, latitude, longitude, quantity, quantity_unit, food_type, donor_id, created_at, expiry_date, rating, image_url, phone_number')
        .eq('donor_id', user.id)
        .neq('status', 'claimed')
        .is('deleted_at', null)
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
      // Get all active donation IDs for which the current user is the donor (not claimed, not deleted)
      const { data: myDonationRows, error: myDonationsError } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id)
        .neq('status', 'claimed')
        .is('deleted_at', null);

      if (myDonationsError) throw myDonationsError;

      const myDonationIds = myDonationRows?.map(d => d.id) ?? [];
      if (myDonationIds.length === 0) {
        setRequests([]);
        return;
      }

      // Auto-reject expired approved requests for my donations only
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: expiredRequests } = await supabase
        .from('food_requests')
        .select('id')
        .eq('status', 'approved')
        .lt('accepted_at', tenMinutesAgo)
        .in('donation_id', myDonationIds);
      
      if (expiredRequests && expiredRequests.length > 0) {
        await supabase
          .from('food_requests')
          .update({ status: 'rejected' })
          .in('id', expiredRequests.map(r => r.id));
        
        toast.info(`${expiredRequests.length} expired request(s) automatically rejected`);
      }

      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          food_donations(*),
          profiles(first_name, last_name, email, phone_number)
        `)
        .in('donation_id', myDonationIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load requests:', error);
      }
      // Avoid noisy toasts on initial load; silently fail and keep UI stable
    }
  };

  const fetchMyRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('food_requests')
        .select(`
          *,
          food_donations!inner(
            *,
            donor_profile:profiles!donor_id(first_name, last_name, email, phone_number)
          ),
          profiles(first_name, last_name, email, phone_number)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out requests for claimed or deleted donations and hide completed ones
      const activeRequests = (data || []).filter(request => 
        request.food_donations.status !== 'claimed' && 
        !request.food_donations.deleted_at &&
        request.status !== 'completed'
      );
      
      setMyRequests(activeRequests);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load my requests:', error);
      }
      // Avoid noisy toasts on initial load; silently fail and keep UI stable
    }
  };

  const requestFood = async (donationId: string) => {
    if (!user) return;

    try {
      // Check for existing pending request
      const { data: existingPending } = await supabase
        .from('food_requests')
        .select('id')
        .eq('donation_id', donationId)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      
      if (existingPending && existingPending.length > 0) {
        toast.error('You already have a pending request for this donation');
        return;
      }

      // Check for active approved requests (within timer)
      const { data: activeApproved } = await supabase
        .from('food_requests')
        .select('accepted_at, status')
        .eq('donation_id', donationId)
        .eq('status', 'approved');
      
      if (activeApproved && activeApproved.length > 0) {
        const approvedRequest = activeApproved[0];
        if (approvedRequest.accepted_at) {
          const acceptedTime = new Date(approvedRequest.accepted_at);
          const expiryTime = new Date(acceptedTime.getTime() + 10 * 60 * 1000);
          
          if (new Date() < expiryTime) {
            const remainingMinutes = Math.ceil((expiryTime.getTime() - new Date().getTime()) / (60 * 1000));
            toast.error(`This donation has an active approved request. Try again in ${remainingMinutes} minute(s).`);
            return;
          }
        }
      }

      const { error } = await supabase
        .from('food_requests')
        .insert({
          donation_id: donationId,
          requester_id: user.id,
          message: 'I would like to request this food donation.',
        });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Insert error:', error);
        }
        toast.error((error as any)?.message ?? 'Failed to send request');
        return;
      }
      toast.success('Food request sent successfully!');
      fetchMyRequests();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to send request:', error);
      }
      toast.error(error?.message ?? 'Failed to send request');
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


  const handleEditDonation = (donation: FoodDonation) => {
    setEditingDonation(donation);
    setEditForm({
      title: donation.title,
      description: donation.description,
      quantity: donation.quantity,
      pickup_location: donation.pickup_location,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDonation) return;

    try {
      const { error } = await supabase
        .from('food_donations')
        .update({
          title: editForm.title,
          description: editForm.description,
          quantity: editForm.quantity,
          pickup_location: editForm.pickup_location,
        })
        .eq('id', editingDonation.id);

      if (error) throw error;

      toast.success('Donation updated successfully!');
      setEditingDonation(null);
      fetchMyDonations();
    } catch (error) {
      console.error('Error updating donation:', error);
      toast.error('Failed to update donation');
    }
  };

  const handleDeleteDonation = async () => {
    if (!deletingDonationId) return;

    try {
      // Soft delete: set deleted_at timestamp instead of actually deleting
      const { error } = await supabase
        .from('food_donations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingDonationId);

      if (error) throw error;

      toast.success('Donation deleted successfully!');
      setDeletingDonationId(null);
      fetchMyDonations();
    } catch (error) {
      console.error('Error deleting donation:', error);
      toast.error('Failed to delete donation');
    }
  };

  if (loading || loadingDonations) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-primary/10 to-accent/10">
        <Navbar />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl opacity-40" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-accent/25 to-primary/25 blur-3xl opacity-40" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.15)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
        </div>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-primary/10 to-accent/10">
      <Navbar />
      
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl opacity-40" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-accent/25 to-primary/25 blur-3xl opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.15)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt="Profile picture" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {userProfile?.first_name?.[0]?.toUpperCase() || 'U'}
                    {userProfile?.last_name?.[0]?.toUpperCase() || ''}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {(() => {
                    const firstName = userProfile?.first_name || '';
                    const lastName = userProfile?.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    const displayName = fullName || 'User';
                    return `Welcome, ${displayName}! 👋`;
                  })()}
                </h1>
                <p className="text-muted-foreground">
                  {userProfile?.user_type === 'donor' 
                    ? 'Manage incoming food requests from your community' 
                    : userProfile?.user_type === 'receiver'
                    ? 'Browse and request food from generous donors in your community'
                    : 'Manage donations and browse available food in your community'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {(userProfile?.user_type === 'donor' || userProfile?.user_type === 'both') && (
          <Tabs defaultValue="active-donations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active-donations">Active Donations</TabsTrigger>
              <TabsTrigger value="requests">Requests ({requests.filter(r => r.status !== 'rejected').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active-donations" className="space-y-4">
              {myDonations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No active donations yet</p>
                    <Button onClick={() => navigate('/donate')} className="transition-all hover:scale-105 active:scale-95">Create Your First Donation</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myDonations.map((donation) => (
                    <Card key={donation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1">{donation.title}</CardTitle>
                          <Badge variant={donation.status === 'available' ? 'default' : 'secondary'}>
                            {donation.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {donation.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{donation.quantity} {donation.quantity_unit}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-1">{donation.pickup_location}</span>
                        </div>
                        {donation.expiry_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Expires: {new Date(donation.expiry_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {donation.rating && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">{'★'.repeat(donation.rating)}</span>
                              <span className="text-muted-foreground">{'★'.repeat(5 - donation.rating)}</span>
                            </div>
                            <span className="text-muted-foreground">• {getFreshnessLabel(donation.rating)}</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex pt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => setDeletingDonationId(donation.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        )}

        {(userProfile?.user_type === 'receiver' || userProfile?.user_type === 'both') && (
          <Tabs defaultValue="list" className={userProfile?.user_type === 'both' ? 'space-y-6 mt-8' : 'space-y-6'}>
            <TabsList>
              <TabsTrigger value="list">Available Food</TabsTrigger>
              <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            </TabsList>

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
              {donations.filter(d => user?.id).length === 0 ? (
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
                      <CardContent className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{donation.quantity} {donation.quantity_unit}</span>
                        </div>
                        {donation.rating && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">{'★'.repeat(donation.rating)}</span>
                              <span className="text-muted-foreground">{'★'.repeat(5 - donation.rating)}</span>
                            </div>
                            <span className="text-muted-foreground">• {getFreshnessLabel(donation.rating)}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                                  <Info className="h-4 w-4" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64">
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold">Freshness Scale:</p>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-500">★</span>
                                      <span>Aged</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-500">★★</span>
                                      <span>Poor</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-500">★★★</span>
                                      <span>Okay</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-500">★★★★</span>
                                      <span>Fresh</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-500">★★★★★</span>
                                      <span>Just-Made</span>
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{donation.pickup_location}</span>
                        </div>
                        {donation.expiry_date && (
                          <div className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/10 p-2 rounded">
                            <Calendar className="h-4 w-4" />
                            <span>Expires: {new Date(donation.expiry_date).toLocaleDateString()} at {new Date(donation.expiry_date).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full transition-all hover:scale-105 active:scale-95" 
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

      {/* Edit Donation Dialog */}
      <Dialog open={!!editingDonation} onOpenChange={(open) => !open && setEditingDonation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Donation</DialogTitle>
            <DialogDescription>
              Make changes to your donation details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Food item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Describe the food"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Pickup Location</Label>
              <Input
                id="edit-location"
                value={editForm.pickup_location}
                onChange={(e) => setEditForm({ ...editForm, pickup_location: e.target.value })}
                placeholder="Where to pick up"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDonation(null)} className="transition-all hover:scale-105 active:scale-95">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="transition-all hover:scale-105 active:scale-95">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDonationId} onOpenChange={(open) => !open && setDeletingDonationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide your donation from the active list. You can still view it in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDonation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Show rating dialog if request is completed and donor hasn't rated yet
  useEffect(() => {
    if (request.status === 'completed' && !request.donor_rating) {
      setShowRatingDialog(true);
    }
  }, [request.status, request.donor_rating]);

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      // Fetch the donation OTP
      const { data: donation, error: fetchError } = await supabase
        .from('food_donations')
        .select('otp')
        .eq('id', request.food_donations.id)
        .single();

      if (fetchError) throw fetchError;

      if (donation.otp !== otpValue) {
        toast.error('Invalid OTP. Please check and try again.');
        setIsVerifying(false);
        return;
      }

      // Update request status to completed
      const { error: requestError } = await supabase
        .from('food_requests')
        .update({ status: 'completed' })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Update donation status to completed
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'completed', deleted_at: new Date().toISOString() })
        .eq('id', request.food_donations.id);

      if (donationError) throw donationError;

      toast.success('Pickup confirmed! Thank you for donating.');
      setShowOtpDialog(false);
      setShowRatingDialog(true);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      // Save donor's rating of the receiver
      const { error } = await supabase
        .from('food_requests')
        .update({ donor_rating: rating })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Thank you for your rating!');
      setShowRatingDialog(false);
      window.location.reload();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };
  
  return (
    <>
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
        <CardDescription className="line-clamp-2">
          {request.food_donations.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {request.profiles && (
          <div className="mb-3 p-3 bg-primary/5 rounded-lg space-y-2 border border-primary/20 animate-fade-in">
            <p className="text-sm font-semibold text-primary">Request Details:</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{request.profiles.first_name} {request.profiles.last_name}</span>
              </div>
              {request.profiles.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{request.profiles.email}</span>
                </div>
              )}
              {request.profiles.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{request.profiles.phone_number}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground italic">{request.message}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{request.food_donations.quantity} {request.food_donations.quantity_unit}</span>
        </div>
        {request.food_donations.rating && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">{'★'.repeat(request.food_donations.rating)}</span>
              <span className="text-muted-foreground">{'★'.repeat(5 - request.food_donations.rating)}</span>
            </div>
            <span className="text-muted-foreground">• {getFreshnessLabel(request.food_donations.rating)}</span>
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
              <span>Time Expired - Request auto-rejected</span>
            ) : (
              <span>
                Time remaining: {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
              </span>
            )}
          </div>
        )}
      </CardContent>
      {request.status === 'pending' ? (
        <CardFooter className="flex gap-2">
          <Button 
            variant="default" 
            className="flex-1 transition-all hover:scale-105 active:scale-95" 
            onClick={onAccept}
          >
            <Check className="h-4 w-4 mr-2" />
            Accept
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1 transition-all hover:scale-105 active:scale-95" 
            onClick={onReject}
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </CardFooter>
      ) : request.status === 'approved' && !countdown.expired ? (
        <CardFooter className="flex flex-col gap-2">
          <Button 
            variant="default" 
            className="w-full transition-all hover:scale-105 active:scale-95" 
            onClick={() => setShowOtpDialog(true)}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Verify Pickup OTP
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Enter the OTP provided by the receiver to confirm pickup
          </p>
        </CardFooter>
      ) : null}
    </Card>

    <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Pickup OTP</DialogTitle>
          <DialogDescription>
            Ask the receiver to show their OTP and enter it below to confirm the pickup
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-6">
          <InputOTP
            maxLength={6}
            value={otpValue}
            onChange={setOtpValue}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowOtpDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerifyOtp} 
            disabled={isVerifying || otpValue.length !== 6}
            className="transition-all hover:scale-105 active:scale-95"
          >
            {isVerifying ? 'Verifying...' : 'Verify & Confirm Pickup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showRatingDialog} onOpenChange={(open) => {
      if (!open && rating === 0) {
        toast.error('Please rate before closing');
        return;
      }
      setShowRatingDialog(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate the Receiver</DialogTitle>
          <DialogDescription>
            How was your experience with this receiver?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-2 py-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-all hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-10 w-10 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
            Skip
          </Button>
          <Button onClick={handleSubmitRating} className="transition-all hover:scale-105 active:scale-95">
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
