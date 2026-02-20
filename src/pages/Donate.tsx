import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { addYears, isAfter, isBefore } from 'date-fns';

import { DonateStepIndicator } from '@/components/DonateStepIndicator';
import { DonateFormStep1 } from '@/components/DonateFormStep1';
import { DonateFormStep2 } from '@/components/DonateFormStep2';

const phoneSchema = z.string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number" });

const donationSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }).max(100, { message: "Title must be less than 100 characters" }),
  description: z.string().trim().max(500, { message: "Description must be less than 500 characters" }).optional(),
  quantity: z.string().trim().min(1, { message: "Quantity is required" }).max(50, { message: "Quantity must be less than 50 characters" }),
  quantity_unit: z.enum(['kg', 'grams', 'liters', 'pieces', 'servings'], { message: "Please select a unit" }),
  food_type: z.enum(['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Prepared Food', 'Other'], { message: "Please select a food type" }),
  diet_type: z.enum(['veg', 'non-veg'], { message: "Please select diet type" }),
  phone_number: phoneSchema,
  city: z.string().optional(),
  area: z.string().optional(),
  complete_address: z.string().optional(),
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
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    quantity_unit: 'kg',
    food_type: '',
    diet_type: 'veg',
    phone_number: '',
    city: '',
    area: '',
    complete_address: '',
    rating: 0,
  });
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [hour12, setHour12] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('PM');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const locationAutoTriggered = useRef(false);

  const isPreparedFood = formData.food_type === 'Prepared Food';

  const convertTo24Hour = (hour12: string, minute: string, ampm: string): [number, number] => {
    let hours = parseInt(hour12);
    if (ampm === 'AM' && hours === 12) hours = 0;
    if (ampm === 'PM' && hours !== 12) hours += 12;
    return [hours, parseInt(minute)];
  };

  // Auto-trigger location detection when step 2 loads
  useEffect(() => {
    if (currentStep === 2 && !coordinates && !locationAutoTriggered.current) {
      locationAutoTriggered.current = true;
      handleUseCurrentLocation();
    }
  }, [currentStep]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      const addr = data.address;
      
      const cleanComponent = (value?: string) => {
        if (!value) return '';
        return value.replace(/\bmandal\b/gi, '').trim();
      };
      
      const rawCity = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const city = cleanComponent(rawCity);
      
      const areaComponentsRaw = [
        addr.locality, addr.suburb, addr.neighbourhood,
        addr.quarter, addr.hamlet, addr.city_district,
      ];
      
      const areaComponents = areaComponentsRaw
        .map(cleanComponent)
        .filter((val, idx, arr) => val && arr.indexOf(val) === idx);
      
      const area = areaComponents.length > 0 ? areaComponents.join(', ') : city;
      
      const addressParts = [
        addr.house_number, addr.road, addr.suburb || addr.neighbourhood,
        addr.village || addr.town || addr.city, addr.state_district || addr.county,
        addr.state, addr.country, addr.postcode
      ].filter(Boolean);
      
      const completeAddress = addressParts.join(', ');
      
      return { city, area, completeAddress };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoordinates({ lat, lng });
          
          const address = await reverseGeocode(lat, lng);
          
          setFormData(prev => ({
            ...prev,
            city: address.city,
            area: address.area,
            complete_address: address.completeAddress,
          }));
            
          toast.success('Location detected successfully!');
        } catch (error) {
          toast.error('Failed to get address from location');
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please enable location access.');
        } else {
          toast.error('Failed to get your location');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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
          if (data.user_type === 'receiver') {
            toast.error('Only donors can create donations');
            navigate('/dashboard');
          }
        }
      }
    };

    fetchUserType();
  }, [user, navigate]);

  useEffect(() => {
    if (formData.food_type === 'Prepared Food') {
      setExpiryDate(new Date());
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);
      futureTime.setMinutes(futureTime.getMinutes() + 15);
      
      const hours = futureTime.getHours();
      const mins = futureTime.getMinutes();
      
      const hour12Val = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      setHour12(String(hour12Val));
      setMinute(String(Math.floor(mins / 15) * 15).padStart(2, '0'));
      setAmpm(hours >= 12 ? 'PM' : 'AM');
    }
  }, [formData.food_type]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
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
      let expiryDateTime: Date;

      if (isPreparedFood) {
        const dateToUse = expiryDate || new Date();
        const [hours24, mins] = convertTo24Hour(hour12, minute, ampm);
        expiryDateTime = new Date(
          dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(),
          hours24, mins, 0, 0
        );
        
        const now = new Date();
        const minAllowedTime = new Date(now.getTime() + 5 * 60 * 1000);
        
        if (expiryDateTime < minAllowedTime) {
          toast.error('Pickup time must be at least 5 minutes in the future.');
          setSubmitting(false);
          return;
        }
      } else {
        if (!expiryDate) {
          toast.error('Please select an expiry date');
          setSubmitting(false);
          return;
        }

        const [hours24, mins] = convertTo24Hour(hour12, minute, ampm);
        expiryDateTime = new Date(
          expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate(),
          hours24, mins, 0, 0
        );
      }

      if (!coordinates) {
        toast.error('Please detect your current location before submitting');
        setSubmitting(false);
        return;
      }

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

      const fileExt = imageFile!.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(fileName, imageFile!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(fileName);

      const pickupLocation = `${validation.data.complete_address}, ${validation.data.area}, ${validation.data.city}`;
      const otpArray = new Uint32Array(1);
      crypto.getRandomValues(otpArray);
      const otp = ((otpArray[0] % 900000) + 100000).toString();

      const { data: donationData, error } = await supabase
        .from('food_donations')
        .insert([{
          donor_id: user.id,
          title: validation.data.title,
          description: validation.data.description || '',
          quantity: validation.data.quantity,
          quantity_unit: validation.data.quantity_unit,
          food_type: validation.data.food_type,
          diet_type: validation.data.diet_type,
          phone_number: validation.data.phone_number,
          pickup_location: pickupLocation,
          latitude: coordinates?.lat || null,
          longitude: coordinates?.lng || null,
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
      
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Donate Food</CardTitle>
            <CardDescription>
              Share your surplus food with those in need
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DonateStepIndicator currentStep={currentStep} onStepClick={(step) => setCurrentStep(step)} />
            
            {currentStep === 1 ? (
              <DonateFormStep1
                formData={formData}
                setFormData={setFormData}
                imageFile={imageFile}
                imagePreview={imagePreview}
                onImageChange={handleImageChange}
                onRemoveImage={handleRemoveImage}
                onNext={() => setCurrentStep(2)}
              />
            ) : (
              <DonateFormStep2
                formData={formData}
                setFormData={setFormData}
                expiryDate={expiryDate}
                setExpiryDate={setExpiryDate}
                hour12={hour12}
                setHour12={setHour12}
                minute={minute}
                setMinute={setMinute}
                ampm={ampm}
                setAmpm={setAmpm}
                safetyConfirmed={safetyConfirmed}
                setSafetyConfirmed={setSafetyConfirmed}
                loadingLocation={loadingLocation}
                onUseCurrentLocation={handleUseCurrentLocation}
                locationDetected={!!coordinates}
                submitting={submitting}
                onBack={() => setCurrentStep(1)}
                onSubmit={handleSubmit}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
