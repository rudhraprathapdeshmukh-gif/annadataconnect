

## Plan: Fix people helped stats, report button, and rename report labels

### Issues Found

1. **People Helped** only calculates from the parent `food_donations` record's quantity — it ignores individual `donation_items`. Multi-item donations have their quantities stored per-item in `donation_items`, so the parent quantity alone undercounts.

2. **Report button not working** — The rating Dialog has `onInteractOutside` calling `e.preventDefault()`, which blocks interaction with the AlertDialog that opens on top. The AlertDialog renders as a portal but the Dialog's event handlers still interfere. Fix: close the rating dialog before opening the report confirmation, or use a state-based approach that doesn't rely on nested dialogs.

3. **"Report \<Name\>"** needs renaming to just **"Report"** in both Dashboard.tsx and History.tsx.

### Changes

**File: `src/components/ImpactDashboard.tsx`**
- After identifying completed donation IDs, fetch `donation_items` for those donations
- Calculate people helped by summing across all individual items (using existing weighted logic)
- Fall back to parent donation quantity only if no items exist for that donation

**File: `src/pages/Dashboard.tsx`**
- **Report button fix**: Instead of opening AlertDialog inside the rating Dialog, close the rating dialog first (`setPendingRating(null)`), then show the report confirm AlertDialog. Store the pending rating info in a separate ref/state so it survives the dialog close.
- Rename `Report {pendingRating?.otherUserName}` → `Report` (line ~1874)
- Rename `Report {pendingRating?.otherUserName}?` → `Report User?` in AlertDialog title (line ~1891)
- Remove name from AlertDialog description (line ~1893)

**File: `src/pages/History.tsx`**
- Rename `Report {ratingDialog.otherPersonName}` → `Report` (line ~654)
- Rename `Report {ratingDialog.otherPersonName}?` → `Report User?` in AlertDialog title (line ~670)
- Remove name from AlertDialog description (line ~672)

### Technical Details

People helped calculation change (ImpactDashboard.tsx):
```typescript
// Fetch donation_items for completed donations
const { data: itemsData } = await supabase
  .from('donation_items')
  .select('donation_id, quantity, quantity_unit')
  .in('donation_id', completedDonationIds);

// Group items by donation_id, sum per-item people helped
// If a donation has items, use items; otherwise fall back to parent record
```

Report button fix (Dashboard.tsx):
```typescript
// Store report info separately so it survives dialog close
const [reportTarget, setReportTarget] = useState<{...} | null>(null);

// Report button onClick:
setReportTarget({ userId: pendingRating.otherUserId, ... });
setPendingRating(null); // close rating dialog
setShowReportConfirm(true);
```

