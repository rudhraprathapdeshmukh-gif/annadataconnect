import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';
import { Upload, X } from 'lucide-react';

const donationSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }).max(100, { message: "Title must be less than 100 characters" }),
  description: z.string().trim().max(500, { message: "Description must be less than 500 characters" }).optional(),
  quantity: z.string().trim().min(1, { message: "Quantity is required" }).max(50, { message: "Quantity must be less than 50 characters" }),
  quantity_unit: z.enum(['kg', 'grams', 'liters', 'pieces', 'servings', 'plates', 'boxes', 'bags'], { message: "Please select a unit" }),
  food_type: z.enum(['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Prepared Food', 'Other'], { message: "Please select a food type" }),
  pickup_location: z.string().trim().min(1, { message: "Pickup location is required" }).max(200, { message: "Location must be less than 200 characters" }),
  expiry_date: z.string().optional(),
  rating: z.number().min(1, { message: "Please rate the food quality" }).max(5),
  image: z.instanceof(File, { message: "Food image is required" }),
});

export default function Donate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    quantity_unit: 'kg',
    food_type: '',
    expiry_date: '',
    pickup_location: '',
    rating: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
      // Validate input including image
      const validation = donationSchema.safeParse({ ...formData, image: imageFile });
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

      // Insert donation with image URL
      const { error } = await supabase
        .from('food_donations')
        .insert([{
          donor_id: user.id,
          title: validation.data.title,
          description: validation.data.description || '',
          quantity: validation.data.quantity,
          quantity_unit: validation.data.quantity_unit,
          food_type: validation.data.food_type,
          pickup_location: validation.data.pickup_location,
          expiry_date: validation.data.expiry_date || null,
          rating: validation.data.rating,
          image_url: publicUrl,
        }]);

      if (error) throw error;

      toast.success('Food donation created successfully!');
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
                <Label>Food Quality Rating *</Label>
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
                <p className="text-sm text-muted-foreground">Rate the quality of food (1-5 stars)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup_location">Pickup Location *</Label>
                <Input
                  id="pickup_location"
                  required
                  value={formData.pickup_location}
                  onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                  placeholder="Click on map or enter: latitude, longitude"
                />
                <p className="text-sm text-muted-foreground">Click on the map to select a location</p>
                <div className="mt-2">
                  <Map 
                    editable 
                    onLocationSelect={(location) => setFormData({ ...formData, pickup_location: location })} 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Donation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
