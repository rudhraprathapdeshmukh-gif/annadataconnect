import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Star, User, Calendar, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ReliabilityBadge } from '@/components/ReliabilityBadge';

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  
  const [userProfile, setUserProfile] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    user_type: string;
    avatar_url?: string;
    reliability_score?: number;
    total_pickups?: number;
    on_time_count?: number;
    created_at?: string;
  } | null>(null);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [donorDonationCount, setDonorDonationCount] = useState<number>(0);

  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchDonorDonationCount = async () => {
    if (!profileUserId) return;
    try {
      const { count } = await supabase
        .from('food_donations')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', profileUserId);
      setDonorDonationCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch donor donation count:', error);
    }
  };

  useEffect(() => {
    if (profileUserId) {
      fetchUserProfile();
      fetchAverageRating();
      fetchDonorDonationCount();
    }
  }, [profileUserId, isOwnProfile]);

  const fetchUserProfile = async () => {
    if (!profileUserId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number, user_type, avatar_url, reliability_score, total_pickups, on_time_count, created_at')
        .eq('id', profileUserId)
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

  const fetchAverageRating = async () => {
    if (!profileUserId) return;
    try {
      const { data: userDonations } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', profileUserId);
      
      const donationIds = userDonations?.map(d => d.id) || [];
      
      const { data: ratingsAsDonor } = await supabase
        .from('food_requests')
        .select('receiver_rating')
        .in('donation_id', donationIds)
        .not('receiver_rating', 'is', null);
      
      const { data: ratingsAsReceiver } = await supabase
        .from('food_requests')
        .select('donor_rating')
        .eq('requester_id', profileUserId)
        .not('donor_rating', 'is', null);
      
      const allRatings: number[] = [
        ...(ratingsAsDonor?.map(r => r.receiver_rating).filter(Boolean) || []),
        ...(ratingsAsReceiver?.map(r => r.donor_rating).filter(Boolean) || [])
      ] as number[];
      
      if (allRatings.length > 0) {
        const avg = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setTotalRatings(allRatings.length);
      } else {
        setAverageRating(null);
        setTotalRatings(0);
      }
    } catch (error) {
      console.error('Failed to load ratings:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      if (userProfile?.avatar_url) {
        const oldPath = userProfile.avatar_url.split('/').slice(-3).join('/');
        await supabase.storage.from('food-images').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, avatarFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setUserProfile({ ...userProfile!, avatar_url: publicUrl });
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const capitalizeName = (name: string | null | undefined): string => {
    if (!name) return '';
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {!isOwnProfile && (
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        
        <h1 className="text-3xl font-bold">
          {isOwnProfile ? 'Profile' : `${userProfile?.first_name}'s Profile`}
        </h1>

        {/* Public Profile View - Show for other users */}
        {!isOwnProfile && userProfile && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={userProfile.avatar_url || undefined} alt="Profile picture" className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                    {capitalizeName(userProfile.first_name)?.[0] || capitalizeName(userProfile.last_name)?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-3 w-full">
                  <h2 className="text-2xl font-bold">
                    {capitalizeName(userProfile.first_name)} {capitalizeName(userProfile.last_name)}
                  </h2>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="secondary">
                      {userProfile.user_type === 'both' ? 'Donor & Receiver' : userProfile.user_type === 'donor' ? 'Donor' : 'Receiver'}
                    </Badge>
                    {userProfile.reliability_score !== undefined && userProfile.reliability_score !== null && (
                      <ReliabilityBadge score={userProfile.reliability_score} showLabel={true} />
                    )}
                  </div>
                  {averageRating && (
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg justify-center">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-lg">{averageRating}</span>
                      <span className="text-sm text-muted-foreground">({totalRatings} ratings)</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Member Since</p>
                      <p className="font-medium">
                        {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <User className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {userProfile.user_type === 'receiver' ? 'Accepted Donations' : 'Total Donations'}
                      </p>
                      <p className="font-medium">
                        {userProfile.user_type === 'receiver'
                          ? (userProfile.total_pickups || 0)
                          : donorDonationCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Own Profile View */}
        {isOwnProfile && (
          <div className="space-y-6">
            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Your profile and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pb-4 border-b">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview || userProfile?.avatar_url || undefined} alt="Profile picture" className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                      {capitalizeName(userProfile?.first_name)?.[0] || capitalizeName(userProfile?.last_name)?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center sm:items-start gap-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm">
                      <Upload className="h-4 w-4" />
                      Change Photo
                      <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </Label>
                    <p className="text-xs text-muted-foreground">Max size: 5MB</p>
                    {avatarFile && (
                      <Button onClick={handleAvatarUpload} disabled={uploadingAvatar} size="sm">
                        {uploadingAvatar ? 'Uploading...' : 'Save Photo'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Name, Email, Phone - View Only */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Name</Label>
                    <p className="font-medium">{capitalizeName(userProfile?.first_name)} {capitalizeName(userProfile?.last_name)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="font-medium">{userProfile?.email}</p>
                  </div>
                <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <p className="font-medium">{userProfile?.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('profile.userType')}</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">
                        {userProfile?.user_type === 'both' 
                          ? t('profile.donorReceiver') 
                          : userProfile?.user_type === 'donor' 
                            ? t('profile.donor') 
                            : t('profile.receiver')}
                      </Badge>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
