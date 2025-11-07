import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Package } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import DonorContactCard from './DonorContactCard';
import ChatDialog from './ChatDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

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

      // Update donation status to claimed
      const { error: donationError } = await supabase
        .from('food_donations')
        .update({ status: 'claimed' })
        .eq('id', request.food_donations.id);

      if (donationError) throw donationError;

      toast.success('Deal confirmed! The donation is now exclusively yours.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error confirming deal:', error);
      toast.error('Failed to confirm deal. Please try again.');
    } finally {
      setIsConfirming(false);
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
                className="flex-1"
              >
                {isConfirming ? 'Confirming...' : 'Deal Done'}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
      <DonorContactCard 
        donorId={request.food_donations.donor_id} 
        requestStatus={request.status} 
      />
    </>
  );
}
