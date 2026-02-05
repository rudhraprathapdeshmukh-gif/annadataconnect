import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FormData {
  title: string;
  description: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type: string;
  phone_number: string;
  city: string;
  area: string;
  complete_address: string;
  rating: number;
}

interface DonateFormStep1Props {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  imageFile: File | null;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onNext: () => void;
}

export function DonateFormStep1({
  formData,
  setFormData,
  imageFile,
  imagePreview,
  onImageChange,
  onRemoveImage,
  onNext,
}: DonateFormStep1Props) {
  const { t } = useTranslation();
  const [isCustomQuantity, setIsCustomQuantity] = useState(false);

  useEffect(() => {
    const num = parseInt(formData.quantity);
    setIsCustomQuantity(num > 9 || isNaN(num) || formData.quantity === '');
  }, []);

  const handleNext = () => {
    // Validate step 1 fields
    if (!imageFile) {
      toast.error('Please upload a food image');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.quantity.trim()) {
      toast.error('Please enter quantity');
      return;
    }
    if (!formData.food_type) {
      toast.error('Please select food type');
      return;
    }
    if (formData.rating === 0) {
      toast.error('Please rate the food quality');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="image" className="text-base font-semibold">Food Image *</Label>
        <div className="flex flex-col gap-4">
          {imagePreview ? (
            <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-primary/20">
              <img
                src={imagePreview}
                alt="Food preview"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={onRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label
              htmlFor="image"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-accent/50 transition-colors touch-target"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Tap to upload food image</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (Max 5MB)</span>
            </label>
          )}
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-semibold">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Fresh vegetables from garden"
          className="h-12"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Provide details about the food..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Quantity *</Label>
        <div className="flex gap-2">
          {isCustomQuantity ? (
            <div className="flex-1 flex gap-2">
              <Input
                type="number"
                min="1"
                max="99"
                value={formData.quantity}
                onChange={(e) => {
                  const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 0));
                  setFormData({ ...formData, quantity: val.toString() });
                }}
                placeholder="10-99"
                className="flex-1 h-12"
              />
              <Button 
                type="button"
                variant="outline" 
                className="h-12"
                onClick={() => {
                  setIsCustomQuantity(false);
                  setFormData({ ...formData, quantity: '1' });
                }}
              >
                Presets
              </Button>
            </div>
          ) : (
            <Select
              value={formData.quantity}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setIsCustomQuantity(true);
                  setFormData({ ...formData, quantity: '' });
                } else {
                  setFormData({ ...formData, quantity: value });
                }
              }}
            >
              <SelectTrigger className="flex-1 h-12">
                <SelectValue placeholder="Select quantity" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
                <SelectItem value="custom">Custom (10-99)...</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={formData.quantity_unit}
            onValueChange={(value) => setFormData({ ...formData, quantity_unit: value })}
          >
            <SelectTrigger className="w-[130px] h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="grams">Grams</SelectItem>
              <SelectItem value="liters">Liters</SelectItem>
              <SelectItem value="pieces">Pieces</SelectItem>
              <SelectItem value="servings">Servings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Food Type */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Food Type *</Label>
        <Select
          value={formData.food_type}
          onValueChange={(value) => setFormData({ ...formData, food_type: value })}
        >
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select food type" />
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

      {/* Diet Type */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Diet Type *</Label>
        <RadioGroup
          value={formData.diet_type}
          onValueChange={(value) => setFormData({ ...formData, diet_type: value })}
          className="grid grid-cols-2 gap-3"
        >
          <Label
            htmlFor="veg"
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all touch-target",
              formData.diet_type === 'veg' 
                ? "border-green-500 bg-green-50 dark:bg-green-950" 
                : "border-muted hover:border-green-300"
            )}
          >
            <RadioGroupItem value="veg" id="veg" className="sr-only" />
            <span className="w-6 h-6 rounded-full bg-green-500 border-2 border-green-700" />
            <span className="text-sm font-medium">Vegetarian</span>
          </Label>
          
          <Label
            htmlFor="non-veg"
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all touch-target",
              formData.diet_type === 'non-veg' 
                ? "border-red-500 bg-red-50 dark:bg-red-950" 
                : "border-muted hover:border-red-300"
            )}
          >
            <RadioGroupItem value="non-veg" id="non-veg" className="sr-only" />
            <span className="w-6 h-6 rounded-full bg-red-500 border-2 border-red-700" />
            <span className="text-sm font-medium">Non-Vegetarian</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Food Quality Rating */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Food Quality (Freshness) *</Label>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              className="text-4xl transition-all hover:scale-110 touch-target p-1"
            >
              <span className={formData.rating >= star ? 'text-yellow-500' : 'text-muted-foreground/40'}>
                ★
              </span>
            </button>
          ))}
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <div className="grid grid-cols-5 gap-1 text-xs text-center text-muted-foreground">
            <span>Aged</span>
            <span>Poor</span>
            <span>Okay</span>
            <span>Fresh</span>
            <span>Just Made</span>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <Button 
        type="button" 
        onClick={handleNext} 
        className="w-full h-12 text-base font-semibold"
      >
        Continue to Pickup Details
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
