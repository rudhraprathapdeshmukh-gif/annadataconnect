export interface SavedAddress {
  id: string;
  user_id: string;
  address_name: string;
  city: string;
  area: string;
  complete_address: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
