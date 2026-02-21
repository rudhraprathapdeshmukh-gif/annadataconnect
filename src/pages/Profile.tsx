import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Star, User, Calendar, ArrowLeft, Edit, Save, X, AlertTriangle } from 'lucide-react';
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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id;

  const MAX_EDITS_PER_MONTH = 3;

  const getEditsRemaining = (): number => {
    if (!userProfile) return 0;
    const resetAt = userProfile.profile_edit_reset_at ? new Date(userProfile.profile_edit_reset_at) : new Date();
    const now = new Date();
    const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
    if (monthsSinceReset >= 1) return MAX_EDITS_PER_MONTH;
    return Math.max(0, MAX_EDITS_PER_MONTH - (userProfile.profile_edit_count || 0));
  };

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

  const startEditing = () => {
    if (!userProfile) return;
    setEditFirstName(userProfile.first_name || '');
    setEditLastName(userProfile.last_name || '');
    setEditPhone(userProfile.phone_number || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFirstName('');
    setEditLastName('');
    setEditPhone('');
  };

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;

    // Check if anything actually changed
    const hasChanges = 
      editFirstName.trim() !== (userProfile.first_name || '') ||
      editLastName.trim() !== (userProfile.last_name || '') ||
      editPhone.trim() !== (userProfile.phone_number || '');

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    // Check edit limit
    const remaining = getEditsRemaining();
    if (remaining <= 0) {
      toast.error('You have reached the maximum of 3 profile edits this month. Try again next month.');
      return;
    }

    if (!editFirstName.trim()) {
      toast.error('First name is required');
      return;
    }

    setSavingProfile(true);
    try {
      // Determine if we need to reset the counter (new month)
      const resetAt = userProfile.profile_edit_reset_at ? new Date(userProfile.profile_edit_reset_at) : new Date(0);
      const now = new Date();
      const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
      
      const newEditCount = monthsSinceReset >= 1 ? 1 : (userProfile.profile_edit_count || 0) + 1;
      const newResetAt = monthsSinceReset >= 1 ? now.toISOString() : userProfile.profile_edit_reset_at;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          phone_number: editPhone.trim() || null,
          profile_edit_count: newEditCount,
          profile_edit_reset_at: newResetAt,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile({
        ...userProfile,
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone_number: editPhone.trim() || undefined,
        profile_edit_count: newEditCount,
        profile_edit_reset_at: newResetAt || userProfile.profile_edit_reset_at,
      });
      setIsEditing(false);
      toast.success(`Profile updated! ${MAX_EDITS_PER_MONTH - newEditCount} edit${MAX_EDITS_PER_MONTH - newEditCount !== 1 ? 's' : ''} remaining this month.`);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
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

  const editsRemaining = getEditsRemaining();

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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>Your profile and contact details</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {isOwnProfile && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertTriangle className={`h-3.5 w-3.5 ${editsRemaining <= 1 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <span className={`text-xs ${editsRemaining <= 1 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {editsRemaining} profile edit{editsRemaining !== 1 ? 's' : ''} remaining this month
                    </span>
                  </div>
                )}
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

                {/* Name, Email, Phone */}
                <div className="space-y-3">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">First Name</Label>
                          <Input 
                            value={editFirstName} 
                            onChange={(e) => setEditFirstName(e.target.value)} 
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Last Name</Label>
                          <Input 
                            value={editLastName} 
                            onChange={(e) => setEditLastName(e.target.value)} 
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="font-medium text-muted-foreground">{userProfile?.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Email cannot be changed</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phone</Label>
                        <Input 
                          value={editPhone} 
                          onChange={(e) => setEditPhone(e.target.value)} 
                          placeholder="Phone number"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm" className="gap-1.5">
                          <Save className="h-3.5 w-3.5" />
                          {savingProfile ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={cancelEditing} size="sm" className="gap-1.5">
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
                        <span className="text-sm text-muted-foreground">({totalRatings} ratings)</span>
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