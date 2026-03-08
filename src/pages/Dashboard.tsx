import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import RequestCard from '@/components/RequestCard';
import ChatDialog from '@/components/ChatDialog';
import { ImpactDashboard } from '@/components/ImpactDashboard';
import HelpChatbot from '@/components/HelpChatbot';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, MapPin, Package, Check, X, Clock, Phone, Mail, Edit, Trash2, User, Info, Upload, KeyRound, Star, Filter, Loader2, MapPinOff, Navigation, Map, TrendingUp, ChevronDown } from 'lucide-react';

import DonationMap from '@/components/DonationMap';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { toast } from 'sonner';
import { useCountdown } from '@/hooks/useCountdown';
import { calculateDynamicTimer, calculateExpiryTime } from '@/lib/timerCalculations';
import { shouldBlockUser } from '@/lib/reliabilityScore';
import { reverseGeocode } from '@/lib/geoUtils';
import { translateStatus, translateFoodType, translateUnit, translateDietType } from '@/lib/translateDynamic';


interface DonationItem {
  id: string;
  title: string;
  description: string | null;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type: string | null;
  rating: number | null;
  image_url: string | null;
}

interface PublicDonation {
  id: string;
  title: string;
  description: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type?: string;
  expiry_date: string;
  pickup_location: string;
  status: string;
  created_at: string;
  rating: number | null;
  latitude?: number;
  longitude?: number;
  image_url?: string | null;
  distance_km?: number;
  items?: DonationItem[];
}

type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

interface FoodDonation {
  id: string;
  title: string;
  description: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type?: string;
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
  items?: DonationItem[];
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
  extension_count: number | null;
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
  const { t } = useTranslation();
  const [donations, setDonations] = useState<PublicDonation[]>([]);
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [donorRequestsAll, setDonorRequestsAll] = useState<FoodRequest[]>([]);
  const [myRequests, setMyRequests] = useState<FoodRequest[]>([]);
  const [myRequestsAll, setMyRequestsAll] = useState<FoodRequest[]>([]);
  const [myDonations, setMyDonations] = useState<FoodDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(true);

  // Safety timeout: force-clear loading after 5 seconds to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingDonations) {
        console.log('Dashboard loading safety timeout triggered');
        setLoadingDonations(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loadingDonations]);
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
    otherUserId: string;
    donationTitle: string;
  } | null>(null);
  const [globalRating, setGlobalRating] = useState(0);
  const [globalHoverRating, setGlobalHoverRating] = useState(0);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const checkedRatingRequests = useRef<Set<string>>(new Set());

  // Location state for nearby filtering
  const [receiverLocation, setReceiverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [showAllDonations, setShowAllDonations] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [showMap, setShowMap] = useState(true);
  const [receiverDistrict, setReceiverDistrict] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Request receiver location on mount
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setReceiverLocation(loc);
        setLocationStatus('granted');
        // Save to profile for nearby notifications
        if (user) {
          // Auto-detect district via reverse geocoding and save to profile
          const district = await reverseGeocode(loc.lat, loc.lng);
          await supabase.from('profiles').update({ latitude: loc.lat, longitude: loc.lng, district: district || null } as any).eq('id', user.id);
          if (district) {
            setReceiverDistrict(district);
          }
        }
      },
      async () => {
        setLocationStatus('denied');
        // Try to get district from profile coords
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('latitude, longitude')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.latitude && profile?.longitude) {
            const district = await reverseGeocode(profile.latitude, profile.longitude);
            if (district) {
              setReceiverDistrict(district);
              // Save district to profile if not already set
              await supabase.from('profiles').update({ district } as any).eq('id', user.id);
            }
          }
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    if (user && (userProfile?.user_type === 'receiver' || userProfile?.user_type === 'both')) {
      requestLocation();
    }
  }, [user, userProfile?.user_type]);

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
      case 5: return t('ratings.excellent');
      case 4: return t('ratings.good');
      case 3: return t('ratings.average');
      case 2: return t('ratings.poor');
      case 1: return t('ratings.veryPoor');
      default: return t('ratings.rate');
    }
  };

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

  const checkPendingRatings = () => {
    // Check if user is a donor with completed unrated requests
    const donorUnrated = donorRequestsAll.find(
      req => req.status === 'completed' && 
             (req.donor_rating === null || req.donor_rating === undefined) && 
             !checkedRatingRequests.current.has(req.id)
    );
    
    if (donorUnrated) {
      checkedRatingRequests.current.add(donorUnrated.id);
      setTimeout(() => {
        setPendingRating({
          requestId: donorUnrated.id,
          type: 'donor',
          otherUserName: `${donorUnrated.profiles.first_name} ${donorUnrated.profiles.last_name}`,
          otherUserId: donorUnrated.requester_id,
          donationTitle: donorUnrated.food_donations.title
        });
      }, 1000);
      return;
    }

    // Check if user is a receiver with completed unrated requests
    const receiverUnrated = myRequestsAll.find(
      req => req.status === 'completed' && 
             (req.receiver_rating === null || req.receiver_rating === undefined) && 
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
          otherUserId: receiverUnrated.food_donations.donor_id,
          donationTitle: receiverUnrated.food_donations.title
        });
      }, 1000);
    }
  };

  // Rating moderation is now handled by the check_donor_low_ratings database trigger

  const handleGlobalRatingSubmit = async () => {
    if (globalRating === 0 || !pendingRating) {
      toast.error('Please select a rating');
      return;
    }

    try {
      const updateData = pendingRating.type === 'donor'
        ? { donor_rating: globalRating }
        : { receiver_rating: globalRating };

      const { error } = await supabase
        .from('food_requests')
        .update(updateData)
        .eq('id', pendingRating.requestId);

      if (error) throw error;

      toast.success('Thank you for your rating!');
      setPendingRating(null);
      setGlobalRating(0);
      setGlobalHoverRating(0);
      
      fetchRequests();
      fetchMyRequests();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };

  const handleReportUser = async () => {
    if (!pendingRating || !user) return;
    setReportSubmitting(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: pendingRating.otherUserId,
          type: 'user_report_warning',
          title: '⚠️ You have been reported',
          message: `A user has reported you regarding the donation "${pendingRating.donationTitle}". Please ensure you follow community guidelines. Repeated reports may lead to account suspension.`,
          related_id: pendingRating.requestId
        });
      if (error) throw error;
      toast.success('Report submitted successfully');
      setShowReportConfirm(false);
    } catch (error) {
      console.error('Error reporting user:', error);
      toast.error('Failed to submit report');
    } finally {
      setReportSubmitting(false);
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

  // Refetch donations when location becomes available
  useEffect(() => {
    if (receiverLocation || locationStatus === 'denied' || locationStatus === 'unavailable') {
      fetchDonations();
    }
  }, [receiverLocation, locationStatus, showAllDonations, searchRadius, receiverDistrict]);

  const fetchDonationItems = async (donationIds: string[]): Promise<Record<string, DonationItem[]>> => {
    if (donationIds.length === 0) return {};
    const { data, error } = await supabase
      .from('donation_items')
      .select('id, donation_id, title, description, quantity, quantity_unit, food_type, diet_type, rating, image_url')
      .in('donation_id', donationIds);
    if (error) {
      console.error('Failed to fetch donation items:', error);
      return {};
    }
    const map: Record<string, DonationItem[]> = {};
    (data || []).forEach((item: any) => {
      if (!map[item.donation_id]) map[item.donation_id] = [];
      map[item.donation_id].push(item);
    });
    return map;
  };

  const fetchDonations = async () => {
    try {
      let rawDonations: PublicDonation[] = [];

      // Use nearby RPC if receiver has location and not showing all
      if (receiverLocation && !showAllDonations) {
        const { data, error } = await supabase.rpc('get_nearby_donations', {
          p_lat: receiverLocation.lat,
          p_lng: receiverLocation.lng,
          p_radius_km: searchRadius,
        });

        if (error) throw error;
        const now = new Date().toISOString();
        rawDonations = (data || []).filter((d: any) => !d.expiry_date || d.expiry_date > now).map((d: any) => ({
          ...d,
          pickup_location: d.masked_location,
          latitude: d.map_latitude ? Number(d.map_latitude) : (d.approx_latitude ? Number(d.approx_latitude) : undefined),
          longitude: d.map_longitude ? Number(d.map_longitude) : (d.approx_longitude ? Number(d.approx_longitude) : undefined),
          distance_km: d.distance_km,
        }));
      } else if (receiverLocation && showAllDonations) {
        const { data, error } = await supabase.rpc('get_nearby_donations', {
          p_lat: receiverLocation.lat,
          p_lng: receiverLocation.lng,
          p_radius_km: 50,
        });

        if (error) throw error;
        const now = new Date().toISOString();
        rawDonations = (data || []).filter((d: any) => !d.expiry_date || d.expiry_date > now).map((d: any) => ({
          ...d,
          pickup_location: d.masked_location,
          latitude: d.map_latitude ? Number(d.map_latitude) : (d.approx_latitude ? Number(d.approx_latitude) : undefined),
          longitude: d.map_longitude ? Number(d.map_longitude) : (d.approx_longitude ? Number(d.approx_longitude) : undefined),
          distance_km: d.distance_km,
        }));
      } else {
        const { data, error } = await supabase.rpc('get_public_donations');

        if (error) throw error;
        const now = new Date().toISOString();
        rawDonations = (data || []).filter((d: any) => !d.expiry_date || d.expiry_date > now).map((d: any) => ({
          ...d,
          pickup_location: d.masked_location,
          latitude: d.approx_latitude ? Number(d.approx_latitude) : undefined,
          longitude: d.approx_longitude ? Number(d.approx_longitude) : undefined,
        }));
      }

      // Fetch items for all donations
      const donationIds = rawDonations.map(d => d.id);
      const itemsMap = await fetchDonationItems(donationIds);
      const donationsWithItems = rawDonations.map(d => ({
        ...d,
        items: itemsMap[d.id] || [],
      }));
      setDonations(donationsWithItems);
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
        .select('id, title, description, pickup_location, status, latitude, longitude, quantity, quantity_unit, food_type, diet_type, donor_id, created_at, expiry_date, rating, image_url, phone_number')
        .eq('donor_id', user.id)
        .not('status', 'eq', 'completed')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch donation items for all donations
      const donationIds = (data || []).map(d => d.id);
      const itemsMap = await fetchDonationItems(donationIds);
      const donationsWithItems = (data || []).map(d => ({
        ...d,
        items: itemsMap[d.id] || [],
      }));
      
      setMyDonations(donationsWithItems as any);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load my donations:', error);
      }
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      // 1) Get ALL donations for this donor (any status)
      const { data: donationRows, error: donationsError } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id);

      if (donationsError) throw donationsError;

      const donationIds = donationRows?.map(d => d.id) ?? [];

      // If donor has no donations, clear state and exit
      if (donationIds.length === 0) {
        setDonorRequestsAll([]);
        setRequests([]);
        return;
      }

      // 2) Fetch ALL requests for these donations (used for ratings + UI)
      const { data: allRequests, error: allRequestsError } = await supabase
        .from('food_requests')
        .select(`
          *,
          food_donations(*),
          profiles(first_name, last_name, email, phone_number)
        `)
        .in('donation_id', donationIds)
        .order('created_at', { ascending: false });

      if (allRequestsError) throw allRequestsError;

      // Keep full copy for rating logic
      setDonorRequestsAll(allRequests || []);

      // 3) Auto-reject expired approved requests (past their timer_duration)
      const { data: approvedRequests } = await supabase
        .from('food_requests')
        .select('id, accepted_at, timer_duration')
        .eq('status', 'approved')
        .in('donation_id', donationIds);

      const now = Date.now();
      const expiredRequestIds = (approvedRequests || [])
        .filter(r => {
          if (!r.accepted_at) return false;
          const timerMs = (r.timer_duration || 30) * 60 * 1000;
          return now > new Date(r.accepted_at).getTime() + timerMs;
        })
        .map(r => r.id);

      if (expiredRequestIds.length > 0) {
        await supabase
          .from('food_requests')
          .update({ status: 'rejected' })
          .in('id', expiredRequestIds);

        toast.info(`${expiredRequestIds.length} expired request(s) automatically rejected`);
      }

      // 4) Derive ACTIVE requests for donor UI
      // - Show: pending + approved
      // - Hide: completed, rejected
      // - Hide: requests whose donation has been soft-deleted
      const activeRequests = (allRequests || []).filter((r: any) =>
        !r.food_donations?.deleted_at &&
        r.status !== 'completed' &&
        r.status !== 'rejected'
      );

      setRequests(activeRequests);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load requests:', error);
      }
      // Silent fail to keep UI stable
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
      // But keep cancelled requests so users see the apology message
      // Also hide approved requests whose timer has expired
      const now = Date.now();
      const activeRequests = (data || []).filter(request => {
        if (request.food_donations.deleted_at) return false;
        if (request.status === 'completed') return false;
        if (request.status === 'rejected') return false;
        
        // Hide approved requests whose timer has expired
        if (request.status === 'approved' && request.accepted_at) {
          const timerMs = (request.timer_duration || 30) * 60 * 1000;
          if (now > new Date(request.accepted_at).getTime() + timerMs) {
            return false;
          }
        }
        
        if (request.status !== 'approved' && request.food_donations.status === 'claimed') return false;
        return true;
      });
      
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
      // Check if receiver already has 2 active requests (pending or approved)
      const { data: activeRequests } = await supabase
        .from('food_requests')
        .select('id')
        .eq('requester_id', user.id)
        .in('status', ['pending', 'approved']);

      if (activeRequests && activeRequests.length >= 2) {
        toast.error('You can only have 2 active food requests at a time. Complete or wait for your current requests first.');
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

      // Check for recently rejected request (10-minute cooldown)
      const { data: recentRejected } = await supabase
        .from('food_requests')
        .select('updated_at')
        .eq('donation_id', donationId)
        .eq('requester_id', user.id)
        .eq('status', 'rejected')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (recentRejected && recentRejected.length > 0) {
        const rejectedAt = new Date(recentRejected[0].updated_at);
        const cooldownEnd = new Date(rejectedAt.getTime() + 10 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          const remainingMinutes = Math.ceil((cooldownEnd.getTime() - new Date().getTime()) / (60 * 1000));
          toast.error(`Your request was rejected. Please wait ${remainingMinutes} minute(s) before requesting again.`);
          return;
        }
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

      // Notification is now handled automatically by database trigger
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
      // Find the request to get donation_id
      const targetRequest = requests.find(r => r.id === requestId);

      if (action === 'approved' && targetRequest) {
        // Guard: check if another request for this donation is already approved
        const alreadyApproved = requests.some(
          r => r.donation_id === targetRequest.donation_id && r.status === 'approved' && r.id !== requestId
        );
        if (alreadyApproved) {
          toast.error('This donation already has an accepted request');
          return;
        }
      }

      const updateData: any = { status: action };
      
      if (action === 'approved') {
        updateData.accepted_at = new Date().toISOString();
        updateData.timer_duration = 30; // Base timer is always 30 minutes
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

      // Auto-reject other pending requests for the same donation
      if (action === 'approved' && targetRequest) {
        const otherPending = requests.filter(
          r => r.donation_id === targetRequest.donation_id && r.status === 'pending' && r.id !== requestId
        );
        
        if (otherPending.length > 0) {
          const otherIds = otherPending.map(r => r.id);
          await supabase
            .from('food_requests')
            .update({ status: 'rejected' })
            .in('id', otherIds);

          // Notification for rejected requesters is handled by DB trigger

          toast.info(`${otherPending.length} other pending request(s) auto-rejected`);
        }
      }

      fetchRequests();
      fetchMyRequests();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to update request:', error);
      }
      toast.error(`Failed to ${action} request`);
    }
  };


  const handleGrantExtension = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const currentExtensionCount = request.extension_count || 0;
      
      if (currentExtensionCount >= 3) {
        toast.error('Maximum extensions (3) already granted');
        return;
      }

      // Update the request to grant extension and increment count
      const { error: updateError } = await supabase
        .from('food_requests')
        .update({ 
          extension_granted: true,
          extension_requested_at: null,
          timer_duration: (request.timer_duration || 30) + 10,
          extension_count: currentExtensionCount + 1
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const remainingExtensions = 2 - currentExtensionCount;
      toast.success(`Extension granted - Timer extended by 10 minutes (${remainingExtensions} extension${remainingExtensions !== 1 ? 's' : ''} remaining)`);
      
      // Notification for receiver is handled by DB trigger
      
      fetchRequests();
    } catch (error) {
      console.error('Error granting extension:', error);
      toast.error('Failed to grant extension');
    }
  };

  const handleRejectExtension = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const currentExtensionCount = request.extension_count || 0;

      // Clear the extension request and increment extension_count to consume one attempt
      const { error: updateError } = await supabase
        .from('food_requests')
        .update({ 
          extension_requested_at: null,
          extension_count: currentExtensionCount + 1
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast.info('Extension request rejected');
      
      // Notification for receiver is handled by DB trigger
      
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting extension:', error);
      toast.error('Failed to reject extension');
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

    // Validate edit form inputs
    const trimmedTitle = editForm.title?.trim();
    const trimmedDescription = editForm.description?.trim();
    const trimmedQuantity = editForm.quantity?.trim();
    const trimmedLocation = editForm.pickup_location?.trim();

    if (!trimmedTitle || trimmedTitle.length > 200) {
      toast.error('Title is required and must be under 200 characters');
      return;
    }
    if (trimmedDescription && trimmedDescription.length > 2000) {
      toast.error('Description must be under 2000 characters');
      return;
    }
    if (!trimmedQuantity || trimmedQuantity.length > 50) {
      toast.error('Quantity is required and must be under 50 characters');
      return;
    }
    if (!trimmedLocation || trimmedLocation.length > 500) {
      toast.error('Pickup location is required and must be under 500 characters');
      return;
    }

    try {
      const { error } = await supabase
        .from('food_donations')
        .update({
          title: trimmedTitle,
          description: trimmedDescription || null,
          quantity: trimmedQuantity,
          pickup_location: trimmedLocation,
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
      const { error } = await supabase.rpc('soft_delete_donation', {
        _donation_id: deletingDonationId
      });

      if (error) throw error;

      toast.success('Donation deleted successfully!');
      setDeletingDonationId(null);
      fetchMyDonations();
    } catch (error: any) {
      console.error('Error deleting donation:', error);
      toast.error(error?.message || 'Failed to delete donation');
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
          <p className="text-center text-muted-foreground">{t('common.loading')}</p>
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
        <div className="mb-8 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                  <AvatarImage src={userProfile?.avatar_url || undefined} alt="Profile picture" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-base sm:text-xl">
                    {userProfile?.first_name?.[0]?.toUpperCase() || 'U'}
                    {userProfile?.last_name?.[0]?.toUpperCase() || ''}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 break-words">
                  {(() => {
                    const firstName = userProfile?.first_name || '';
                    const lastName = userProfile?.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim();
                    const displayName = fullName || 'User';
                    return t('dynamic.welcome', { name: displayName });
                  })()}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground break-words">
                  {userProfile?.user_type === 'donor' 
                    ? t('dashboard.donorSubtitle')
                    : userProfile?.user_type === 'receiver'
                    ? t('dashboard.receiverSubtitle')
                    : t('dashboard.bothSubtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {(userProfile?.user_type === 'donor' || userProfile?.user_type === 'both') && (
          <>
          <Collapsible defaultOpen={false} className="mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-between gap-2 py-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t('dynamic.impactTracker')}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <ImpactDashboard />
            </CollapsibleContent>
          </Collapsible>

          <Tabs defaultValue="active-donations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active-donations">{t('dynamic.activeDonations')}</TabsTrigger>
              <TabsTrigger value="requests">{t('dynamic.requestsCount', { count: requests.length })}</TabsTrigger>
            </TabsList>

            <TabsContent value="active-donations" className="space-y-4">
              {myDonations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">{t('dynamic.noActiveDonationsYet')}</p>
                    <Button onClick={() => navigate('/donate')} className="transition-all hover:scale-105 active:scale-95">{t('dynamic.createYourFirstDonation')}</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myDonations.map((donation) => (
                    <Card key={donation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Image Section with Overlay Badge */}
                      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                        {donation.image_url ? (
                          <img
                            src={donation.image_url}
                            alt={donation.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-16 w-16 text-orange-300 dark:text-orange-700" />
                          </div>
                        )}
                        
                        {/* Diet Type Badge - Top Left */}
                        {donation.diet_type && (
                          <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
                            donation.diet_type === 'veg' 
                              ? 'bg-green-500/90 text-white' 
                              : 'bg-red-500/90 text-white'
                          }`}>
                            {donation.diet_type === 'veg' ? `● ${t('dashboard.veg')}` : `● ${t('dashboard.nonVeg')}`}
                          </span>
                        )}
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-1">{donation.title}</CardTitle>
                          <Badge variant={donation.status === 'available' ? 'default' : 'secondary'}>
                            {translateStatus(t, donation.status)}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {donation.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>{donation.quantity} {translateUnit(t, donation.quantity_unit)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="line-clamp-1">{donation.pickup_location}</span>
                        </div>
                        {donation.expiry_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{t('dynamic.expiresAt', { date: new Date(donation.expiry_date).toLocaleDateString(), time: new Date(donation.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) })}</span>
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
                           {t('common.delete')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              {requests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('dynamic.noRequestsReceivedYet')}</p>
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
                      key={`${request.id}-${request.timer_duration}-${request.extension_count}-${request.extension_granted}`}
                      request={request} 
                      expiryTime={expiryTime}
                      onAccept={() => handleRequestAction(request.id, 'approved')}
                      onReject={() => handleRequestAction(request.id, 'rejected')}
                      onRefresh={() => { fetchRequests(); fetchMyDonations(); }}
                      onGrantExtension={() => handleGrantExtension(request.id)}
                      onRejectExtension={() => handleRejectExtension(request.id)}
                      isAcceptDisabled={requests.some(r => r.donation_id === request.donation_id && r.status === 'approved' && r.id !== request.id)}
                      onRequestCompleted={(requestId, receiverName, donationTitle) => {
                        setPendingRating({
                          requestId,
                          type: 'donor',
                          otherUserName: receiverName,
                          otherUserId: request.requester_id,
                          donationTitle,
                        });
                      }}
                    />
                    );
                  })}
                </div>
              )}
            </TabsContent>

          </Tabs>
          </>
        )}

        {(userProfile?.user_type === 'receiver' || userProfile?.user_type === 'both') && (
          <Tabs defaultValue="list" className={userProfile?.user_type === 'both' ? 'space-y-6 mt-8' : 'space-y-6'}>
            <TabsList>
              <TabsTrigger value="list">{t('dashboard.availableDonations')}</TabsTrigger>
              <TabsTrigger value="my-requests">{t('dashboard.myRequests')}</TabsTrigger>
              
            </TabsList>

            <TabsContent value="my-requests" className="space-y-4">
              {myRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('dynamic.youHaventMadeRequests')}</p>
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
                      <RequestCard 
                        key={`${request.id}-${request.timer_duration}-${request.extension_count}`} 
                        request={request} 
                        expiryTime={expiryTime} 
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="list" className="space-y-4">
              {/* Location Status Banners */}
              {locationStatus === 'loading' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                   <Loader2 className="h-4 w-4 animate-spin" />
                   <span>{t('dynamic.detectingLocation')}</span>
                </div>
              )}
              {locationStatus === 'denied' && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <MapPinOff className="h-4 w-4 shrink-0" />
                    <span>
                      {receiverDistrict 
                        ? t('dynamic.locationDeniedWithDistrict', { district: receiverDistrict })
                        : t('dynamic.locationDeniedGeneral')}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={requestLocation} className="shrink-0">
                    {t('dynamic.retry')}
                  </Button>
                </div>
              )}
              {locationStatus === 'unavailable' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <MapPinOff className="h-4 w-4" />
                  <span>{t('dynamic.locationUnavailable')}</span>
                </div>
              )}

              {/* Unified Control Bar (when location granted) */}
              {locationStatus === 'granted' && !showAllDonations && (
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-primary min-w-0">
                      <Navigation className="h-4 w-4 shrink-0" />
                       <span className="shrink-0">{t('dynamic.showingNearby')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)} className="shrink-0 text-xs gap-1">
                        <Map className="h-3.5 w-3.5" />
                        {showMap ? t('dynamic.hideMap') : t('dynamic.showMap')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAllDonations(true)} className="shrink-0 text-xs">
                        {receiverDistrict ? t('dynamic.showAllInDistrict', { district: receiverDistrict }) : t('dynamic.showAll')}
                      </Button>
                    </div>
                  </div>
                  {/* Radius Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 5, 10, 15, 20].map((radius) => (
                      <button
                        key={radius}
                        onClick={() => setSearchRadius(radius)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          searchRadius === radius
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {radius} km
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showAllDonations && locationStatus === 'granted' && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{receiverDistrict ? t('dynamic.showingDonationsInDistrict', { district: receiverDistrict }) : t('dynamic.showingAllDonations')}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAllDonations(false)} className="shrink-0 text-xs">
                    {t('dynamic.showNearbyOnly')}
                  </Button>
                </div>
              )}

              {/* Map Preview */}
              {showMap && locationStatus === 'granted' && receiverLocation && !showAllDonations && (
                <DonationMap
                  center={receiverLocation}
                  radiusKm={searchRadius}
                  donations={donations.filter(d => d.latitude && d.longitude)}
                />
              )}

              {/* Diet Type Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex gap-1">
                  <button
                    onClick={() => setDietFilter('all')}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      dietFilter === 'all' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                     {t('dashboard.all')}
                  </button>
                  <button
                    onClick={() => setDietFilter('veg')}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                      dietFilter === 'veg' 
                        ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                     {t('dashboard.veg')}
                  </button>
                  <button
                    onClick={() => setDietFilter('non-veg')}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                      dietFilter === 'non-veg' 
                        ? 'bg-red-500/20 text-red-700 dark:text-red-400' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                     {t('dashboard.nonVeg')}
                  </button>
                </div>
              </div>

              {(() => {
                const filteredDonations = donations.filter(d => {
                  if (dietFilter === 'all') return true;
                  return d.diet_type === dietFilter;
                });

                return filteredDonations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {receiverLocation && !showAllDonations
                          ? t('dynamic.noDonationsInRadius', { radius: searchRadius })
                          : showAllDonations && receiverDistrict
                            ? t('dynamic.noDonationsInDistrict', { district: receiverDistrict })
                            : dietFilter === 'all' 
                              ? t('dashboard.noDonationsAvailable')
                              : dietFilter === 'veg' ? t('dashboard.noVegDonations') : t('dashboard.noNonVegDonations')}
                      </p>
                      {receiverLocation && !showAllDonations && (
                        <Button 
                          variant="link" 
                          className="mt-2"
                          onClick={() => setShowAllDonations(true)}
                        >
                          {receiverDistrict ? t('dynamic.showAllInDistrict', { district: receiverDistrict }) : t('dynamic.showAllDonations')}
                        </Button>
                      )}
                      {dietFilter !== 'all' && (
                        <Button 
                          variant="link" 
                          className="mt-2"
                          onClick={() => setDietFilter('all')}
                        >
                          {t('dynamic.viewAllDonations')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDonations.map((donation) => (
                    <Card key={donation.id} className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      {/* Image Section */}
                      <div className="relative w-full overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                        {donation.items && donation.items.length > 1 ? (
                          /* Multi-item: show grid of all item images */
                          <div className={`grid gap-0.5 ${
                            donation.items.length === 2 ? 'grid-cols-2' : 
                            donation.items.length === 3 ? 'grid-cols-2 grid-rows-2' :
                            'grid-cols-2 grid-rows-2'
                          }`}>
                            {donation.items.slice(0, 4).map((item, idx) => (
                              <div key={item.id} className={`relative overflow-hidden ${
                                donation.items!.length === 3 && idx === 0 ? 'row-span-2' : ''
                              } ${donation.items!.length === 2 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Package className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                {donation.items!.length > 4 && idx === 3 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white font-semibold text-lg">+{donation.items!.length - 4}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Single item */
                          <div className="aspect-[4/3]">
                            {(() => {
                              const displayImage = donation.items && donation.items.length > 0 
                                ? donation.items[0].image_url 
                                : donation.image_url;
                              return displayImage ? (
                                <img src={displayImage} alt={donation.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-16 w-16 text-orange-300 dark:text-orange-700" />
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        {/* Multi-item count badge */}
                        {donation.items && donation.items.length > 1 && (
                          <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                            {donation.items.length} items
                          </span>
                        )}
                        
                        {/* Diet Type Badge */}
                        {donation.items && donation.items.length <= 1 && donation.diet_type && (
                          <span className={`absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                            donation.diet_type === 'veg' 
                              ? 'bg-green-500/90 text-white' 
                              : 'bg-red-500/90 text-white'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            {donation.diet_type === 'veg' ? t('dashboard.veg') : t('dashboard.nonVeg')}
                          </span>
                        )}
                        
                        {/* Rating Badge with Info - Top Right */}
                        {donation.rating && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 cursor-help">
                                <span className="text-yellow-500">{'★'.repeat(donation.rating)}</span>
                                <span className="text-muted-foreground">{'★'.repeat(5 - donation.rating)}</span>
                                <Info className="h-3 w-3 text-muted-foreground ml-0.5" />
                              </span>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" align="end" className="w-48 p-3">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold">{t('dynamic.freshness.title')}</p>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div className="flex justify-between"><span>★★★★★</span><span>{t('dynamic.freshness.5')}</span></div>
                                  <div className="flex justify-between"><span>★★★★☆</span><span>{t('dynamic.freshness.4')}</span></div>
                                  <div className="flex justify-between"><span>★★★☆☆</span><span>{t('dynamic.freshness.3')}</span></div>
                                  <div className="flex justify-between"><span>★★☆☆☆</span><span>{t('dynamic.freshness.2')}</span></div>
                                  <div className="flex justify-between"><span>★☆☆☆☆</span><span>{t('dynamic.freshness.1')}</span></div>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      
                      {/* Header Section */}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg line-clamp-1">{donation.title}</CardTitle>
                        {donation.description && (!donation.items || donation.items.length <= 1) && (
                          <CardDescription className="line-clamp-2 text-sm">
                            {donation.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      {/* Content Section */}
                      <CardContent className="flex-1 space-y-3 pt-0">
                        {/* Individual Items List for multi-item donations */}
                        {donation.items && donation.items.length > 1 ? (
                          <div className="space-y-2">
                            {donation.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{item.quantity} {translateUnit(t, item.quantity_unit)}</span>
                                    <span>•</span>
                                    <span>{translateFoodType(t, item.food_type)}</span>
                                    {item.diet_type && (
                                      <>
                                        <span>•</span>
                                        <span className={`inline-flex items-center gap-1 ${
                                          item.diet_type === 'veg' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${item.diet_type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                          {item.diet_type === 'veg' ? t('dashboard.veg') : t('dashboard.nonVeg')}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {item.rating && (
                                  <span className="text-yellow-500 text-xs shrink-0">{'★'.repeat(item.rating)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Single item - show as before */
                          <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{donation.quantity} {translateUnit(t, donation.quantity_unit)}</span>
                            </div>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="secondary" className="text-xs">{translateFoodType(t, donation.food_type)}</Badge>
                          </div>
                        )}
                        
                        {/* Location */}
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{donation.pickup_location}</span>
                        </div>

                        {/* Distance Badge */}
                        {donation.distance_km != null && (
                          <div className="flex items-center gap-2 text-sm text-primary font-medium">
                            <Navigation className="h-4 w-4 shrink-0" />
                            <span>{donation.distance_km < 1 ? t('dynamic.mAway', { distance: Math.round(donation.distance_km * 1000) }) : t('dynamic.kmAway', { distance: donation.distance_km.toFixed(1) })}</span>
                          </div>
                        )}
                        
                        {/* Expiry Date */}
                        {donation.expiry_date && (
                          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                            <Clock className="h-4 w-4 shrink-0" />
                             <span>{t('dynamic.approxExpiry', { date: new Date(donation.expiry_date).toLocaleDateString(), time: new Date(donation.expiry_date).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            }) })}</span>
                          </div>
                        )}
                      </CardContent>
                      
                      {/* Footer with Button */}
                      <CardFooter className="pt-2">
                        <Button 
                          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all" 
                          onClick={() => requestFood(donation.id)}
                        >
                          {t('dynamic.requestFood')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                    </div>
                  );
                })()}
            </TabsContent>

          </Tabs>
        )}
      </div>

      {/* Edit Donation Dialog */}
      <Dialog open={!!editingDonation} onOpenChange={(open) => !open && setEditingDonation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
             <DialogTitle>{t('dynamic.editDonation')}</DialogTitle>
            <DialogDescription>
              {t('dynamic.makeChanges')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <Label htmlFor="edit-title">{t('dashboard.title')}</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder={t('dynamic.foodItemName')}
              />
            </div>
            <div className="space-y-2">
               <Label htmlFor="edit-description">{t('dashboard.description')}</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={t('dynamic.describeFood')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">{t('dashboard.quantity')}</Label>
              <Input
                id="edit-quantity"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
               <Label htmlFor="edit-location">{t('dashboard.pickupLocation')}</Label>
              <Input
                id="edit-location"
                value={editForm.pickup_location}
                onChange={(e) => setEditForm({ ...editForm, pickup_location: e.target.value })}
                placeholder={t('dynamic.whereToPickUp')}
              />
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setEditingDonation(null)} className="transition-all hover:scale-105 active:scale-95">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} className="transition-all hover:scale-105 active:scale-95">
              {t('dashboard.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDonationId} onOpenChange={(open) => !open && setDeletingDonationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
             <AlertDialogTitle>{t('dynamic.areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dynamic.deleteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDonation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Pending Rating Dialog */}
      <Dialog 
        open={!!pendingRating} 
        onOpenChange={(open) => {
          if (!open && globalRating === 0) {
            toast.error(t('dynamic.pleaseRateBeforeClosing'));
            return;
          }
        }}
      >
        <DialogContent
          onInteractOutside={(e) => {
            e.preventDefault();
            toast.error(t('dynamic.pleaseCompleteRating'));
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
             toast.error(t('dynamic.pleaseCompleteRating'));
          }}
        >
          <DialogHeader>
             <DialogTitle>{pendingRating?.type === 'donor' ? t('dynamic.rateReceiver') : t('dynamic.rateDonor')}</DialogTitle>
            <DialogDescription>
              {t('dynamic.rateDescription', { name: pendingRating?.otherUserName, donation: pendingRating?.donationTitle })}
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
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="destructive"
              size="sm"
              onClick={() => setShowReportConfirm(true)}
              className="transition-all hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4 mr-1" />
              Report {pendingRating?.otherUserName}
            </Button>
            <Button 
              onClick={handleGlobalRatingSubmit} 
              disabled={globalRating === 0} 
              className="transition-all hover:scale-105 active:scale-95"
            >
              {t('dynamic.submitRating')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Confirmation Dialog */}
      <AlertDialog open={showReportConfirm} onOpenChange={setShowReportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {pendingRating?.otherUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a warning to {pendingRating?.otherUserName} about their behavior regarding this donation. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReportUser}
              disabled={reportSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reportSubmitting ? 'Reporting...' : 'Yes, Report'}
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
  onRefresh: () => void;
  onGrantExtension: () => void;
  onRejectExtension: () => void;
  isAcceptDisabled?: boolean;
  onRequestCompleted?: (requestId: string, receiverName: string, donationTitle: string) => void;
}

function DonorRequestCard({ request, expiryTime, onAccept, onReject, onRefresh, onGrantExtension, onRejectExtension, isAcceptDisabled, onRequestCompleted }: DonorRequestCardProps) {
  const { t } = useTranslation();
  const countdown = useCountdown(expiryTime);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [receiverRating, setReceiverRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });
  const [extensionReason, setExtensionReason] = useState<string | null>(null);

  useEffect(() => {
    if (request.requester_id) {
      loadReceiverRating();
    }
  }, [request.requester_id]);

  // Fetch extension reason from notifications when extension is requested
  useEffect(() => {
    if (request.extension_requested_at && !request.extension_granted) {
      fetchExtensionReason();
    }
  }, [request.extension_requested_at, request.extension_granted]);

  const fetchExtensionReason = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('message')
        .eq('related_id', request.id)
        .eq('type', 'extension_request')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.message) {
        // Extract reason from "Reason: <reason>. (Extension X/3)"
        const match = data.message.match(/^Reason:\s*(.+?)\.?\s*\(Extension/);
        setExtensionReason(match ? match[1] : data.message);
      }
    } catch (err) {
      // Non-critical, just don't show reason
    }
  };

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
      // Use security definer function to verify OTP and complete the request
      const { error: rpcError } = await supabase.rpc('verify_otp_and_complete', {
        _request_id: request.id,
        _otp_value: otpValue,
      });

      if (rpcError) {
        if (rpcError.message?.includes('Invalid OTP')) {
          toast.error('Invalid OTP. Please check and try again.');
          setIsVerifying(false);
          return;
        }
        throw rpcError;
      }

      toast.success(t('dynamic.pickupConfirmed'));
      setShowOtpDialog(false);
      
      // Send completion emails (non-blocking)
      try {
        await supabase.functions.invoke('send-completion-email', {
          body: { requestId: request.id }
        });
      } catch (emailError) {
        // Don't show error to user - email is not critical
      }
      
      // Directly trigger rating popup for the donor — don't rely on the useEffect chain
      if (onRequestCompleted && request.profiles) {
        const receiverName = `${request.profiles.first_name} ${request.profiles.last_name}`;
        onRequestCompleted(request.id, receiverName, request.food_donations.title);
      }
      
      // Delay refresh to avoid race condition that could clear the rating dialog
      setTimeout(() => onRefresh(), 2000);
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
            {translateStatus(t, request.status)}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {request.food_donations.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {request.profiles && (
          <div className="mb-3 p-3 bg-primary/5 rounded-lg space-y-2 border border-primary/20 animate-fade-in">
            <p className="text-sm font-semibold text-primary">{t('dynamic.requestDetails')}:</p>
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
              {request.status === 'approved' && request.profiles.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{request.profiles.phone_number}</span>
                </div>
              )}
              {request.status === 'approved' && request.profiles.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{request.profiles.email}</span>
                </div>
              )}
              <a 
                href={`/profile/${request.requester_id}`}
                className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1"
              >
                {t('dynamic.viewFullProfile')}
              </a>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground italic">{request.message}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>{request.food_donations.quantity} {translateUnit(t, request.food_donations.quantity_unit)}</span>
        </div>
        {request.food_donations.rating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-500">{'★'.repeat(request.food_donations.rating)}</span>
            <span className="text-muted-foreground">{'★'.repeat(5 - request.food_donations.rating)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{t('dynamic.requested', { date: new Date(request.created_at).toLocaleDateString() })}</span>
        </div>
        {request.status === 'approved' && expiryTime && (
          <div className={`flex items-center gap-2 text-sm font-semibold ${
            countdown.expired ? 'text-destructive' : 'text-primary'
          }`}>
            <Clock className="h-4 w-4" />
            {countdown.expired ? (
              <span>{t('dynamic.timeExpired')}</span>
            ) : (
              <span>{t('dynamic.timeRemaining')} {countdown.days > 0 && `${countdown.days}d `}
                {(countdown.days > 0 || countdown.hours > 0) && `${countdown.hours}h `}
                {countdown.minutes}m {countdown.seconds.toString().padStart(2, '0')}s
              </span>
            )}
          </div>
        )}
        {request.status === 'approved' && request.extension_requested_at && !request.extension_granted && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">{t('dynamic.extensionRequestedPlus10')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {extensionReason ? (
                <span className="block"><span className="font-medium text-foreground">Reason:</span> {extensionReason}</span>
              ) : (
                t('dynamic.receiverNeedsMoreTime')
              )}
              {request.extension_count !== undefined && request.extension_count < 3 && (
                <span className="block mt-1 font-medium">
                  {t('dynamic.extensionsRemaining', { count: 3 - (request.extension_count || 0) })}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={onGrantExtension}>
                <Check className="h-4 w-4 mr-1" />
                {t('dynamic.grantExtension')}
              </Button>
              <Button size="sm" variant="outline" onClick={onRejectExtension}>
                <X className="h-4 w-4 mr-1" />
                {t('dashboard.reject')}
              </Button>
            </div>
          </div>
        )}
        {request.extension_granted && (
          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 border border-green-500/30 rounded">
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('dynamic.extensionGrantedMsg')}
              {request.extension_count !== undefined && request.extension_count < 3 && (
                <span className="ml-2 text-muted-foreground">
                  ({t('dynamic.remaining', { count: 3 - (request.extension_count || 0) })})
                </span>
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase
                  .from('food_requests')
                  .update({ extension_granted: false })
                  .eq('id', request.id);
              }}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
              {t('dynamic.gotIt')}
            </Button>
          </div>
        )}
        {request.status === 'completed' && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm font-semibold text-foreground">{t('dynamic.mutualRatings')}</p>
            <div className="space-y-2">
              {/* Rating you gave (donor rating receiver) */}
              {request.receiver_rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500 fill-blue-500" />
                  <span className="text-sm">
                    {t('dynamic.youRatedThem', { rating: request.receiver_rating })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t('dynamic.youHaventRated')}
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
            disabled={isAcceptDisabled}
            title={isAcceptDisabled ? 'Another request for this donation has already been accepted' : undefined}
          >
            <Check className="h-4 w-4 mr-2" />
            {isAcceptDisabled ? t('dynamic.alreadyAccepted') : t('dynamic.accept')}
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1 transition-all hover:scale-105 active:scale-95" 
            onClick={onReject}
          >
            <X className="h-4 w-4 mr-2" />
             {t('dashboard.reject')}
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
              buttonText={t('dynamic.chat')}
            />
            <Button 
              variant="default" 
              className="flex-1 transition-all hover:scale-105 active:scale-95" 
              onClick={() => setShowOtpDialog(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
               {t('dynamic.verifyPickupOTP')}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {t('dynamic.enterOTPFromReceiver')}
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
            buttonText={t('dynamic.viewChatHistory')}
          />
        </CardFooter>
      ) : null}
    </Card>

    <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
      <DialogContent>
        <DialogHeader>
           <DialogTitle>{t('dynamic.verifyOTPTitle')}</DialogTitle>
          <DialogDescription>
            {t('dynamic.verifyOTPDescription')}
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
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleVerifyOtp} 
            disabled={isVerifying || otpValue.length !== 6}
            className="transition-all hover:scale-105 active:scale-95"
          >
            {isVerifying ? t('dynamic.verifying') : t('dynamic.verifyConfirmPickup')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    
    </>
  );
}
