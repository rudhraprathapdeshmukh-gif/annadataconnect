import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Package, MapPin, Phone, Mail, User, KeyRound, Star } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import ChatDialog from './ChatDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { getFreshnessLabel } from '@/lib/freshnessLabels';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { fetchUserRating } from '@/lib/userRatings';

interface FoodDonation {
  id: string;
  title: string;
  description: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  rating: number | null;
  donor_id: string;
  image_url?: string | null;
  phone_number?: string | null;
  pickup_location?: string | null;
  otp?: string | null;
  donor_profile?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
}

interface FoodRequest {
  id: string;
  status: string;
  message: string;
  created_at: string;
  accepted_at: string | null;
  receiver_rating: number | null;
  donor_rating: number | null;
  food_donations: FoodDonation;
}

interface RequestCardProps {
  request: FoodRequest;
  expiryTime: Date | null;
}

export default function RequestCard({ request, expiryTime }: RequestCardProps) {
  const countdown = useCountdown(expiryTime);
  const { user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [donorRating, setDonorRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });

  useEffect(() => {
    if (request.status === 'approved') {
      fetchOtp();
      if (request.food_donations.donor_id) {
        loadDonorRating();
      }
    }
  }, [request.status, request.food_donations.donor_id]);

  const loadDonorRating = async () => {
    const rating = await fetchUserRating(request.food_donations.donor_id);
    setDonorRating(rating);
  };

  const fetchOtp = async () => {
    try {
      const { data, error } = await supabase
        .from('food_donations')
        .select('otp')
        .eq('id', request.food_donations.id)
        .single();

      if (error) throw error;
      setOtp(data.otp);
    } catch (error) {
      console.error('Error fetching OTP:', error);
    }
  };

  const handleDealDone = async () => {
    setIsConfirming(true);
    try {
      // Update request status to completed
      const { error: requestError } = await supabase
        .from('food_requests')
        .update({ status: 'completed' })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Update donation status to completed and hide from public lists
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'completed', deleted_at: new Date().toISOString() })
        .eq('id', request.food_donations.id);

      if (donationError) throw donationError;

      toast.success('Pickup confirmed! Please complete the rating to finish.');
    } catch (error) {
      console.error('Error confirming deal:', error);
      toast.error('Failed to confirm deal. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

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
        <CardDescription className="line-clamp-2">
          {request.food_donations.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
        {request.status === 'approved' && request.food_donations.pickup_location && (
          <div className="mt-3 p-3 bg-primary/5 rounded-lg space-y-2 border border-primary/20">
            <p className="text-sm font-semibold text-primary">Pickup Details:</p>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{request.food_donations.pickup_location}</span>
            </div>
            {request.food_donations.donor_profile && (
              <div className="space-y-1 text-sm text-muted-foreground border-t border-border/50 pt-2 mt-2">
                <p className="font-medium text-foreground">Donor Contact:</p>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  <span>{request.food_donations.donor_profile.first_name} {request.food_donations.donor_profile.last_name}</span>
                </div>
                {donorRating.average && (
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span>{donorRating.average} ({donorRating.count} ratings)</span>
                  </div>
                )}
                {request.food_donations.donor_profile.phone_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{request.food_donations.donor_profile.phone_number}</span>
                  </div>
                )}
                {request.food_donations.donor_profile.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{request.food_donations.donor_profile.email}</span>
                  </div>
                )}
                <Link 
                  to={`/profile/${request.food_donations.donor_id}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs mt-1"
                >
                  View Full Profile →
                </Link>
              </div>
            )}
          </div>
        )}
        {request.status === 'approved' && otp && (
          <div className="mt-3 p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <KeyRound className="h-4 w-4" />
              <span>Your Pickup OTP</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tracking-widest text-foreground font-mono bg-background/50 rounded px-4 py-3 border border-border/50">
                {otp}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Show this code to the donor during pickup
              </p>
            </div>
          </div>
        )}
        {request.status === 'approved' && expiryTime && (
          <div className={`flex items-center gap-2 text-sm font-semibold ${
            countdown.expired ? 'text-destructive' : 'text-primary'
          }`}>
            <Clock className="h-4 w-4" />
            {countdown.expired ? (
              <span>Time Expired - Request will be auto-rejected</span>
            ) : (
              <span>
                Time remaining: {countdown.minutes}:{countdown.seconds.toString().padStart(2, '0')}
              </span>
            )}
          </div>
        )}
      </CardContent>
      {request.status === 'approved' && user && (
        <CardFooter className="flex gap-2">
          <ChatDialog
            donationId={request.food_donations.id}
            otherUserId={request.food_donations.donor_id}
            otherUserName="Donor"
            donationTitle={request.food_donations.title}
            buttonVariant="outline"
            buttonText="Message Donor"
          />
        </CardFooter>
      )}
      {request.status === 'completed' && (
        <CardFooter>
          <div className="w-full space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm font-semibold text-foreground">Mutual Ratings</p>
            <div className="space-y-2">
              {/* Rating you gave (receiver rating donor) */}
              {request.receiver_rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500 fill-blue-500" />
                  <span className="text-sm">
                    You rated donor: {request.receiver_rating}/5
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    You haven't rated the donor yet
                  </span>
                </div>
              )}
              
              {/* Rating you received (donor rated receiver) */}
              {request.donor_rating ? (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm">
                    Donor rated you: {request.donor_rating}/5
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Waiting for donor's rating
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
