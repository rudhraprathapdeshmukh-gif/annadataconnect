import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Package, MapPin, Phone, Mail, User } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import ChatDialog from './ChatDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { getFreshnessLabel } from '@/lib/freshnessLabels';

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

  const handleDealDone = async () => {
    setIsConfirming(true);
    try {
      // Update request status to completed
      const { error: requestError } = await supabase
        .from('food_requests')
        .update({ status: 'completed' })
        .eq('id', request.id);

      if (requestError) throw requestError;

      // Update donation status to claimed and hide from public lists
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'claimed', deleted_at: new Date().toISOString() })
        .eq('id', request.food_donations.id);

      if (donationError) throw donationError;

      toast.success('Deal confirmed! The donation is now exclusively yours.');
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
              </div>
            )}
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
          {!countdown.expired && (
          <Button 
            onClick={handleDealDone} 
            disabled={isConfirming}
            className="flex-1 transition-all hover:scale-105 active:scale-95"
          >
            {isConfirming ? 'Confirming...' : 'Deal Done'}
          </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
