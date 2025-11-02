import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DonorContactCardProps {
  donorId: string;
  requestStatus: string;
}

interface DonorProfile {
  full_name: string;
  email: string;
  phone_number?: string;
}

export default function DonorContactCard({ donorId, requestStatus }: DonorContactCardProps) {
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonorProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email, phone_number')
          .eq('id', donorId)
          .single();

        if (error) throw error;
        setDonorProfile(data);
      } catch (error) {
        console.error('Failed to fetch donor profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (requestStatus === 'approved') {
      fetchDonorProfile();
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

  if (!donorProfile) {
    return null;
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
        {donorProfile.full_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{donorProfile.full_name}</span>
          </div>
        )}
        {donorProfile.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${donorProfile.email}`} className="text-primary hover:underline">
              {donorProfile.email}
            </a>
          </div>
        )}
        {donorProfile.phone_number && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${donorProfile.phone_number}`} className="text-primary hover:underline">
              {donorProfile.phone_number}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
