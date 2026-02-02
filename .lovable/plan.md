

# Plan: Fix Date Label from "Pickup" to "Approx Expiry Date"

## Issue
The donate form Step 2 incorrectly displays "Pickup Date & Time" for prepared food. It should consistently show "Approx Expiry Date & Time" for all food types since the field is asking when the food will expire, not when it should be picked up.

## Current Behavior
- **Prepared Food**: Shows "Pickup Date & Time *" (incorrect)
- **Other Food Types**: Shows "Expiry Date & Time *" (correct)
- **Help Text for Prepared Food**: "Prepared food: Select pickup within 2 days" (incorrect)

## Solution
Change all labels and help text to consistently use "Approx Expiry Date & Time" terminology.

## File Changes

### File: `src/components/DonateFormStep2.tsx`

**Change 1 - Line 113 (Label)**
```
Before: {isPreparedFood ? 'Pickup Date & Time *' : 'Expiry Date & Time *'}
After:  'Approx Expiry Date & Time *'
```

**Change 2 - Line 99 (Help Text)**
```
Before: if (isPreparedFood) return 'Prepared food: Select pickup within 2 days';
After:  if (isPreparedFood) return 'Prepared food: Approx expiry within 2 days';
```

## Result
- The label will always show **"Approx Expiry Date & Time *"** for all food types
- The help text will clarify the expiry window based on food type
- No conditional logic needed for the label anymore - it's consistent across all food types

