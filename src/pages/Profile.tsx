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
import { Upload, Star, User, Calendar, ArrowLeft, AlertTriangle } from 'lucide-react';
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
    profile_edit_count?: number;
    profile_edit_reset_at?: string;
  } | null>(null);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [donorDonationCount, setDonorDonationCount] = useState<number>(0);
  const [receivedDonationCount, setReceivedDonationCount] = useState<number>(0);

  const MAX_PHOTO_EDITS_PER_MONTH = 3;

  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id;

  const getPhotoEditsRemaining = (): number => {
    if (!userProfile) return 0;
    const resetAt = userProfile.profile_edit_reset_at ? new Date(userProfile.profile_edit_reset_at) : new Date();
    const now = new Date();
    const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
    if (monthsSinceReset >= 1) return MAX_PHOTO_EDITS_PER_MONTH;
    return Math.max(0, MAX_PHOTO_EDITS_PER_MONTH - (userProfile.profile_edit_count || 0));
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchDonationStats = async () => {
    if (!profileUserId) return;
    try {
      const { data, error } = await supabase.rpc('get_user_donation_stats', { p_user_id: profileUserId });
      if (error) throw error;
      if (data) {
        setDonorDonationCount((data as any).donated_count || 0);
        setReceivedDonationCount((data as any).received_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
    }
  };

  useEffect(() => {
    if (profileUserId) {
      fetchUserProfile();
      fetchAverageRating();
      fetchDonationStats();
    }
  }, [profileUserId, isOwnProfile]);

  const fetchUserProfile = async () => {
    if (!profileUserId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number, user_type, avatar_url, reliability_score, total_pickups, on_time_count, created_at, profile_edit_count, profile_edit_reset_at')
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
      const { data: ratingsAsReceiver } = await supabase
        .from('food_requests')
        .select('donor_rating')
        .eq('requester_id', profileUserId)
        .not('donor_rating', 'is', null)
        .eq('status', 'completed');
      
      const receiverRatings = (ratingsAsReceiver?.map(r => r.donor_rating).filter(Boolean) || []) as number[];
      
      if (receiverRatings.length > 0) {
        const avg = receiverRatings.reduce((sum, r) => sum + r, 0) / receiverRatings.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setTotalRatings(receiverRatings.length);
      } else {
        const { data: userDonations } = await supabase
          .from('food_donations')
          .select('id')
          .eq('donor_id', profileUserId);
        
        const donationIds = userDonations?.map(d => d.id) || [];
        
        if (donationIds.length > 0) {
          const { data: ratingsAsDonor } = await supabase
            .from('food_requests')
            .select('receiver_rating')
            .in('donation_id', donationIds)
            .not('receiver_rating', 'is', null)
            .eq('status', 'completed');
          
          const donorRatings = (ratingsAsDonor?.map(r => r.receiver_rating).filter(Boolean) || []) as number[];
          if (donorRatings.length > 0) {
            const avg = donorRatings.reduce((sum, r) => sum + r, 0) / donorRatings.length;
            setAverageRating(Math.round(avg * 10) / 10);
            setTotalRatings(donorRatings.length);
          } else {
            setAverageRating(null);
            setTotalRatings(0);
          }
        } else {
          setAverageRating(null);
          setTotalRatings(0);
        }
      }
    } catch (error) {
      console.error('Failed to load ratings:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('auth.imageSizeTooLarge'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(t('auth.pleaseUploadImage'));
        return;
      }

      // Check photo edit limit before allowing selection
      const remaining = getPhotoEditsRemaining();
      if (remaining <= 0) {
        toast.error(t('profile.maxPhotoEditsReached'));
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
    if (!avatarFile || !user || !userProfile) return;

    const remaining = getPhotoEditsRemaining();
    if (remaining <= 0) {
      toast.error(t('profile.maxPhotoEditsReached'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
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

      const resetAt = userProfile.profile_edit_reset_at ? new Date(userProfile.profile_edit_reset_at) : new Date(0);
      const now = new Date();
      const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
      const newEditCount = monthsSinceReset >= 1 ? 1 : (userProfile.profile_edit_count || 0) + 1;
      const newResetAt = monthsSinceReset >= 1 ? now.toISOString() : userProfile.profile_edit_reset_at;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          profile_edit_count: newEditCount,
          profile_edit_reset_at: newResetAt,
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setUserProfile({ ...userProfile, avatar_url: publicUrl, profile_edit_count: newEditCount, profile_edit_reset_at: newResetAt || userProfile.profile_edit_reset_at });
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success(t('profile.photoUpdatedRemaining', { count: MAX_PHOTO_EDITS_PER_MONTH - newEditCount }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t('profile.failedUpdateProfile'));
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
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const photoEditsRemaining = getPhotoEditsRemaining();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {!isOwnProfile && (
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        )}
        
        <h1 className="text-3xl font-bold">
          {isOwnProfile ? t('profile.title') : `${userProfile?.first_name}${t('profile.profileOf')}`}
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
                      {userProfile.user_type === 'both' ? t('profile.donorReceiver') : userProfile.user_type === 'donor' ? t('profile.donor') : t('profile.receiver')}
                    </Badge>
                    {userProfile.reliability_score !== undefined && userProfile.reliability_score !== null && (
                      <ReliabilityBadge score={userProfile.reliability_score} showLabel={true} />
                    )}
                  </div>
                  {averageRating && (
                    <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg justify-center">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-lg">{averageRating}</span>
                      <span className="text-sm text-muted-foreground">({totalRatings} {t('profile.ratings')})</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{t('profile.memberSince')}</p>
                      <p className="font-medium">
                        {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center">
                      <User className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {userProfile.user_type === 'receiver' ? t('profile.acceptedDonations') : t('profile.totalDonations')}
                      </p>
                      <p className="font-medium">
                        {userProfile.user_type === 'receiver'
                          ? receivedDonationCount
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('profile.personalInfo')}
                </CardTitle>
                <CardDescription>{t('profile.profileAndContactDetails')}</CardDescription>
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
                    {photoEditsRemaining > 0 ? (
                      <Label htmlFor="avatar-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm">
                        <Upload className="h-4 w-4" />
                        {t('profile.changePhoto')}
                        <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </Label>
                    ) : (
                      <p className="text-sm text-destructive font-medium">{t('profile.photoChangeLimitReached')}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className={`h-3.5 w-3.5 ${photoEditsRemaining <= 1 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <span className={`text-xs ${photoEditsRemaining <= 1 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {t('profile.photoChangesRemaining', { count: photoEditsRemaining })}
                      </span>
                    </div>
                    {avatarFile && (
                      <Button onClick={handleAvatarUpload} disabled={uploadingAvatar} size="sm">
                        {uploadingAvatar ? t('profile.uploading') : t('profile.savePhoto')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Name, Email, Phone - All view-only */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('profile.name')}</Label>
                    <p className="font-medium">{capitalizeName(userProfile?.first_name)} {capitalizeName(userProfile?.last_name)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('profile.emailLabel')}</Label>
                    <p className="font-medium">{userProfile?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">{t('profile.phone')}</Label>
                    <p className="font-medium">{userProfile?.phone_number || t('profile.notProvided')}</p>
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
                  {averageRating && (
                    <div className="pt-3">
                      <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-lg">{averageRating}</span>
                        <span className="text-sm text-muted-foreground">({totalRatings} {t('profile.ratings')})</span>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
