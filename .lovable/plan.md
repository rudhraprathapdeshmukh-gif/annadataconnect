

## Diagnosis

After reviewing the code, I identified **two issues** causing the "stuck on Loading" problem:

### Issue 1: Dashboard `loadingDonations` can hang indefinitely
In `Dashboard.tsx`, `loadingDonations` starts as `true` and only becomes `false` when `fetchDonations()` completes. While `fetchDonations` has a try-catch-finally, there's no safety timeout — if the database query hangs on slow connections or specific account states, the user sees "Loading..." forever.

### Issue 2: Auth.tsx early returns don't clear the safety timeout
In `handleSubmit`, early returns (validation failures on lines 300-315) call `setLoading(false)` but **don't clear `safetyTimeout`**. The timeout still fires 15 seconds later showing a confusing "Sign-in is taking too long" error even though the user already got a validation error.

## Plan

### 1. Add safety timeout to Dashboard loading state
In `src/pages/Dashboard.tsx`, add a `useEffect` that sets a 5-second safety timeout on `loadingDonations`. If it's still `true` after 5 seconds, force it to `false` so users aren't stuck.

### 2. Fix Auth.tsx timeout cleanup on early returns
In `src/pages/Auth.tsx`, move `clearTimeout(safetyTimeout)` calls into every early return path (validation failures for both sign-in and sign-up), not just the `finally` block.

