import { supabase } from '@/integrations/supabase/client';

export interface UserRating {
  average: number | null;
  count: number;
}

/**
 * Fetches the average rating for a user (combining both donor and receiver ratings)
 */
export async function fetchUserRating(userId: string): Promise<UserRating> {
  try {
    // Get all donations by this user
    const { data: userDonations } = await supabase
      .from('food_donations')
      .select('id')
      .eq('donor_id', userId);

    const donationIds = userDonations?.map(d => d.id) || [];

    // Get ratings where user was the DONOR (receiver rated them)
    const { data: ratingsAsDonor } = await supabase
      .from('food_requests')
      .select('receiver_rating')
      .in('donation_id', donationIds)
      .not('receiver_rating', 'is', null);

    // Get ratings where user was the RECEIVER (donor rated them)
    const { data: ratingsAsReceiver } = await supabase
      .from('food_requests')
      .select('donor_rating')
      .eq('requester_id', userId)
      .not('donor_rating', 'is', null);

    // Combine all ratings
    const allRatings: number[] = [
      ...(ratingsAsDonor?.map(r => r.receiver_rating).filter(Boolean) || []),
      ...(ratingsAsReceiver?.map(r => r.donor_rating).filter(Boolean) || [])
    ] as number[];

    if (allRatings.length === 0) {
      return { average: null, count: 0 };
    }

    const avg = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
    return {
      average: Math.round(avg * 10) / 10,
      count: allRatings.length
    };
  } catch (error) {
    console.error('Error fetching user rating:', error);
    return { average: null, count: 0 };
  }
}

/**
 * Renders star icons based on rating
 */
export function renderStars(rating: number | null): string {
  if (!rating) return '☆☆☆☆☆';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + (hasHalfStar ? '⯨' : '') + '☆'.repeat(emptyStars);
}
