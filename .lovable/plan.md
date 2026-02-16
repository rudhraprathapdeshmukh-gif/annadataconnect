
# Replace "Other" with "Bakery Products" and Add 2-Day Expiry

## Changes

### 1. `src/components/DonateFormStep1.tsx`
- Replace the "Other" food type option with "Bakery Products" (line 234)

### 2. `src/components/DonateFormStep2.tsx`
- Add a new condition for "Bakery Products" in the `getDateConstraints()` function: expiry within 2 days (same as Prepared Food and Dairy)
- Add a help text line for Bakery Products: "Bakery Products: Expiry within 2 days"

### Technical Details

In `DonateFormStep2.tsx`, the date constraint logic (around line 73) will be updated:

```
const isBakery = formData.food_type === 'Bakery Products';
```

Added to `getDateConstraints()`:
```
if (isBakery) {
  return { min: today, max: addDays(today, 2) };
}
```

Added to `getDateHelpText()`:
```
if (isBakery) return 'Bakery Products: Expiry within 2 days';
```

No database changes needed.
