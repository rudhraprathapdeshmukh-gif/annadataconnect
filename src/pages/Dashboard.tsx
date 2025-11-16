import { useEffect, useState, useRef } from 'react';
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
import { calculateDynamicTimer, calculateExpiryTime } from '@/lib/timerCalculations';
import { shouldBlockUser } from '@/lib/reliabilityScore';

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
  timer_duration: number | null;
  estimated_travel_time: number | null;
  extension_requested_at: string | null;
  extension_granted: boolean;
  no_show: boolean;
  food_donations: FoodDonation;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    reliability_score?: number;
  };
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [donations, setDonations] = useState<PublicDonation[]>([]);
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [donorRequestsAll, setDonorRequestsAll] = useState<FoodRequest[]>([]);
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myRequestsAll, setMyRequestsAll] = useState<FoodRequest[]>([]);
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
  const [pendingRating, setPendingRating] = useState<{
    requestId: string;
    type: 'donor' | 'receiver';
    otherUserName: string;
    donationTitle: string;
  } | null>(null);
  const [globalRating, setGlobalRating] = useState(0);
  const [globalHoverRating, setGlobalHoverRating] = useState(0);
  const [globalReview, setGlobalReview] = useState('');
  const checkedRatingRequests = useRef<Set<string>>(new Set());

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

  // Check for pending ratings after data loads
  useEffect(() => {
    if (user && (donorRequestsAll.length > 0 || myRequestsAll.length > 0)) {
      checkPendingRatings();
    }
  }, [user, donorRequestsAll, myRequestsAll]);

  const getRatingLabel = (rating: number): string => {
    switch(rating) {
      case 5: return "Excellent";
      case 4: return "Good";
      case 3: return "Average";
      case 2: return "Poor";
      case 1: return "Very Poor";
      default: return "Rate";
    }
  };

  const checkPendingRatings = () => {
    // Check if user is a donor with completed unrated requests
    const donorUnrated = donorRequestsAll.find(
      req => req.status === 'completed' && 
             !req.donor_rating && 
             !checkedRatingRequests.current.has(req.id)
    );
    
    if (donorUnrated) {
      checkedRatingRequests.current.add(donorUnrated.id);
      setTimeout(() => {
        setPendingRating({
          requestId: donorUnrated.id,
          type: 'donor',
          otherUserName: `${donorUnrated.profiles.first_name} ${donorUnrated.profiles.last_name}`,
          donationTitle: donorUnrated.food_donations.title
        });
      }, 1000);
      return;
    }

    // Check if user is a receiver with completed unrated requests
    const receiverUnrated = myRequestsAll.find(
      req => req.status === 'completed' && 
             !req.receiver_rating && 
             !checkedRatingRequests.current.has(req.id)
    );
    
    if (receiverUnrated) {
      checkedRatingRequests.current.add(receiverUnrated.id);
      setTimeout(() => {
        setPendingRating({
          requestId: receiverUnrated.id,
          type: 'receiver',
          otherUserName: receiverUnrated.food_donations.donor_profile 
            ? `${receiverUnrated.food_donations.donor_profile.first_name} ${receiverUnrated.food_donations.donor_profile.last_name}`
            : 'the donor',
          donationTitle: receiverUnrated.food_donations.title
        });
      }, 1000);
    }
  };

  const handleGlobalRatingSubmit = async () => {
    if (globalRating === 0 || !pendingRating) {
      toast.error('Please select a rating');
      return;
    }

    try {
      const updateData = pendingRating.type === 'donor'
        ? { donor_rating: globalRating, donor_review: globalReview || null }
        : { receiver_rating: globalRating, receiver_review: globalReview || null };

      const { error } = await supabase
        .from('food_requests')
        .update(updateData)
        .eq('id', pendingRating.requestId);

      if (error) throw error;

      toast.success('Thank you for your rating!');
      setPendingRating(null);
      setGlobalRating(0);
      setGlobalHoverRating(0);
      setGlobalReview('');
      
      // Refresh data
      fetchRequests();
      fetchMyRequests();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };

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
          
          // Show toast when request becomes completed
          if (payload.eventType === 'UPDATE' && 
              payload.new && 
              payload.old && 
              payload.new.status === 'completed' && 
              payload.old.status === 'approved') {
            toast.success('Pickup completed! Please rate your experience.');
          }
          
          // Refresh requests when any change occurs
          fetchRequests();
          fetchMyRequests();
          fetchMyDonations();
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
        .not('status', 'in', '(claimed,completed)')
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
      // 1) Fetch ALL donation IDs for rating checks (no filters)
      const { data: allDonationRows, error: allDonationsError } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id);

      if (allDonationsError) throw allDonationsError;

      const allDonationIds = allDonationRows?.map(d => d.id) ?? [];
      
      // 2) Fetch ALL requests for these donations for rating checks
      if (allDonationIds.length > 0) {
        const { data: allRequests, error: allRequestsError } = await supabase
          .from('food_requests')
          .select(`
            *,
            food_donations(*),
            profiles(first_name, last_name, email, phone_number)
          `)
          .in('donation_id', allDonationIds)
          .order('created_at', { ascending: false });

        if (allRequestsError) throw allRequestsError;
        setDonorRequestsAll(allRequests || []);
      } else {
        setDonorRequestsAll([]);
      }

      // 3) Get all active donation IDs for which the current user is the donor (not claimed, not deleted)
      const { data: myDonationRows, error: myDonationsError } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id)
        .not('status', 'in', '(claimed,completed)')
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
      
      // Filter out requests for completed, claimed, or deleted donations
      const filtered = (data || []).filter(r =>
        r.food_donations.status !== 'completed' &&
        r.food_donations.status !== 'claimed' &&
        !r.food_donations.deleted_at
      );
      setRequests(filtered);
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
          food_donations(
            *,
            donor_profile:profiles!donor_id(first_name, last_name, email, phone_number)
          ),
          profiles(first_name, last_name, email, phone_number)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Keep a full copy for rating checks
      setMyRequestsAll(data || []);
      
      // Filter out requests for claimed or deleted donations and hide completed ones for UI
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
          // Use the stored timer_duration or default to 10 minutes for old requests
          const timerMinutes = (approvedRequest as any).timer_duration || 10;
          const expiryTime = new Date(acceptedTime.getTime() + timerMinutes * 60 * 1000);
          
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
        // Fetch request details with donation and requester profile
        const { data: requestData, error: fetchError } = await supabase
          .from('food_requests')
          .select(`
            *,
            food_donations(latitude, longitude),
            profiles(reliability_score, average_pickup_time)
          `)
          .eq('id', requestId)
          .single();

        if (fetchError) throw fetchError;

        // Calculate dynamic timer
        const donorLat = requestData.food_donations.latitude;
        const donorLon = requestData.food_donations.longitude;
        const reliabilityScore = requestData.profiles.reliability_score || 100;
        const averagePickupTime = requestData.profiles.average_pickup_time;

        const { duration, breakdown } = calculateDynamicTimer(
          donorLat,
          donorLon,
          undefined, // Receiver location not available at approval time
          undefined,
          reliabilityScore,
          averagePickupTime
        );

        updateData.accepted_at = new Date().toISOString();
        updateData.timer_duration = duration;
        updateData.estimated_travel_time = breakdown.travelTime;
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
      
      toast.success(`Request ${action} successfully!${action === 'approved' ? ` Timer: ${updateData.timer_duration} minutes` : ''}`);
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
                    const expiryTime = request.accepted_at && request.timer_duration
                      ? calculateExpiryTime(new Date(request.accepted_at), request.timer_duration)
                      : request.accepted_at 
                        ? new Date(new Date(request.accepted_at).getTime() + 10 * 60 * 1000)
                        : null;
                    
                    return (
                    <DonorRequestCard 
                      key={request.id} 
                      request={request} 
                      expiryTime={expiryTime}
                      onAccept={() => handleRequestAction(request.id, 'approved')}
                      onReject={() => handleRequestAction(request.id, 'rejected')}
                      onRefresh={() => { fetchRequests(); fetchMyDonations(); }}
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
                    const expiryTime = request.accepted_at && request.timer_duration
                      ? calculateExpiryTime(new Date(request.accepted_at), request.timer_duration)
                      : request.accepted_at 
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

      {/* Global Pending Rating Dialog */}
      <Dialog 
        open={!!pendingRating} 
        onOpenChange={(open) => {
          if (!open && globalRating === 0) {
            toast.error('Please rate before closing - this is required to complete the transaction');
            return;
          }
        }}
      >
        <DialogContent
          onInteractOutside={(e) => {
            e.preventDefault();
            toast.error('Please complete your rating to continue');
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            toast.error('Please complete your rating to continue');
          }}
        >
          <DialogHeader>
            <DialogTitle>Rate {pendingRating?.type === 'donor' ? 'the Receiver' : 'the Donor'}</DialogTitle>
            <DialogDescription>
              You need to rate {pendingRating?.otherUserName} for "{pendingRating?.donationTitle}" to complete this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setGlobalRating(star)}
                    onMouseEnter={() => setGlobalHoverRating(star)}
                    onMouseLeave={() => setGlobalHoverRating(0)}
                    className="transition-all hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`h-12 w-12 ${
                        star <= (globalHoverRating || globalRating)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-lg font-medium text-primary">
                {getRatingLabel(globalHoverRating || globalRating)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="globalReview">Review (Optional)</Label>
              <Textarea
                id="globalReview"
                placeholder={`Share your experience with ${pendingRating?.otherUserName}...`}
                value={globalReview}
                onChange={(e) => setGlobalReview(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {globalReview.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleGlobalRatingSubmit} 
              disabled={globalRating === 0} 
              className="transition-all hover:scale-105 active:scale-95"
            >
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DonorRequestCardProps {
  request: FoodRequest;
  expiryTime: Date | null;
  onAccept: () => void;
  onReject: () => void;
  onRefresh: () => void;
}

function DonorRequestCard({ request, expiryTime, onAccept, onReject, onRefresh }: DonorRequestCardProps) {
  const countdown = useCountdown(expiryTime);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [receiverRating, setReceiverRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });

  useEffect(() => {
    if (request.requester_id) {
      loadReceiverRating();
    }
  }, [request.requester_id]);

  const loadReceiverRating = async () => {
    const { fetchUserRating } = await import('@/lib/userRatings');
    const rating = await fetchUserRating(request.requester_id);
    setReceiverRating(rating);
  };

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

      // Donation status update is handled by backend trigger on_request_completed()
      // No manual update needed here

      toast.success('Pickup confirmed! Thank you for donating.');
      setShowOtpDialog(false);
      // Refresh to trigger global rating dialog
      onRefresh();
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
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
              {receiverRating.average && (
                <div className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span>{receiverRating.average} ({receiverRating.count} ratings)</span>
                </div>
              )}
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
              <a 
                href={`/profile/${request.requester_id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1"
              >
                View Full Profile →
              </a>
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
        {request.status === 'completed' && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm font-semibold text-foreground">Mutual Ratings</p>
            <div className="space-y-2">
              {/* Rating you gave (donor rating receiver) */}
              {request.receiver_rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500 fill-blue-500" />
                  <span className="text-sm">
                    You rated them: {request.receiver_rating}/5
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    You haven't rated them yet
                  </span>
                </div>
              )}
            </div>
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
          <div className="flex gap-2 w-full">
            <ChatDialog
              donationId={request.donation_id}
              otherUserId={request.requester_id}
              otherUserName={request.profiles ? `${request.profiles.first_name} ${request.profiles.last_name}` : 'Receiver'}
              donationTitle={request.food_donations.title}
              buttonVariant="outline"
              buttonSize="default"
              buttonText="Chat"
            />
            <Button 
              variant="default" 
              className="flex-1 transition-all hover:scale-105 active:scale-95" 
              onClick={() => setShowOtpDialog(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Verify Pickup OTP
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Enter the OTP provided by the receiver to confirm pickup
          </p>
        </CardFooter>
      ) : request.status === 'completed' ? (
        <CardFooter>
          <ChatDialog
            donationId={request.donation_id}
            otherUserId={request.requester_id}
            otherUserName={request.profiles ? `${request.profiles.first_name} ${request.profiles.last_name}` : 'Receiver'}
            donationTitle={request.food_donations.title}
            buttonVariant="outline"
            buttonSize="default"
            buttonText="View Chat History"
          />
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
    </>
  );
}
