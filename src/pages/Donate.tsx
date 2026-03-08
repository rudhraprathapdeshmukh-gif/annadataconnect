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
import type { DonationItemData } from '@/types/donationItem';
import { createEmptyItem } from '@/types/donationItem';

const phoneSchema = z.string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Please enter a valid 10-digit Indian mobile number" });

const itemSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required" }).max(100, { message: "Title must be less than 100 characters" }),
  description: z.string().trim().max(500, { message: "Description must be less than 500 characters" }).optional(),
  quantity: z.string().trim().min(1, { message: "Quantity is required" }).max(50),
  quantity_unit: z.enum(['kg', 'grams', 'liters', 'pieces', 'servings'], { message: "Please select a unit" }),
  food_type: z.enum(['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Prepared Food', 'Bakery Products'], { message: "Please select a food type" }),
  diet_type: z.enum(['veg', 'non-veg'], { message: "Please select diet type" }),
  rating: z.number().min(1, { message: "Please rate the food quality" }).max(5),
  image: z.instanceof(File, { message: "Food image is required" }),
  expiry_datetime: z.date({
    required_error: "Expiry date and time are required",
  }).refine((date) => {
    const now = new Date();
    const twoYearsFromNow = addYears(now, 2);
    return isAfter(date, now) && isBefore(date, twoYearsFromNow);
  }, { message: "Expiry date must be between now and 2 years from today" }),
});

const donationSchema = z.object({
  items: z.array(itemSchema).min(1, { message: "At least one item is required" }).max(10, { message: "Maximum 10 items allowed" }),
  phone_number: phoneSchema,
  safety_confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm the food is safe to donate",
  }),
});

const convertTo24Hour = (h12: string, min: string, ap: string): [number, number] => {
  let hours = parseInt(h12);
  if (ap === 'AM' && hours === 12) hours = 0;
  if (ap === 'PM' && hours !== 12) hours += 12;
  return [hours, parseInt(min)];
};

export default function Donate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [items, setItems] = useState<DonationItemData[]>([createEmptyItem()]);
  const [sharedData, setSharedData] = useState({
    phone_number: '',
    city: '',
    area: '',
    complete_address: '',
  });

  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const locationAutoTriggered = useRef(false);

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
        .filter((val: string, idx: number, arr: string[]) => val && arr.indexOf(val) === idx);
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
      toast.error(t('donate.geolocationNotSupported'));
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
          setSharedData(prev => ({
            ...prev,
            city: address.city,
            area: address.area,
            complete_address: address.completeAddress,
          }));
          toast.success(t('donate.locationDetected'));
        } catch {
          toast.error(t('donate.failedGetAddress'));
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(t('donate.locationPermissionDenied'));
        } else {
          toast.error(t('donate.failedGetLocation'));
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
            toast.error(t('donate.onlyDonorsCanDonate'));
            navigate('/dashboard');
          }
        }
      }
    };
    fetchUserType();
  }, [user, navigate]);

  const buildExpiryDateTime = (item: DonationItemData): Date => {
    const dateToUse = item.expiryDate || new Date();
    const [hours24, mins] = convertTo24Hour(item.hour12, item.minute, item.ampm);
    return new Date(
      dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(),
      hours24, mins, 0, 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      // Build per-item expiry dates
      const itemExpiryDates: Date[] = [];
      for (const item of items) {
        const expiryDateTime = buildExpiryDateTime(item);
        
        if (item.food_type === 'Prepared Food') {
          const now = new Date();
          const minAllowedTime = new Date(now.getTime() + 5 * 60 * 1000);
          if (expiryDateTime < minAllowedTime) {
            toast.error(`${item.title || 'Prepared Food'}: Expiry time must be at least 5 minutes in the future`);
            setSubmitting(false);
            return;
          }
        }
        
        itemExpiryDates.push(expiryDateTime);
      }

      if (!coordinates) {
        toast.error(t('donate.detectLocationFirst'));
        setSubmitting(false);
        return;
      }

      // Build validation data
      const validationItems = items.map((item, idx) => ({
        title: item.title,
        description: item.description || undefined,
        quantity: item.quantity,
        quantity_unit: item.quantity_unit,
        food_type: item.food_type,
        diet_type: item.diet_type,
        rating: item.rating,
        image: item.imageFile!,
        expiry_datetime: itemExpiryDates[idx],
      }));

      const validation = donationSchema.safeParse({
        items: validationItems,
        phone_number: sharedData.phone_number,
        safety_confirmed: safetyConfirmed,
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast.error(firstError.message);
        setSubmitting(false);
        return;
      }

      // Upload all images in parallel
      const imageUploadPromises = items.map(async (item) => {
        const file = item.imageFile!;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${item.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('food-images')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('food-images')
          .getPublicUrl(fileName);
        return publicUrl;
      });

      const imageUrls = await Promise.all(imageUploadPromises);

      // Use the earliest expiry as the parent donation expiry
      const earliestExpiry = new Date(Math.min(...itemExpiryDates.map(d => d.getTime())));

      // Build summary for food_donations parent row
      const firstItem = items[0];
      const summaryTitle = items.length === 1 
        ? firstItem.title 
        : `${items.length} food items`;
      const summaryFoodType = items.length === 1 
        ? firstItem.food_type 
        : 'Mixed';
      const summaryDietType = items.some(i => i.diet_type === 'non-veg') ? 'non-veg' : 'veg';
      const avgRating = Math.round(items.reduce((s, i) => s + i.rating, 0) / items.length);
      const totalQuantity = items.length === 1
        ? firstItem.quantity
        : items.map(i => `${i.quantity} ${i.quantity_unit}`).join(', ');

      const pickupLocation = `${sharedData.complete_address}, ${sharedData.area}, ${sharedData.city}`;
      const otpArray = new Uint32Array(1);
      crypto.getRandomValues(otpArray);
      const otp = ((otpArray[0] % 900000) + 100000).toString();

      const { data: donationData, error } = await supabase
        .from('food_donations')
        .insert([{
          donor_id: user.id,
          title: summaryTitle,
          description: items.length === 1 ? (firstItem.description || '') : `Donation with ${items.length} items`,
          quantity: totalQuantity,
          quantity_unit: items.length === 1 ? firstItem.quantity_unit : 'pieces',
          food_type: summaryFoodType,
          diet_type: summaryDietType,
          phone_number: sharedData.phone_number,
          pickup_location: pickupLocation,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          expiry_date: earliestExpiry.toISOString(),
          rating: avgRating,
          image_url: imageUrls[0],
          otp: otp,
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert individual items into donation_items
      if (donationData) {
        const itemsToInsert = items.map((item, idx) => ({
          donation_id: donationData.id,
          title: item.title.trim(),
          description: item.description?.trim() || null,
          quantity: item.quantity,
          quantity_unit: item.quantity_unit,
          food_type: item.food_type,
          diet_type: item.diet_type,
          rating: item.rating,
          image_url: imageUrls[idx],
          expiry_date: itemExpiryDates[idx].toISOString(),
        }));

        const { error: itemsError } = await supabase
          .from('donation_items' as any)
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Failed to insert donation items:', itemsError);
        }
      }

      toast.success(t('donate.donationCreated'));
      navigate('/dashboard');
    } catch (error) {
      toast.error(t('donate.failedCreateDonation'));
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
            <CardTitle className="text-2xl">{t('donate.title')}</CardTitle>
            <CardDescription>{t('donate.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DonateStepIndicator currentStep={currentStep} onStepClick={(step) => setCurrentStep(step)} />
            {currentStep === 1 ? (
              <DonateFormStep1
                items={items}
                setItems={setItems}
                onNext={() => setCurrentStep(2)}
              />
            ) : (
              <DonateFormStep2
                sharedData={sharedData}
                setSharedData={setSharedData}
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
