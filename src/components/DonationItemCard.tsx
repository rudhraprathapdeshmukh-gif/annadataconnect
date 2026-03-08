import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, X, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DonationItemData } from '@/types/donationItem';

interface DonationItemCardProps {
  item: DonationItemData;
  index: number;
  totalItems: number;
  onChange: (updated: DonationItemData) => void;
  onRemove: () => void;
}

export function DonationItemCard({ item, index, totalItems, onChange, onRemove }: DonationItemCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCustomQuantity, setIsCustomQuantity] = useState(false);

  useEffect(() => {
    const num = parseInt(item.quantity);
    setIsCustomQuantity(num > 9 || isNaN(num) || item.quantity === '');
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...item, imageFile: file, imagePreview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onChange({ ...item, imageFile: null, imagePreview: null });
  };

  const inputId = `item-image-${item.id}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-xl overflow-hidden bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {item.imagePreview && (
                <img src={item.imagePreview} alt="" className="w-10 h-10 rounded-lg object-cover" />
              )}
              <div className="text-left">
                <span className="font-semibold text-sm">
                  Item {index + 1}{item.title ? `: ${item.title}` : ''}
                </span>
                {item.food_type && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({item.food_type})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalItems > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor={inputId} className="text-sm font-semibold">Food Image *</Label>
              {item.imagePreview ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-primary/20">
                  <img src={item.imagePreview} alt="Food preview" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor={inputId}
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground font-medium">Tap to upload</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, WEBP (Max 5MB)</span>
                </label>
              )}
              <Input
                id={inputId}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Title *</Label>
              <Input
                value={item.title}
                onChange={(e) => onChange({ ...item, title: e.target.value })}
                placeholder="e.g., Fresh vegetables"
                className="h-11"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                value={item.description}
                onChange={(e) => onChange({ ...item, description: e.target.value })}
                placeholder="Details about this item..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Quantity *</Label>
              <div className="flex gap-2">
                {isCustomQuantity ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 0));
                        onChange({ ...item, quantity: val.toString() });
                      }}
                      placeholder="10-99"
                      className="flex-1 h-11"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 text-xs"
                      onClick={() => {
                        setIsCustomQuantity(false);
                        onChange({ ...item, quantity: '1' });
                      }}
                    >
                      Presets
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={item.quantity}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setIsCustomQuantity(true);
                        onChange({ ...item, quantity: '' });
                      } else {
                        onChange({ ...item, quantity: value });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 h-11">
                      <SelectValue placeholder="Select" />
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
                  value={item.quantity_unit}
                  onValueChange={(value) => onChange({ ...item, quantity_unit: value })}
                >
                  <SelectTrigger className="w-[110px] h-11">
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
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Food Type *</Label>
              <Select
                value={item.food_type}
                onValueChange={(value) => onChange({ ...item, food_type: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select food type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                  <SelectItem value="Fruits">Fruits</SelectItem>
                  <SelectItem value="Grains">Grains</SelectItem>
                  <SelectItem value="Dairy">Dairy</SelectItem>
                  <SelectItem value="Prepared Food">Prepared Food</SelectItem>
                  <SelectItem value="Bakery Products">Bakery Products</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Diet Type */}
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Diet Type *</Label>
              <RadioGroup
                value={item.diet_type}
                onValueChange={(value) => onChange({ ...item, diet_type: value })}
                className="grid grid-cols-2 gap-2"
              >
                <Label
                  htmlFor={`veg-${item.id}`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    item.diet_type === 'veg'
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-muted hover:border-green-300"
                  )}
                >
                  <RadioGroupItem value="veg" id={`veg-${item.id}`} className="sr-only" />
                  <span className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-700" />
                  <span className="text-xs font-medium">Vegetarian</span>
                </Label>
                <Label
                  htmlFor={`non-veg-${item.id}`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    item.diet_type === 'non-veg'
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : "border-muted hover:border-red-300"
                  )}
                >
                  <RadioGroupItem value="non-veg" id={`non-veg-${item.id}`} className="sr-only" />
                  <span className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-700" />
                  <span className="text-xs font-medium">Non-Veg</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Food Quality (Freshness) *</Label>
              <div className="flex gap-1.5 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onChange({ ...item, rating: star })}
                    className="text-3xl transition-all hover:scale-110 p-0.5"
                  >
                    <span className={item.rating >= star ? 'text-yellow-500' : 'text-muted-foreground/40'}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <div className="bg-muted/50 p-2 rounded-lg">
                <div className="grid grid-cols-5 gap-1 text-[10px] text-center text-muted-foreground">
                  <span>Aged</span>
                  <span>Poor</span>
                  <span>Okay</span>
                  <span>Fresh</span>
                  <span>Just Made</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
