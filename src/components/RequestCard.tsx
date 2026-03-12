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
import { useTranslation } from 'react-i18next';
import { translateStatus, translateUnit } from '@/lib/translateDynamic';
import { getFreshnessLabel } from '@/lib/freshnessLabels';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserRating } from '@/lib/userRatings';
import { TimerProgressBar } from './TimerProgressBar';
import { ReliabilityBadge } from './ReliabilityBadge';
import { ExtensionRequestDialog } from './ExtensionRequestDialog';

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
  diet_type?: string;
  rating: number | null;
  donor_id: string;
  image_url?: string | null;
  phone_number?: string | null;
  pickup_location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  const { t } = useTranslation();
  const countdown = useCountdown(expiryTime);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [otp, setOtp] = useState<string | null>(null);
  const [donorRating, setDonorRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [warningShown, setWarningShown] = useState(false);

  const [donationItems, setDonationItems] = useState<DonationItemInfo[]>([]);

  useEffect(() => {
    fetchDonationItems();
  }, [request.food_donations.id]);

  const fetchDonationItems = async () => {
    const { data } = await supabase
      .from('donation_items')
      .select('id, title, description, quantity, quantity_unit, food_type, diet_type, rating, image_url, expiry_date')
      .eq('donation_id', request.food_donations.id);
    if (data && data.length > 0) {
      setDonationItems(data);
    }
  };

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
              {t('dashboard.cancelled') + ' ' + t('donate.title')}
            </CardTitle>
          </div>
          <CardDescription className="text-amber-800 dark:text-amber-200">
            {t('dashboard.requestCancelled')}
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
            {t('dashboard.availableDonations')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      {/* Image Section */}
      {donationItems.length > 1 ? (
        <div className={`grid gap-0.5 ${
          donationItems.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
        }`}>
          {donationItems.slice(0, 4).map((item, idx) => (
            <div key={item.id} className={`relative overflow-hidden ${
              donationItems.length === 3 && idx === 0 ? 'row-span-2' : ''
            } ${donationItems.length === 2 ? 'aspect-[4/3]' : 'aspect-square'}`}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {donationItems.length > 4 && idx === 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">+{donationItems.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (() => {
        const displayImage = donationItems.length > 0 
          ? donationItems[0].image_url 
          : request.food_donations.image_url;
        return displayImage ? (
          <div className="w-full h-48 overflow-hidden">
            <img src={displayImage} alt={request.food_donations.title} className="w-full h-full object-cover" />
          </div>
        ) : null;
      })()}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">{donationItems.length > 0 ? donationItems.map(i => i.title).join(', ') : request.food_donations.title}</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {donationItems.length === 0 && request.food_donations.diet_type && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                request.food_donations.diet_type === 'veg' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  request.food_donations.diet_type === 'veg' 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`} />
                {request.food_donations.diet_type === 'veg' ? t('donate.dietTypes.veg') : t('donate.dietTypes.nonVeg')}
              </span>
            )}
            <Badge variant={
              request.status === 'approved' ? 'default' :
              request.status === 'rejected' ? 'destructive' :
              'secondary'
            }>
              {translateStatus(t, request.status)}
            </Badge>
          </div>
        </div>
        {donationItems.length === 0 && request.food_donations.description && (
          <CardDescription className="line-clamp-2">
            {request.food_donations.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Individual items for multi-item donations */}
        {donationItems.length > 0 ? (
          <div className="space-y-2">
            {donationItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 bg-muted/40 rounded-lg p-3 border border-border/30">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-sm" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{item.quantity} {translateUnit(t, item.quantity_unit)}</span>
                    <span>•</span>
                    <span>{item.food_type}</span>
                    {item.diet_type && (
                      <>
                        <span>•</span>
                        <span className={`inline-flex items-center gap-1 ${
                          item.diet_type === 'veg' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.diet_type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {item.diet_type === 'veg' ? t('donate.dietTypes.veg') : t('donate.dietTypes.nonVeg')}
                        </span>
                      </>
                    )}
                  </div>
                  {item.expiry_date && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(item.expiry_date).toLocaleDateString()} {new Date(item.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    </div>
                  )}
                </div>
                {item.rating && (
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-yellow-500 text-xs">{'★'.repeat(item.rating)}</span>
                    <span className="text-[10px] text-muted-foreground">{getFreshnessLabel(item.rating)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-sm bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{request.food_donations.quantity} {translateUnit(t, request.food_donations.quantity_unit)}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <Badge variant="secondary" className="text-xs">{request.food_donations.food_type}</Badge>
              {request.food_donations.rating && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-yellow-500 text-xs">{'★'.repeat(request.food_donations.rating)}</span>
                  <span className="text-[10px] text-muted-foreground">{getFreshnessLabel(request.food_donations.rating)}</span>
                </>
              )}
            </div>
          </>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{t('dynamic.requested', { date: new Date(request.created_at).toLocaleDateString() })}</span>
        </div>
        {request.status === 'approved' && request.food_donations.pickup_location && (
          <div className="mt-3 p-3 bg-primary/5 rounded-lg space-y-2 border border-primary/20">
            <p className="text-sm font-semibold text-primary">{t('dashboard.pickupLocation')}:</p>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{request.food_donations.pickup_location}</span>
            </div>
            <a
              href={
                request.food_donations.latitude && request.food_donations.longitude
                  ? `https://www.google.com/maps/dir/?api=1&destination=${request.food_donations.latitude},${request.food_donations.longitude}`
                  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(request.food_donations.pickup_location)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs mt-1"
            >
              <MapPin className="h-3 w-3" />
              {t('chat.openInGoogleMaps')}
            </a>
            {request.food_donations.donor_profile && (
              <div className="space-y-1 text-sm text-muted-foreground border-t border-border/50 pt-2 mt-2">
                <p className="font-medium text-foreground">{t('dynamic.requestDetails')}:</p>
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
                  {t('dynamic.viewFullProfile')}
                </Link>
              </div>
            )}
          </div>
        )}
        {request.status === 'approved' && otp && (
          <div className="mt-3 p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary/30 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <KeyRound className="h-4 w-4" />
              <span>{t('dashboard.yourOTP')}</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tracking-widest text-foreground font-mono bg-background/50 rounded px-4 py-3 border border-border/50">
                {otp}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('dynamic.enterOTPFromReceiver')}
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
                className="w-full text-xs sm:text-sm whitespace-normal h-auto py-2"
                onClick={() => setShowExtensionDialog(true)}
              >
                <Clock className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="truncate">+10 min • {3 - (request.extension_count || 0)} {t('dynamic.remaining', { count: 3 - (request.extension_count || 0) })}</span>
              </Button>
            )}
            {request.extension_requested_at && !request.extension_granted && (
              <p className="text-xs sm:text-sm text-muted-foreground text-center break-words">
                Extension requested • {t('dynamic.extensionsRemaining', { count: 3 - (request.extension_count || 0) })}
              </p>
            )}
            {request.extension_granted && (
              <div className="flex items-center justify-between gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-500/30 rounded overflow-hidden">
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 break-words min-w-0">
                  {t('dynamic.extensionGrantedMsg')}
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
          </div>
        )}
      </CardContent>
      {request.status === 'approved' && user && (
        <CardFooter className="flex gap-2">
          <ChatDialog
            donationId={request.food_donations.id}
            otherUserId={request.food_donations.donor_id}
            otherUserName={request.food_donations.donor_profile
              ? `${request.food_donations.donor_profile.first_name} ${request.food_donations.donor_profile.last_name}`
              : 'Donor'}
            donationTitle={request.food_donations.title}
            buttonVariant="outline"
            buttonText={t('dynamic.chat')}
          />
        </CardFooter>
      )}
      {request.status === 'completed' && (
        <CardFooter>
          <div className="w-full space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm font-semibold text-foreground">{t('dynamic.mutualRatings')}</p>
            <div className="space-y-2">
              {/* Rating you gave (receiver rating donor) */}
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
