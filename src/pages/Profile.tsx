import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Moon, Sun, Star, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getRatingLabel } from '@/lib/ratingLabels';

interface Review {
  id: string;
  rating: number;
  review: string | null;
  role: 'donor' | 'receiver';
  reviewerName: string;
  created_at: string;
}

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [userProfile, setUserProfile] = useState<{ 
    first_name: string; 
    last_name: string; 
    email: string;
    phone_number?: string;
    user_type: string; 
    avatar_url?: string;
  } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchAverageRating();
      fetchReviews();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number, user_type, avatar_url')
        .eq('id', user.id)
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
    if (!user) return;
    
    try {
      // 1. Get all donations by this user
      const { data: userDonations } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id);

      const donationIds = userDonations?.map(d => d.id) || [];

      // 2. Get ratings where user was the DONOR (receiver rated them)
      const { data: ratingsAsDonor } = await supabase
        .from('food_requests')
        .select('receiver_rating')
        .in('donation_id', donationIds)
        .not('receiver_rating', 'is', null);

      // 3. Get ratings where user was the RECEIVER (donor rated them)
      const { data: ratingsAsReceiver } = await supabase
        .from('food_requests')
        .select('donor_rating')
        .eq('requester_id', user.id)
        .not('donor_rating', 'is', null);

      // Combine all ratings
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

  const fetchReviews = async () => {
    if (!user) return;
    
    try {
      // Get all donations by this user
      const { data: userDonations } = await supabase
        .from('food_donations')
        .select('id')
        .eq('donor_id', user.id);

      const donationIds = userDonations?.map(d => d.id) || [];

      // Get reviews where user was the DONOR (receiver reviewed them)
      const { data: donorReviews } = await supabase
        .from('food_requests')
        .select(`
          id,
          receiver_rating,
          receiver_review,
          created_at,
          requester_id
        `)
        .in('donation_id', donationIds)
        .not('receiver_rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get reviews where user was the RECEIVER (donor reviewed them)
      const { data: receiverReviews } = await supabase
        .from('food_requests')
        .select(`
          id,
          donor_rating,
          donor_review,
          created_at,
          food_donations(donor_id)
        `)
        .eq('requester_id', user.id)
        .not('donor_rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get reviewer names
      const reviewerIds = [
        ...(donorReviews?.map(r => r.requester_id) || []),
        ...(receiverReviews?.map(r => (r.food_donations as any).donor_id) || [])
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', reviewerIds);

      // Format reviews
      const formattedReviews: Review[] = [
        ...(donorReviews?.map(r => {
          const profile = profiles?.find(p => p.id === r.requester_id);
          return {
            id: r.id,
            rating: r.receiver_rating!,
            review: r.receiver_review,
            role: 'receiver' as const,
            reviewerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Anonymous',
            created_at: r.created_at
          };
        }) || []),
        ...(receiverReviews?.map(r => {
          const donorId = (r.food_donations as any).donor_id;
          const profile = profiles?.find(p => p.id === donorId);
          return {
            id: r.id,
            rating: r.donor_rating!,
            review: r.donor_review,
            role: 'donor' as const,
            reviewerName: profile ? `${profile.first_name} ${profile.last_name}` : 'Anonymous',
            created_at: r.created_at
          };
        }) || [])
      ];

      // Sort by date
      formattedReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReviews(formattedReviews.slice(0, 10));
    } catch (error) {
      console.error('Failed to load reviews:', error);
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

      // Delete old avatar if exists
      if (userProfile?.avatar_url) {
        const oldPath = userProfile.avatar_url.split('/').slice(-3).join('/');
        await supabase.storage.from('food-images').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath);

      // Update profile
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
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Update your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage 
                  src={avatarPreview || userProfile?.avatar_url || undefined} 
                  alt="Profile picture"
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  {capitalizeName(userProfile?.first_name)?.[0] || capitalizeName(userProfile?.last_name)?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col items-center gap-2">
                <Label
                  htmlFor="avatar-upload"
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Choose Image
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </Label>
                <p className="text-sm text-muted-foreground">Max size: 5MB</p>
              </div>

              {avatarFile && (
                <Button onClick={handleAvatarUpload} disabled={uploadingAvatar} className="w-full sm:w-auto">
                  {uploadingAvatar ? 'Uploading...' : 'Save Profile Picture'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {reviews.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Reviews Received</CardTitle>
              <CardDescription>Recent reviews from your transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{review.reviewerName}</span>
                      <Badge variant="outline" className="ml-2">
                        {review.role === 'donor' ? 'As Donor' : 'As Receiver'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {getRatingLabel(review.rating)}
                    </span>
                  </div>
                  {review.review && (
                    <p className="text-sm text-muted-foreground italic">"{review.review}"</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Name</Label>
              <p className="text-lg">
                {capitalizeName(userProfile?.first_name)} {capitalizeName(userProfile?.last_name)}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-lg">{userProfile?.email}</p>
            </div>
            {userProfile?.phone_number && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                <p className="text-lg">{userProfile.phone_number}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Type</Label>
              <p className="text-lg capitalize">{userProfile?.user_type}</p>
            </div>
            {averageRating !== null && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Average Rating</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">{averageRating}</span>
                  <span className="text-sm text-muted-foreground">({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="theme-toggle" className="text-base font-medium cursor-pointer">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
