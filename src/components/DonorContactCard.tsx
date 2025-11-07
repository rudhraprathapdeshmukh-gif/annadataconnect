import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DonorContactCardProps {
  donorId: string;
  requestStatus: string;
  phoneNumber?: string;
}


export default function DonorContactCard({ donorId, requestStatus, phoneNumber }: DonorContactCardProps) {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisplayName = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_display_name', { user_id: donorId });
        if (error) throw error;
        setDisplayName(data as string);
      } catch (error) {
        console.error('Failed to fetch donor name:', error);
      } finally {
        setLoading(false);
      }
    };

    if (requestStatus === 'approved') {
      fetchDisplayName();
    } else {
      setLoading(false);
    }
  }, [donorId, requestStatus]);

  if (requestStatus !== 'approved') {
    return null;
  }

  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Loading contact details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          Donor Contact Information
        </CardTitle>
        <CardDescription>
          Your request has been approved. Contact the donor to arrange pickup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayName && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{displayName}</span>
          </div>
        )}
        {phoneNumber && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${phoneNumber}`} className="text-primary hover:underline">
              {phoneNumber}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
