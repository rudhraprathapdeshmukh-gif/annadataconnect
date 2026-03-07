import { TFunction } from 'i18next';

// Translate dynamic database values to the current language

const STATUS_MAP: Record<string, string> = {
  available: 'dashboard.available',
  pending: 'dashboard.pending',
  approved: 'dashboard.approved',
  completed: 'dashboard.completed',
  rejected: 'dashboard.rejected',
  claimed: 'dashboard.claimed',
  cancelled: 'dashboard.cancelled',
  expired: 'dashboard.timerExpired',
};

const FOOD_TYPE_MAP: Record<string, string> = {
  vegetables: 'donate.foodTypes.vegetables',
  fruits: 'donate.foodTypes.fruits',
  grains: 'donate.foodTypes.grains',
  dairy: 'donate.foodTypes.dairy',
  preparedFood: 'donate.foodTypes.preparedFood',
  'prepared food': 'donate.foodTypes.preparedFood',
  other: 'donate.foodTypes.other',
};

const UNIT_MAP: Record<string, string> = {
  kg: 'dynamic.units.kg',
  grams: 'dynamic.units.grams',
  liters: 'dynamic.units.liters',
  pieces: 'dynamic.units.pieces',
  servings: 'dynamic.units.servings',
  'Kilograms (kg)': 'dynamic.units.kg',
  'Grams (g)': 'dynamic.units.grams',
  'Liters (L)': 'dynamic.units.liters',
  Pieces: 'dynamic.units.pieces',
  Servings: 'dynamic.units.servings',
};

const DIET_TYPE_MAP: Record<string, string> = {
  veg: 'donate.dietTypes.veg',
  'non-veg': 'donate.dietTypes.nonVeg',
};

export function translateStatus(t: TFunction, status: string): string {
  const key = STATUS_MAP[status];
  return key ? t(key) : status;
}

export function translateFoodType(t: TFunction, foodType: string): string {
  const key = FOOD_TYPE_MAP[foodType] || FOOD_TYPE_MAP[foodType.toLowerCase()];
  return key ? t(key) : foodType;
}

export function translateUnit(t: TFunction, unit: string): string {
  const key = UNIT_MAP[unit];
  return key ? t(key) : unit;
}

export function translateDietType(t: TFunction, dietType: string): string {
  const key = DIET_TYPE_MAP[dietType];
  return key ? t(key) : dietType;
}

export function translateDietLabel(t: TFunction, dietType: string): string {
  if (dietType === 'veg') return t('dashboard.veg');
  if (dietType === 'non-veg') return t('dashboard.nonVeg');
  return dietType;
}
