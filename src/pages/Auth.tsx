import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Eye, EyeOff, Upload, X } from 'lucide-react';

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
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [userType, setUserType] = useState<'donor' | 'receiver' | 'both'>('both');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password strength indicators
  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input based on mode
      if (isSignUp) {
        const validationData = { email, password, firstName, lastName, phoneNumber };
        const validation = signUpSchema.safeParse(validationData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast.error(firstError.message);
          setLoading(false);
          return;
        }
      } else {
        const validationData = { email, password };
        const validation = signInSchema.safeParse(validationData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          toast.error(firstError.message);
          setLoading(false);
          return;
        }
      }

      if (isSignUp) {
        let avatarUrl: string | undefined = undefined;
        
        // Upload avatar if selected
        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('food-images')
            .upload(filePath, avatarFile);

          if (uploadError) {
            toast.error('Failed to upload profile picture');
            setLoading(false);
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('food-images')
            .getPublicUrl(filePath);
          
          avatarUrl = publicUrl;
        }

        const { error } = await signUp(email, password, firstName, lastName, phoneNumber, userType, avatarUrl);
        if (error) {
          // Handle specific error cases for duplicate entries
          if (error.message?.includes('duplicate key value violates unique constraint')) {
            if (error.message.includes('profiles_email_key')) {
              toast.error('This email is already registered. Please use a different email or sign in.');
            } else if (error.message.includes('profiles_phone_number_key')) {
              toast.error('This phone number is already registered. Please use a different phone number.');
            } else {
              toast.error('This account information is already registered. Please sign in or use different details.');
            }
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created successfully! Please sign in.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Signed in successfully!');
          // Explicitly navigate to dashboard after successful login
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Annadataconnect</CardTitle>
          <CardDescription>
            {isSignUp ? 'Create an account to get started' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile Picture (Optional)</Label>
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
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Priya"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Format: +91 followed by 10 digits</p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="priya.sharma@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
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
                <Label>I want to be a:</Label>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="donor"
                      checked={userType === 'donor' || userType === 'both'}
                      onCheckedChange={(checked) => {
                        if (checked && userType === 'receiver') setUserType('both');
                        else if (checked) setUserType('donor');
                        else if (userType === 'both') setUserType('receiver');
                        else setUserType('both');
                      }}
                    />
                    <Label htmlFor="donor" className="cursor-pointer">Donor</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="receiver"
                      checked={userType === 'receiver' || userType === 'both'}
                      onCheckedChange={(checked) => {
                        if (checked && userType === 'donor') setUserType('both');
                        else if (checked) setUserType('receiver');
                        else if (userType === 'both') setUserType('donor');
                        else setUserType('both');
                      }}
                    />
                    <Label htmlFor="receiver" className="cursor-pointer">Receiver</Label>
                  </div>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </Button>
          </form>
          
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our terms of service and privacy policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
