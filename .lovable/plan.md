

## Plan: Fix receiver card info parity, card titles, and rating/report flows

### Issues

1. **Card title shows "2 Food items"** — The parent `food_donations.title` (auto-generated as "2 Food items") is displayed as the card title everywhere. For multi-item donations, the title should instead show the individual item titles joined (e.g., "Biryani, Dal").

2. **Receiver Available Donations card missing info vs Donor card** — The receiver's "Available Donations" card already has full item details. The RequestCard (My Requests tab) also has item details. The main gap is the title display.

3. **Rating not working** — The Dashboard rating dialog blocks interaction via `onInteractOutside` + `onEscapeKeyDown` with `e.preventDefault()`. If `globalRating === 0` the dialog cannot be closed at all (the `onOpenChange` returns early). This traps users. Need to allow closing after rating is submitted, and ensure the submit flow works.

4. **Report not working in History.tsx** — The report `AlertDialog` opens on top of the rating `Dialog` (line 651: `setShowReportConfirm(true)` without closing the rating dialog). The `Dialog` overlay blocks interaction with the `AlertDialog`. Same fix as Dashboard: close rating dialog first, persist report target info separately.

### Changes

**File: `src/pages/Dashboard.tsx`**

- **Title fix**: For multi-item donations, replace `donation.title` with joined item titles:
  - Line 1174 (donor Active Donations): `donation.items && donation.items.length > 1 ? donation.items.map(i => i.title).join(', ') : donation.title`
  - Line 1628 (receiver Available Donations): same pattern
  - Line 2103 (DonorRequestCard): same pattern

- **Rating dialog fix**: The `onOpenChange` at line 1820 blocks closing when `globalRating === 0`. This is intentional to force rating, but it also prevents the dialog from closing after report. The current flow already works for report (closes dialog via `setPendingRating(null)` then opens report). The issue might be that the rating submit itself fails silently. Will add better error logging.

**File: `src/components/RequestCard.tsx`**

- **Title fix**: Line 286, for multi-item show joined item titles instead of `request.food_donations.title`

**File: `src/pages/History.tsx`**

- **Report button fix**: Same pattern as Dashboard — store report target state separately, close rating dialog first, then open report AlertDialog with a small delay.
- **Title fix** in history cards if applicable.

### Technical Details

Title change pattern (all locations):
```tsx
// Before
<CardTitle>{donation.title}</CardTitle>

// After  
<CardTitle>
  {donation.items && donation.items.length > 1
    ? donation.items.map(i => i.title).join(', ')
    : donation.title}
</CardTitle>
```

History.tsx report fix:
```tsx
// Add state
const [reportTarget, setReportTarget] = useState<{...} | null>(null);

// Report button: close dialog first
onClick={() => {
  setReportTarget({ userId: ratingDialog.otherPersonId, donationTitle: ratingDialog.donationTitle, requestId: ratingDialog.requestId });
  setRatingDialog({ ...ratingDialog, open: false });
  setTimeout(() => setShowReportConfirm(true), 150);
}}

// AlertDialog onClick uses reportTarget instead of ratingDialog
```

### Files to modify
- `src/pages/Dashboard.tsx` — title fixes in 3 locations
- `src/components/RequestCard.tsx` — title fix
- `src/pages/History.tsx` — report button fix + title fix if needed

