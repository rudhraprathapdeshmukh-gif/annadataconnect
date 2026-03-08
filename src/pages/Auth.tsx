import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Eye, EyeOff, Upload, X, Heart } from 'lucide-react';


const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128, { message: "Password too long" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" })
  .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" });

const phoneSchema = z.string()
  .regex(/^\+91[6-9]\d{9}$/, { message: "Enter valid Indian mobile number (e.g., +919876543210)" });

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }),
  password: passwordSchema,
  firstName: z.string().trim().min(1, { message: "First name is required" }).max(50, { message: "First name too long" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }).max(50, { message: "Last name too long" }),
  phoneNumber: phoneSchema,
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email too long" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function Auth() {
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [userType, setUserType] = useState<'donor' | 'receiver'>('donor');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(searchParams.get('mode') === 'reset');
  const [newPassword, setNewPassword] = useState('');

  // Password strength indicators
  const passwordRequirements = [
    { label: t('auth.atLeast8Chars'), met: (password || newPassword).length >= 8 },
    { label: t('auth.oneUppercase'), met: /[A-Z]/.test(password || newPassword) },
    { label: t('auth.oneLowercase'), met: /[a-z]/.test(password || newPassword) },
    { label: t('auth.oneNumber'), met: /[0-9]/.test(password || newPassword) },
    { label: t('auth.oneSpecialChar'), met: /[^A-Za-z0-9]/.test(password || newPassword) },
  ];

  useEffect(() => {
    // Handle password reset from email link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const isRecoveryMode = type === 'recovery' || searchParams.get('mode') === 'reset';
    
    (async () => {
      if (type === 'recovery' && accessToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) {
          toast.error(t('auth.resetLinkExpired'));
          setShowResetPassword(false);
          setShowForgotPassword(true);
          return;
        }

        setShowResetPassword(true);
        // Clear the hash from URL for better UX
        window.history.replaceState(null, '', window.location.pathname + '?mode=reset');
      }
    })();

    // Handle OAuth errors from provider redirects (e.g., blocked Google signup)
    if (!isRecoveryMode) {
      const query = new URLSearchParams(window.location.search);
      const hashParams2 = new URLSearchParams(window.location.hash.substring(1));
      const oauthError = query.get('error_description') || hashParams2.get('error_description');
      const errorType = query.get('error') || hashParams2.get('error');
      
      if (oauthError || errorType) {
        let message = oauthError || errorType;
        
        // Handle access_denied specifically for Google OAuth blocking
        if (errorType === 'access_denied' || message.includes('access_denied') || message.includes('Database error saving new user') || message.includes('database_error')) {
          message = t('auth.googleOnlyExistingAccounts');
        } else if (message.includes('existing accounts') || message.includes('sign up first')) {
          message = t('auth.googleOnlyExistingAccounts');
        }
        
        toast.error(message, { duration: 6000 }); // Longer duration for important message
        
        // Clean the URL to remove error params
        const cleanPath = window.location.pathname + (searchParams.get('mode') ? `?mode=${searchParams.get('mode')}` : '');
        window.history.replaceState(null, '', cleanPath);
      }
    }

    // Check if user signed in with Google and validate they have an account
    if (user && !isRecoveryMode) {
      (async () => {
        // Check if user has a profile in our system
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          // User doesn't have a profile, they're trying to sign in without signing up
          await supabase.auth.signOut();
          toast.error(
            'No account found. Please sign up with email and password first before using Google sign-in.',
            { duration: 6000 }
          );
          return;
        }

        // Profile exists, proceed to dashboard
        navigate('/dashboard');
      })();
    }
  }, [user, navigate, searchParams]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = z.string().email().safeParse(resetEmail);
      if (!validation.success) {
        toast.error('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset link sent! Check your email.');
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user has a valid session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Reset link expired. Please request a new password reset.');
        setShowResetPassword(false);
        setShowForgotPassword(true);
        setLoading(false);
        return;
      }

      const validation = passwordSchema.safeParse(newPassword);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully! Please sign in.');
        setShowResetPassword(false);
        setNewPassword('');
        navigate('/auth');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        let errorMessage = error.message;
        
        if (error.message.includes('existing accounts') || 
            error.message.includes('sign up first') ||
            error.message.includes('access_denied')) {
          errorMessage = 'Google sign-in is only available for existing accounts. Please sign up with email and password first.';
        } else if (error.message.includes('not enabled') || error.message.includes('not configured')) {
          errorMessage = 'Google sign-in is not configured. Please contact the administrator.';
        }
        
        toast.error(errorMessage, { duration: 6000 });
      }
    } catch (error: any) {
      const errorMessage = 
        error?.message?.includes('existing accounts') || 
        error?.message?.includes('sign up first') ||
        error?.message?.includes('access_denied')
          ? 'Google sign-in is only available for existing accounts. Please sign up with email and password first.'
          : 'An error occurred during Google sign-in';
      
      toast.error(errorMessage, { duration: 6000 });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Safety timeout: force-clear loading after 15 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      toast.error('Sign-in is taking too long. Please check your internet connection and try again.');
    }, 15000);

    try {
      // Validate input based on mode
      if (isSignUp) {
        const validationData = { email, password, firstName, lastName, phoneNumber };
        const validation = signUpSchema.safeParse(validationData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast.error(firstError.message);
          clearTimeout(safetyTimeout);
          setLoading(false);
          return;
        }
      } else {
        const validationData = { email, password };
        const validation = signInSchema.safeParse(validationData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast.error(firstError.message);
          clearTimeout(safetyTimeout);
          setLoading(false);
          return;
        }
      }

      if (isSignUp) {
        let avatarUrl: string | undefined = undefined;
        
        // Upload avatar if selected
        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(filePath, avatarFile);

          if (uploadError) {
            toast.error('Failed to upload profile picture');
            clearTimeout(safetyTimeout);
            setLoading(false);
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('food-images')
            .getPublicUrl(filePath);
          
          avatarUrl = publicUrl;
        }

        // Pre-validate: check if email or phone already exists
        const { data: availability, error: checkError } = await supabase
          .rpc('check_signup_availability', { p_email: email, p_phone: phoneNumber });

        if (!checkError && availability) {
          const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
          if (avail.email_taken) {
            toast.error('This email is already registered. Please sign in instead, or use a different email.');
            clearTimeout(safetyTimeout);
            setLoading(false);
            return;
          }
          if (avail.phone_taken) {
            toast.error('This phone number is already linked to another account. Please use a different phone number or sign in with the existing account.');
            clearTimeout(safetyTimeout);
            setLoading(false);
            return;
          }
        }

        const { error } = await signUp(email, password, firstName, lastName, phoneNumber, userType, avatarUrl);
        if (error) {
          const msg = error.message || '';
          if (msg.includes('phone_number') || msg.includes('idx_profiles_phone_number_unique')) {
            toast.error('This phone number is already linked to another account. Please use a different phone number or sign in with the existing account.');
          } else if (msg.includes('profiles_email_key') || (msg.includes('email') && msg.includes('unique'))) {
            toast.error('This email is already registered. Please use a different email or sign in.');
          } else if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already been registered') || msg.includes('already registered')) {
            toast.error('An account with these details already exists. Please sign in instead, or use a different email/phone number.');
          } else if (msg.includes('Database error saving new user') || msg.includes('unexpected_failure')) {
            toast.error('This phone number or email is already in use. Please try signing in, or use different details.');
          } else if (msg.includes('User already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(msg);
          }
        } else {
          // Automatically sign in after successful signup
          toast.success('Account created successfully! Signing you in...');
          const { error: signInError } = await signIn(email, password);
          if (signInError) {
            toast.error('Account created but sign in failed. Please sign in manually.');
            setIsSignUp(false);
          } else {
            toast.success('Welcome to Annadataconnect! 🎉');
            navigate('/dashboard');
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          const msg = error.message || '';
          if (msg.includes('Email not confirmed')) {
            toast.error('Your email is not verified yet. Please check your inbox (and spam folder) for the confirmation link we sent during sign-up.');
          } else if (msg.includes('Invalid login credentials')) {
            toast.error('Incorrect email or password. Please check your credentials and try again.');
          } else {
            toast.error(msg);
          }
        } else {
          toast.success('Signed in successfully!');
          // Explicitly navigate to dashboard after successful login
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient p-4 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 blob" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 blob" style={{ animationDelay: '4s' }} />
      
      <Card className="w-full max-w-md shadow-2xl border-0 animate-fade-in glass-card relative z-10">
        <CardHeader className="space-y-1 text-center pb-8 pt-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-lg glow-effect floating">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">
            {showResetPassword 
              ? t('auth.resetYourPassword')
              : (showForgotPassword 
                ? t('auth.forgotPasswordTitle') 
                : (isSignUp ? t('auth.joinAnnadataconnect') : t('auth.welcomeBackTitle')))
            }
          </CardTitle>
          <CardDescription className="text-base">
            {showResetPassword 
              ? t('auth.enterNewPassword')
              : (showForgotPassword 
                ? t('auth.sendResetLink') 
                : (isSignUp ? t('auth.startSharingCaring') : t('auth.signInToContinue')))
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-8 pb-8">
          {showResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-10 transition-all focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {newPassword && (
                  <div className="space-y-2 mt-3 p-3 rounded-md bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground">Password must contain:</p>
                    <ul className="space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs">
                          <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                            {req.met ? '✓' : '○'}
                          </span>
                          <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl" disabled={loading}>
                {loading ? t('common.loading') : t('auth.resetPassword')}
              </Button>
            </form>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">{t('auth.email')}</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="priya.sharma@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button type="submit" className="w-full transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl" disabled={loading}>
                {loading ? t('common.loading') : t('auth.sendResetLinkBtn')}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-sm hover:opacity-80 transition-opacity"
              >
                {t('auth.backToSignIn')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="avatar">{t('auth.profilePicture')}</Label>
                  <div className="flex items-center gap-4">
                    {avatarPreview ? (
                      <div className="relative">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={removeAvatar}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Max size: 5MB</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Priya"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('auth.phoneNumber')}</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">Format: +91 followed by 10 digits</p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="priya.sharma@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10 transition-all focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {isSignUp && password && (
                <div className="space-y-2 mt-3 p-3 rounded-md bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground">Password must contain:</p>
                  <ul className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs">
                        <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                          {req.met ? '✓' : '○'}
                        </span>
                        <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {isSignUp && (
              <div className="space-y-4">
                <Label>{t('auth.iWantTo')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={userType === 'donor' ? 'default' : 'outline'}
                    onClick={() => setUserType('donor')}
                    className="overflow-hidden"
                  >
                    <span className="truncate">{t('auth.donateFood')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={userType === 'receiver' ? 'default' : 'outline'}
                    onClick={() => setUserType('receiver')}
                    className="overflow-hidden"
                  >
                    <span className="truncate">{t('auth.receiveFood')}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Choose carefully - this cannot be changed later.</p>
              </div>
            )}
            <Button type="submit" className="w-full transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl glow-effect" disabled={loading}>
              {loading ? t('common.loading') : (isSignUp ? t('auth.signUp') : t('auth.signIn'))}
            </Button>
            
            {!isSignUp && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full hover-lift border-2 hover:border-primary/50 transition-all duration-300 transform hover:scale-105"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t('auth.google')}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Only available if you signed up with email first
                </p>
              </>
            )}
          </form>
          )}
          
          {!showForgotPassword && !showResetPassword && (
            <>
              <div className="text-center space-y-2 pt-2">
                <Button
                  variant="link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm font-medium"
                >
                  {isSignUp ? t('auth.alreadyHaveAccount') + ' ' + t('auth.signIn') : t('auth.dontHaveAccount') + ' ' + t('auth.signUp')}
                </Button>
                {!isSignUp && (
                  <div>
                    <Button
                      variant="link"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {t('auth.forgotPassword')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
          
          <p className="text-center text-xs text-muted-foreground pt-4 border-t mt-6">
            By continuing, you agree to our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
