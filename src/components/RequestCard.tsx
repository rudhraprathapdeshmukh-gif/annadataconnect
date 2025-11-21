import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Package, MapPin, Phone, Mail, User, KeyRound, Star, XCircle } from 'lucide-react';
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
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserRating } from '@/lib/userRatings';
import { TimerProgressBar } from './TimerProgressBar';
import { ReliabilityBadge } from './ReliabilityBadge';
import { ExtensionRequestDialog } from './ExtensionRequestDialog';

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
  timer_duration: number | null;
  extension_requested_at: string | null;
  extension_granted: boolean;
  extension_count: number | null;
  food_donations: FoodDonation;
}

interface RequestCardProps {
  request: FoodRequest;
  expiryTime: Date | null;
}

export default function RequestCard({ request, expiryTime }: RequestCardProps) {
  const countdown = useCountdown(expiryTime);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [donorRating, setDonorRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [warningShown, setWarningShown] = useState(false);

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

  const handleWarningThreshold = () => {
    if (!warningShown) {
      setWarningShown(true);
      toast.warning('⏰ Hurry! Less than 10% time remaining', {
        description: 'Consider requesting an extension if you need more time'
      });
    }
  };

  const handleExtensionRequest = async (reason: string) => {
    try {
      // Check if max extensions reached
      const currentExtensionCount = request.extension_count || 0;
      if (currentExtensionCount >= 3) {
        toast.error('Maximum extension limit (3) reached');
        return;
      }

      // Check if already requested and waiting
      if (request.extension_requested_at && !request.extension_granted) {
        toast.info('Extension request already pending');
        return;
      }

      const { error } = await supabase
        .from('food_requests')
        .update({
          extension_requested_at: new Date().toISOString(),
          extension_granted: false, // Reset the granted flag for new request
        })
        .eq('id', request.id);

      if (error) throw error;

      const remainingExtensions = 2 - currentExtensionCount;
      toast.success(`Extension request sent (${remainingExtensions} remaining)`);
      
      // Create notification for donor
      await supabase
        .from('notifications')
        .insert({
          user_id: request.food_donations.donor_id,
          type: 'extension_request',
          title: 'Time Extension Requested',
          message: `Reason: ${reason || 'No reason provided'}. (Extension ${currentExtensionCount + 1}/3)`,
          related_id: request.id,
        });
    } catch (error) {
      console.error('Error requesting extension:', error);
      toast.error('Failed to send extension request');
      throw error;
    }
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
      // The database trigger will automatically update the donation status
      const { error: requestError } = await supabase
        .from('food_requests')
        .update({ status: 'completed' })
        .eq('id', request.id);

      if (requestError) throw requestError;

      toast.success('Pickup confirmed! Please complete the rating to finish.');
    } catch (error) {
      console.error('Error confirming deal:', error);
      toast.error('Failed to confirm deal. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Cancelled request UI
  if (request.status === 'cancelled') {
    return (
      <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-amber-600" />
            <CardTitle className="text-amber-900 dark:text-amber-100">
              Donation Cancelled
            </CardTitle>
          </div>
          <CardDescription className="text-amber-800 dark:text-amber-200">
            We sincerely apologize for the inconvenience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            The donor has cancelled this donation: <strong>{request.food_donations.title}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            This can happen if the food is no longer available or circumstances changed. 
            We appreciate your understanding and encourage you to browse other available donations.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Browse Other Donations
          </Button>
        </CardFooter>
      </Card>
    );
  }

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
        {request.status === 'approved' && expiryTime && request.accepted_at && request.timer_duration && (
          <div className="space-y-2">
            <TimerProgressBar
              key={`timer-${request.id}-${request.timer_duration}`}
              acceptedAt={new Date(request.accepted_at)}
              timerDuration={request.timer_duration}
              onWarningThreshold={handleWarningThreshold}
            />
            {!countdown.expired && !request.extension_requested_at && !request.extension_granted && (request.extension_count || 0) < 3 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowExtensionDialog(true)}
              >
                <Clock className="h-4 w-4 mr-2" />
                Request Extension (+10 min) • {3 - (request.extension_count || 0)} left
              </Button>
            )}
            {request.extension_requested_at && !request.extension_granted && (
              <p className="text-sm text-muted-foreground text-center">
                Extension requested - waiting for donor approval ({3 - (request.extension_count || 0)} remaining)
              </p>
            )}
            {request.extension_granted && (
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 border border-green-500/30 rounded">
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ Extension granted - Timer extended by 10 minutes
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
                  Got it
                </Button>
              </div>
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
            buttonText="Chat"
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
            </div>
          </div>
        </CardFooter>
      )}
      
      <ExtensionRequestDialog
        open={showExtensionDialog}
        onOpenChange={setShowExtensionDialog}
        onSubmit={handleExtensionRequest}
        extensionMinutes={10}
        maxExtensions={3}
        currentExtensions={request.extension_count || 0}
      />
    </Card>
  );
}
