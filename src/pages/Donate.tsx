import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, CalendarIcon, Clock, ShieldCheck } from 'lucide-react';
import { format, addYears, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

const phoneSchema = z.string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number" });

const donationSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }).max(100, { message: "Title must be less than 100 characters" }),
  description: z.string().trim().max(500, { message: "Description must be less than 500 characters" }).optional(),
  quantity: z.string().trim().min(1, { message: "Quantity is required" }).max(50, { message: "Quantity must be less than 50 characters" }),
  quantity_unit: z.enum(['kg', 'grams', 'liters', 'pieces', 'servings', 'plates', 'boxes', 'bags'], { message: "Please select a unit" }),
  food_type: z.enum(['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Prepared Food', 'Other'], { message: "Please select a food type" }),
  phone_number: phoneSchema,
  city: z.string().trim().min(1, { message: "City is required" }).max(100, { message: "City name must be less than 100 characters" }),
  area: z.string().trim().min(1, { message: "Area is required" }).max(100, { message: "Area name must be less than 100 characters" }),
  complete_address: z.string().trim().min(1, { message: "Complete address is required" }).max(300, { message: "Address must be less than 300 characters" }),
  expiry_datetime: z.date({
    required_error: "Expiry date and time are required",
  }).refine((date) => {
    const now = new Date();
    const twoYearsFromNow = addYears(now, 2);
    return isAfter(date, now) && isBefore(date, twoYearsFromNow);
  }, { message: "Expiry date must be between now and 2 years from today" }),
  rating: z.number().min(1, { message: "Please rate the food quality" }).max(5),
  image: z.instanceof(File, { message: "Food image is required" }),
  safety_confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm the food is safe to donate",
  }),
});

export default function Donate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    quantity_unit: 'kg',
    food_type: '',
    phone_number: '',
    city: '',
    area: '',
    complete_address: '',
    rating: 0,
  });
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [expiryTime, setExpiryTime] = useState('12:00');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserType = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          setUserType(data.user_type);
          // Redirect receivers to dashboard
          if (data.user_type === 'receiver') {
            toast.error('Only donors can create donations');
            navigate('/dashboard');
          }
        }
      }
    };

    fetchUserType();
  }, [user, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      // Combine date and time into a single Date object
      if (!expiryDate) {
        toast.error('Please select an expiry date');
        setSubmitting(false);
        return;
      }

      const [hours, minutes] = expiryTime.split(':').map(Number);
      const expiryDateTime = new Date(expiryDate);
      expiryDateTime.setHours(hours, minutes, 0, 0);

      // Validate input including image, expiry datetime, and safety confirmation
      const validation = donationSchema.safeParse({ 
        ...formData, 
        image: imageFile,
        expiry_datetime: expiryDateTime,
        safety_confirmed: safetyConfirmed,
      });
      
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        setSubmitting(false);
        return;
      }


      // Upload image to storage
      const fileExt = imageFile!.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(fileName, imageFile!);

      if (uploadError) throw uploadError;

      // Get public URL for the image
      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(fileName);

      // Combine address fields into pickup_location
      const pickupLocation = `${validation.data.complete_address}, ${validation.data.area}, ${validation.data.city}`;

      // Generate 6-digit OTP for pickup verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Insert donation with image URL, coordinates, and OTP
      const { data: donationData, error } = await supabase
        .from('food_donations')
        .insert([{
          donor_id: user.id,
          title: validation.data.title,
          description: validation.data.description || '',
          quantity: validation.data.quantity,
          quantity_unit: validation.data.quantity_unit,
          food_type: validation.data.food_type,
          phone_number: validation.data.phone_number,
          pickup_location: pickupLocation,
          latitude: null,
          longitude: null,
          expiry_date: validation.data.expiry_datetime.toISOString(),
          rating: validation.data.rating,
          image_url: publicUrl,
          otp: otp,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(`Donation created successfully! ID: ${donationData.id.slice(0, 8).toUpperCase()}`);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to create donation');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Donate Food</CardTitle>
            <CardDescription>
              Share your surplus food with those in need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image">Food Image *</Label>
                <div className="flex flex-col gap-4">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <img
                        src={imagePreview}
                        alt="Food preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="image"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload food image</span>
                      <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (Max 5MB)</span>
                    </label>
                  )}
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Fresh vegetables from garden"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about the food..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="quantity"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="e.g., 5"
                      className="flex-1"
                    />
                    <Select
                      value={formData.quantity_unit}
                      onValueChange={(value) => setFormData({ ...formData, quantity_unit: value })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilograms</SelectItem>
                        <SelectItem value="grams">Grams</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                        <SelectItem value="servings">Servings</SelectItem>
                        <SelectItem value="plates">Plates</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                        <SelectItem value="bags">Bags</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="food_type">Food Type *</Label>
                  <Select
                    value={formData.food_type}
                    onValueChange={(value) => setFormData({ ...formData, food_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vegetables">Vegetables</SelectItem>
                      <SelectItem value="Fruits">Fruits</SelectItem>
                      <SelectItem value="Grains">Grains</SelectItem>
                      <SelectItem value="Dairy">Dairy</SelectItem>
                      <SelectItem value="Prepared Food">Prepared Food</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Food Quality Rating (Freshness Scale) *</Label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: star })}
                        className="text-3xl transition-colors hover:scale-110"
                      >
                        <span className={formData.rating >= star ? 'text-yellow-500' : 'text-muted-foreground'}>
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★</span>
                      <span>Aged</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★★</span>
                      <span>Poor</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★★★</span>
                      <span>Okay</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★★★★</span>
                      <span>Fresh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">★★★★★</span>
                      <span>Just-Made</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expiry Date & Time *</Label>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !expiryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const twoYearsFromNow = addYears(today, 2);
                          return date < today || date > twoYearsFromNow;
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      required
                      className="flex-1"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Food expires between now and up to 2 years from today
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Contact Phone Number *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="e.g., 9876543210"
                  maxLength={10}
                />
                <p className="text-sm text-muted-foreground">Enter 10-digit mobile number without country code</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pickup Location *</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Area/Locality *</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g., Andheri West"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complete_address">Complete Address *</Label>
                  <Textarea
                    id="complete_address"
                    required
                    value={formData.complete_address}
                    onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
                    placeholder="Enter house/flat number, building name, street, landmark..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-3 flex-1">
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Safety Check</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        A quick built-in reminder: Food must be fresh, not spoiled, and stored safely.
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="safety-check"
                        checked={safetyConfirmed}
                        onCheckedChange={(checked) => setSafetyConfirmed(checked as boolean)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor="safety-check"
                        className="text-sm font-medium leading-relaxed cursor-pointer"
                      >
                        I confirm this food is safe, fresh, and suitable for donation
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full transition-all hover:scale-105 active:scale-95" 
                disabled={submitting || !safetyConfirmed}
              >
                {submitting ? 'Creating...' : 'Create Donation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
