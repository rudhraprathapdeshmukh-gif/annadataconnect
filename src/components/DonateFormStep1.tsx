import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DonationItemCard } from '@/components/DonationItemCard';
import type { DonationItemData } from '@/types/donationItem';
import { createEmptyItem, MAX_DONATION_ITEMS } from '@/types/donationItem';

interface DonateFormStep1Props {
  items: DonationItemData[];
  setItems: React.Dispatch<React.SetStateAction<DonationItemData[]>>;
  onNext: () => void;
}

export function DonateFormStep1({ items, setItems, onNext }: DonateFormStep1Props) {
  const handleItemChange = (index: number, updated: DonationItemData) => {
    setItems(prev => prev.map((item, i) => i === index ? updated : item));
  };

  const handleAddItem = () => {
    if (items.length >= MAX_DONATION_ITEMS) {
      toast.error(`Maximum ${MAX_DONATION_ITEMS} items per donation`);
      return;
    }
    setItems(prev => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = items.length > 1 ? `Item ${i + 1}: ` : '';
      
      if (!item.imageFile) {
        toast.error(`${label}Please upload a food image`);
        return;
      }
      if (!item.title.trim()) {
        toast.error(`${label}Please enter a title`);
        return;
      }
      if (!item.quantity.trim()) {
        toast.error(`${label}Please enter quantity`);
        return;
      }
      if (!item.food_type) {
        toast.error(`${label}Please select food type`);
        return;
      }
      if (item.rating === 0) {
        toast.error(`${label}Please rate the food quality`);
        return;
      }
      if (!item.expiryDate) {
        toast.error(`${label}Please select an expiry date`);
        return;
      }
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length > 1 ? 's' : ''} in this donation
        </p>
        {items.length < MAX_DONATION_ITEMS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Item
          </Button>
        )}
      </div>

      {items.map((item, index) => (
        <DonationItemCard
          key={item.id}
          item={item}
          index={index}
          totalItems={items.length}
          onChange={(updated) => handleItemChange(index, updated)}
          onRemove={() => handleRemoveItem(index)}
        />
      ))}

      {items.length < MAX_DONATION_ITEMS && items.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAddItem}
          className="w-full h-11 border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Item
        </Button>
      )}

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
