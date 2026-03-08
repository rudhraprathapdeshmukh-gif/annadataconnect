

## Plan: Camera Capture for Donations + Freshness Labels on Multi-Item Cards

### Changes

**1. Camera capture instead of file upload (`DonationItemCard.tsx`)**
- Change the file input from generic `accept="image/*"` to `accept="image/*" capture="environment"` which opens the device camera directly on mobile
- Update the upload label text from "Tap to upload" to "Tap to capture photo" with a Camera icon instead of Upload icon
- On desktop browsers, `capture` gracefully falls back to file picker, so no special handling needed

**2. Show freshness label next to stars for multi-item donations (`Dashboard.tsx`)**
- In both the donor's "Active Donations" multi-item list (around line 1217) and the receiver's "Available Donations" multi-item list (around line 1647), add the freshness label text (Aged/Poor/Okay/Fresh/Just-Made) next to the star rating
- Also add it for the single-item rating display (around line 1239)
- Use the existing `getFreshnessLabel()` function already defined in Dashboard.tsx

### Files to modify
- `src/components/DonationItemCard.tsx` — camera capture + icon change
- `src/pages/Dashboard.tsx` — freshness labels next to ratings in multi-item lists

