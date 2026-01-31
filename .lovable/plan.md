
# Plan: Open Full Profile Page on Mobile

## Current Behavior
When users tap on their avatar in the mobile navbar, a bottom sheet (`MobileMenu`) opens with:
- User info (avatar, name, email, user type)
- Quick action buttons: "Profile" and "History/Achievements"
- App preferences (theme, language, notifications)
- Account settings (change password, logout)
- Help link

The "Profile" button navigates to `/profile` but the user info is also displayed in the sheet itself.

## Requested Change
When users tap on their avatar on mobile, they should be taken directly to the full Profile page (`/profile`) instead of opening the bottom sheet menu.

## Implementation

### Approach
Modify the mobile navigation behavior so that:
1. Tapping the avatar directly navigates to `/profile`
2. Add a separate hamburger/menu icon button for accessing the settings menu (theme, language, notifications, logout, etc.)

This provides:
- Quick access to profile with a single tap
- Settings and other options still accessible via a dedicated menu button

### File Changes

**File: `src/components/Navbar.tsx`**

1. For mobile users, change the avatar button to navigate directly to `/profile` instead of opening `MobileMenu`
2. Add a separate menu icon button next to the avatar that opens `MobileMenu`
3. Remove the user info header section from `MobileMenu` since the avatar now navigates directly to profile

**File: `src/components/MobileMenu.tsx`**

1. Change the trigger from an Avatar button to a Menu (hamburger) icon
2. Remove the redundant user info section at the top of the sheet (since tapping avatar goes to profile now)
3. Keep the "Profile" quick action button for convenience
4. Clean up the layout to accommodate the new structure

---

## Technical Details

### Navbar.tsx Changes
```text
Lines 165-174: Replace MobileMenu avatar trigger with:
- Direct Link to /profile wrapping the Avatar button
- Separate MobileMenu component with a menu icon trigger
```

### MobileMenu.tsx Changes
```text
Lines 52-67: Change SheetTrigger from Avatar to Menu icon button
Lines 73-91: Remove or simplify the user info header section
```

### Layout Structure (After Changes)
```text
Mobile Navbar: [Logo] [Dashboard] [Donate] [Notifications] [Avatar→Profile] [Menu Icon→Sheet]
```

This gives users:
- One-tap access to their full profile
- Separate menu button for settings, preferences, and logout
