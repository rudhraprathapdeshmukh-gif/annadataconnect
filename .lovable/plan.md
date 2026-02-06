

# Fix: Total Donations Count for Donors

## Problem
The profile card shows "Total Donations: 0" for donors because the value comes from `userProfile.total_pickups`, which tracks **receiver** pickup activity -- not donations made by the donor.

## Solution
For **donor** profiles, query the `food_donations` table to count how many donations the user has created. For **receiver** profiles, continue using `total_pickups` as before.

## Technical Changes

### File: `src/pages/Profile.tsx`

1. **Add a new state variable** for donor donation count:
   ```tsx
   const [donorDonationCount, setDonorDonationCount] = useState<number>(0);
   ```

2. **Add a function** to fetch the donor's donation count from `food_donations`:
   ```tsx
   const fetchDonorDonationCount = async () => {
     if (!profileUserId) return;
     const { count } = await supabase
       .from('food_donations')
       .select('*', { count: 'exact', head: true })
       .eq('donor_id', profileUserId);
     setDonorDonationCount(count || 0);
   };
   ```

3. **Call the function** in the existing `useEffect` alongside `fetchUserProfile()`.

4. **Update the display** in the profile card (line 432) to use the correct count based on user type:
   - Donor: show `donorDonationCount` (from `food_donations` table)
   - Receiver: show `userProfile.total_pickups` (existing behavior)

   ```tsx
   <p className="font-medium">
     {userProfile.user_type === 'receiver'
       ? (userProfile.total_pickups || 0)
       : donorDonationCount}
   </p>
   ```

5. **Same fix for the other profile view** (the "other user" card around line 432) -- both views share the same section, so the single change covers it.

## Result
- Donors will see their actual donation count from the database
- Receivers continue to see their accepted/picked-up donation count
- No database schema changes needed

