

# Plan: Show User Type in Profile Page

## Overview
Add the user type (Donor, Receiver, or Both) display to the own profile view section. Currently, the user type is only shown when viewing another user's profile, but not when viewing your own profile.

## Current State
- **Other Users' Profiles**: Shows user type badge (Donor, Receiver, or Donor & Receiver)
- **Own Profile**: Does NOT show user type - only displays name, email, phone, and avatar

## Implementation

### File: `src/pages/Profile.tsx`

Add a "User Type" field in the "Personal Information" card, right after the "Phone" field. This will show the user's role using a Badge component with proper translations.

**Location**: Lines 485-489 (after the Phone field section)

**Change**: Add a new section for User Type display:
```
<div>
  <Label className="text-sm text-muted-foreground">User Type</Label>
  <div className="mt-1">
    <Badge variant="secondary">
      {userProfile?.user_type === 'both' 
        ? t('profile.donorReceiver') 
        : userProfile?.user_type === 'donor' 
          ? t('profile.donor') 
          : t('profile.receiver')}
    </Badge>
  </div>
</div>
```

## Visual Result
The Profile page will now show:
- Name
- Email  
- Phone
- **User Type** (with a badge showing "Donor", "Receiver", or "Donor & Receiver")

This matches the style already used in the public profile view and works on both mobile and desktop since the Profile page is already responsive.

## Translation Support
Uses existing translation keys:
- `profile.donor` → "Donor" / "దాత"
- `profile.receiver` → "Receiver" / "స్వీకర్త"  
- `profile.donorReceiver` → "Donor & Receiver" / "దాత & స్వీకర్త"

