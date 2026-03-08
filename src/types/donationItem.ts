export interface DonationItemData {
  id: string; // client-side unique key
  title: string;
  description: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type: string;
  rating: number;
  imageFile: File | null;
  imagePreview: string | null;
  expiryDate: Date | undefined;
  hour12: string;
  minute: string;
  ampm: string;
}

export const createEmptyItem = (): DonationItemData => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  quantity: '',
  quantity_unit: 'kg',
  food_type: '',
  diet_type: 'veg',
  rating: 0,
  imageFile: null,
  imagePreview: null,
  expiryDate: undefined,
  hour12: '12',
  minute: '00',
  ampm: 'PM',
});

export const MAX_DONATION_ITEMS = 4;
