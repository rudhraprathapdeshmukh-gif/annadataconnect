

# Plan: Complete Telugu Translation Coverage

## Summary
Multiple pages still contain hardcoded English strings that don't switch to Telugu. This plan covers all remaining untranslated text across History, Profile, Donate, Help, Auth, and Terms/Privacy pages.

## Pages with Hardcoded English

### 1. History Page (`src/pages/History.tsx`)
Hardcoded strings to replace with `t()` calls:
- "Your History", "Track your donations and achievements", "View your received food history"
- "Donations", "Helped", "Reliability" (stat card labels)
- "Completed", "Deleted", "Received" (tab labels and badges)
- Sort options: "Newest", "Oldest", "A-Z", "Z-A"
- "No completed donations yet", "No deleted donations", "No received food yet"
- "To:", "From:" labels
- Rating dialog: "Rate", "How was your experience?", "Cancel", "Submit", "Submitting..."
- "Loading..."

### 2. Profile Page (`src/pages/Profile.tsx`)
Hardcoded strings:
- "Profile", "Back", "Personal Information", "Your profile and contact details"
- "Donor & Receiver", "Donor", "Receiver" (public profile badge)
- "ratings", "Member Since", "Total Donations", "Accepted Donations"
- "Change Photo", "Photo change limit reached", "photo change(s) remaining this month"
- "Save Photo", "Uploading...", "Name", "Email", "Phone", "Not provided"
- "Loading...", image validation toasts
- "Only available if you signed up with email first" (Auth page)

### 3. Donate Page (`src/pages/Donate.tsx`)
Hardcoded strings:
- "Donate Food", "Share your surplus food with those in need"
- Various toast messages (already have keys but page uses English directly)

### 4. Help Page (`src/pages/Help.tsx`)
Nearly all content is hardcoded English — FAQ answers, user guides, technical support sections, report issue section. This is the largest block of untranslated content.

### 5. Auth Page (`src/pages/Auth.tsx`)
- "Only available if you signed up with email first"
- "Choose carefully - this cannot be changed later."
- "By continuing, you agree to our Terms of Service and Privacy Policy"
- "Format: +91 followed by 10 digits", "Max size: 5MB"
- "Password must contain:" label
- Various toast error messages (hardcoded English)

### 6. Terms & Privacy Pages
Entirely hardcoded English. These are legal pages with substantial content.

## Implementation Approach

### Step 1: Add Missing Translation Keys
Add ~150+ new keys to both `en.json` and `te.json` covering:
- History page labels, Profile page labels
- Help page full content (FAQ answers, guides, technical support)
- Auth page remaining strings
- Donate page header

### Step 2: Update Components
Replace all hardcoded strings with `t('key')` calls in:
- `src/pages/History.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Donate.tsx`
- `src/pages/Help.tsx`
- `src/pages/Auth.tsx`

### Step 3: Terms & Privacy (Partial)
For Terms and Privacy pages, add translation keys for section headers and key content. These are large legal documents, so we will translate all visible text.

### Files to Modify
1. `src/i18n/locales/en.json` — add missing keys
2. `src/i18n/locales/te.json` — add Telugu translations
3. `src/pages/History.tsx` — replace ~30 hardcoded strings
4. `src/pages/Profile.tsx` — replace ~25 hardcoded strings
5. `src/pages/Donate.tsx` — replace ~5 hardcoded strings
6. `src/pages/Help.tsx` — replace ~80+ hardcoded strings
7. `src/pages/Auth.tsx` — replace ~10 hardcoded strings
8. `src/pages/Terms.tsx` — add i18n support
9. `src/pages/Privacy.tsx` — add i18n support

