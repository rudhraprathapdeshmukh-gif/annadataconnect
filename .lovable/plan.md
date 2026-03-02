

## Fix: "Failed to fetch" on Sign-In and Google Authentication

### Problem Analysis

**Issue 1 - "Failed to fetch" on email/password sign-in:**
The generic `catch` block in `handleSubmit` shows "An error occurred" which doesn't help users. The actual error is likely a network timeout or connectivity issue. The sign-in flow needs better error handling with a timeout safety net and specific messaging for fetch failures.

**Issue 2 - Google Authentication not working:**
The code uses `supabase.auth.signInWithOAuth()` directly, but this project runs on Lovable Cloud which requires using `lovable.auth.signInWithOAuth()` instead. The Lovable Cloud managed solution needs to be configured first.

---

### Plan

**Step 1: Configure Google OAuth via Lovable Cloud**
- Use the social auth configuration tool to generate the `lovable` integration module
- This will create `src/integrations/lovable/` with the managed OAuth client

**Step 2: Update Auth.tsx - Fix Google sign-in**
- Replace `supabase.auth.signInWithOAuth()` with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Import `lovable` from `@/integrations/lovable/index`

**Step 3: Update Auth.tsx - Fix "Failed to fetch" error handling**
- Wrap the `signIn` call with a timeout (e.g., 15 seconds) using `Promise.race` so users aren't stuck indefinitely
- In the `catch` block, detect `TypeError: Failed to fetch` specifically and show a user-friendly message like "Network error. Please check your internet connection and try again."
- Add a `finally` block safety to always clear loading state

**Step 4: Update AuthContext.tsx - Add fetch error resilience**
- Wrap the `signInWithPassword` call with a try/catch that specifically handles network failures, returning a descriptive error instead of letting it throw unhandled

### Files to modify
- `src/pages/Auth.tsx` - Google OAuth method + error handling
- `src/contexts/AuthContext.tsx` - Network error resilience in signIn

