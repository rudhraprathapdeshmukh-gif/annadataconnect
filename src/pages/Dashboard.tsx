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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, MapPin, Package, Check, X, Clock, Phone, Mail, Edit, Trash2 } from 'lucide-react';
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
  profiles?: {
    full_name: string;
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
  const [userProfile, setUserProfile] = useState<{ full_name: string; user_type: string } | null>(null);
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
        .select('full_name, user_type')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
      
      // Set default view based on user_type
      if (data.user_type === 'donor') {
        setIsDonorView(true);
      } else if (data.user_type === 'receiver') {
        setIsDonorView(false);
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
          // Refresh both lists when any donation changes
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
        .select(`
          id, title, description, pickup_location, status, latitude, longitude, 
          quantity, quantity_unit, food_type, donor_id, created_at, expiry_date, 
          rating, image_url,
          profiles (full_name, email, phone_number)
        `)
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
        .neq('status', 'claimed')
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
      // First, auto-reject expired approved requests
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      // Get expired requests before updating them
      const { data: expiredRequests } = await supabase
        .from('food_requests')
        .select('id')
        .eq('status', 'approved')
        .lt('accepted_at', tenMinutesAgo);
      
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
      const { error } = await supabase
        .from('food_donations')
        .delete()
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome, {userProfile?.full_name || 'User'}! 👋
              </h1>
              <p className="text-muted-foreground">
                {isDonorView 
                  ? 'Manage incoming food requests from your community' 
                  : 'Browse and request food from generous donors in your community'}
              </p>
            </div>
            {userProfile?.user_type === 'both' && (
              <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg">
                <Label htmlFor="view-toggle" className={`text-sm font-medium transition-colors ${!isDonorView ? 'text-primary' : 'text-muted-foreground'}`}>
                  Receiver
                </Label>
                <Switch
                  id="view-toggle"
                  checked={isDonorView}
                  onCheckedChange={setIsDonorView}
                />
                <Label htmlFor="view-toggle" className={`text-sm font-medium transition-colors ${isDonorView ? 'text-primary' : 'text-muted-foreground'}`}>
                  Donor
                </Label>
              </div>
            )}
          </div>
        </div>

        {isDonorView || userProfile?.user_type === 'donor' ? (
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
                    <Button onClick={() => navigate('/donate')}>Create Your First Donation</Button>
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
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-yellow-500">{'★'.repeat(donation.rating)}</span>
                            <span className="text-muted-foreground">{'★'.repeat(5 - donation.rating)}</span>
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
        ) : (
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
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
              {donations.filter(d => d.donor_id !== user?.id).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No donations available at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {donations.filter(d => d.donor_id !== user?.id).map((donation) => (
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
                          <div className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/10 p-2 rounded">
                            <Calendar className="h-4 w-4" />
                            <span>Expires: {new Date(donation.expiry_date).toLocaleDateString()} at {new Date(donation.expiry_date).toLocaleTimeString()}</span>
                          </div>
                        )}
                        
                        {donation.profiles && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Donor Contact:</p>
                            <div className="space-y-1.5">
                              {donation.profiles.full_name && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium">{donation.profiles.full_name}</span>
                                </div>
                              )}
                              {donation.profiles.phone_number && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <a href={`tel:${donation.profiles.phone_number}`} className="text-primary hover:underline">
                                    {donation.profiles.phone_number}
                                  </a>
                                </div>
                              )}
                              {donation.profiles.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <a href={`mailto:${donation.profiles.email}`} className="text-primary hover:underline text-xs">
                                    {donation.profiles.email}
                                  </a>
                                </div>
                              )}
                            </div>
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
            <Button variant="outline" onClick={() => setEditingDonation(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
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
              This action cannot be undone. This will permanently delete your donation and all associated requests.
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
      ) : request.status === 'approved' ? (
        <CardFooter>
          <ChatDialog
            donationId={request.food_donations.id}
            otherUserId={request.requester_id}
            otherUserName={request.profiles?.full_name || request.profiles?.email || 'Receiver'}
            donationTitle={request.food_donations.title}
            buttonVariant="outline"
            buttonText="Message Receiver"
          />
        </CardFooter>
      ) : null}
    </Card>
  );
}
