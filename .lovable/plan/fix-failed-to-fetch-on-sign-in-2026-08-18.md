# Fix "Failed to fetch" on sign-in

## Diagnosis

This is not a code bug. The hosted backend for this app is currently **paused**, so every auth and database request from the browser fails at the network level — which the browser reports as `TypeError: Failed to fetch` when you press Sign In.

Confirmed: a direct request to the backend auth endpoint does not resolve, and the backend lifecycle status reports the project as paused.

## Fix

1. Resume the backend instance.
2. Poll status until it reports healthy.
3. Verify sign-in end-to-end: hit the auth endpoint with a bogus credential and confirm it returns a proper "invalid credentials" response instead of a network failure, then load `/auth` in the preview and check the console is clean.

No changes to `AuthContext`, `Auth.tsx`, or the OAuth callback are needed — that code is correct and will work again once the backend is up.

## Note

Paused backends usually result from a period of inactivity. If it pauses again, the same resume step applies.
