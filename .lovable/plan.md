

## Problem

Receivers cannot see individual food item details on available donation cards because of an RLS (Row Level Security) issue.

**Root cause**: The `donation_items` table has an RLS policy "Anyone can view items of available donations" that checks:
```sql
donation_id IN (SELECT food_donations.id FROM food_donations WHERE status = 'available' AND deleted_at IS NULL)
```

However, this sub-query runs under the current user's RLS context. The `food_donations` table only allows receivers to SELECT donations they have existing requests for (via `get_receiver_donation_ids`). There is no policy allowing receivers to see available donations directly — they use a `SECURITY DEFINER` RPC function (`get_nearby_donations`) which bypasses RLS.

So when a receiver tries to fetch `donation_items`, the sub-query on `food_donations` returns zero rows, and no items are returned.

## Solution

Create a `SECURITY DEFINER` function to fetch donation items for available donations, bypassing the RLS chain issue. This is the cleanest fix that doesn't require adding a broad SELECT policy on `food_donations`.

### Database Migration

Create a new function `get_donation_items_for_available`:

```sql
CREATE OR REPLACE FUNCTION public.get_donation_items_for_available(p_donation_ids uuid[])
RETURNS TABLE(
  id uuid, donation_id uuid, title text, description text,
  quantity text, quantity_unit text, food_type text, diet_type text,
  rating integer, image_url text, expiry_date timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT di.id, di.donation_id, di.title, di.description,
         di.quantity, di.quantity_unit, di.food_type, di.diet_type,
         di.rating, di.image_url, di.expiry_date
  FROM donation_items di
  JOIN food_donations fd ON fd.id = di.donation_id
  WHERE di.donation_id = ANY(p_donation_ids)
    AND fd.status = 'available'
    AND fd.deleted_at IS NULL;
$$;
```

### Code Change: `src/pages/Dashboard.tsx`

Update `fetchDonationItems` to use the new RPC for receiver context. Since the same function is used for both donor and receiver, the simplest approach: try the direct query first, and if it returns empty for non-empty donation IDs, fall back to the RPC. 

Actually, cleaner: use the RPC always in the receiver's `fetchDonations` path. Modify `fetchDonationItems` to accept an optional flag or create a separate function for receiver context:

```tsx
const fetchDonationItemsPublic = async (donationIds: string[]): Promise<Record<string, DonationItem[]>> => {
  if (donationIds.length === 0) return {};
  const { data, error } = await supabase.rpc('get_donation_items_for_available', {
    p_donation_ids: donationIds,
  });
  if (error) {
    console.error('Failed to fetch donation items via RPC:', error);
    return {};
  }
  const map: Record<string, DonationItem[]> = {};
  (data || []).forEach((item: any) => {
    if (!map[item.donation_id]) map[item.donation_id] = [];
    map[item.donation_id].push(item);
  });
  return map;
};
```

Then in `fetchDonations` (receiver path, ~line 540), call `fetchDonationItemsPublic` instead of `fetchDonationItems`.

### Files to modify
- **Database**: New migration adding `get_donation_items_for_available` function
- **`src/pages/Dashboard.tsx`**: Add `fetchDonationItemsPublic`, use it in receiver's `fetchDonations`

