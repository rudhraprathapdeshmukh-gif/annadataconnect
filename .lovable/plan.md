

# Security and Bug Audit Report

After a thorough review of the codebase, database schema, RLS policies, and security scan results, here are the issues found, organized by severity.

---

## CRITICAL BUGS

### 1. Crash when `user` is null on Dashboard (line 187)
In `requestLocation()`, the `else` branch at line 186-188 executes when `user` is `null`, but then accesses `user.id`. This will crash with a runtime error.

```
} else {
  // user is null here, so user.id will throw!
  await supabase.from('profiles').update(...).eq('id', user.id);
}
```

**Fix:** Remove the `else` branch entirely -- it should never run when `user` is null.

### 2. Fallback donation query exposes sensitive data
When a receiver has no location, `fetchDonations()` (line 473-483) queries `food_donations` directly, exposing `pickup_location` (exact addresses), `latitude`, and `longitude` to anyone. The `get_nearby_donations` and `get_public_donations` RPCs mask this data, but this fallback bypasses that.

**Fix:** Use `get_public_donations()` RPC instead of direct table query for the fallback.

### 3. ChangePasswordDialog weak password policy
The change password dialog (line 34) only requires 6 characters minimum, while the signup form requires 8+ with uppercase, lowercase, number, and special character. A user could weaken their password via the change password flow.

**Fix:** Apply the same `passwordSchema` validation from Auth.tsx.

---

## SECURITY VULNERABILITIES

### 4. `insert_user_location` function has no `search_path` set
The linter flagged this. The function also has no `SECURITY DEFINER` and no RLS check -- any authenticated user could potentially call it with another user's ID.

**Fix:** Add `SET search_path = 'public'` and either add authorization checks or remove it if unused (it appears unused in the client code).

### 5. Notifications INSERT RLS is too restrictive
The `notifications` table only allows inserting `extension_request` type notifications. But the client code inserts `request_approved`, `extension_granted`, `extension_rejected`, and other types directly from Dashboard.tsx (lines 797-805, 852-860, 890-898). These inserts will silently fail due to RLS.

**Fix:** Either:
- Move all notification inserts to database triggers/functions (preferred), or
- Expand the RLS policy to allow authenticated users to insert notifications for users they have active relationships with.

### 6. Auto-reject of expired approved requests done client-side
In `fetchRequests()` (lines 550-573), the donor's browser auto-rejects expired requests. This means if a donor never opens the dashboard, expired approved requests remain active indefinitely. The server-side `auto_reject_stale_requests` cron only handles pending requests, not approved ones past their timer.

**Fix:** Extend the `auto_reject_stale_requests` database function to also reject approved requests whose `accepted_at + timer_duration` has passed.

---

## MODERATE ISSUES

### 7. Edit donation form has no input validation
`handleSaveEdit()` (line 917-940) directly submits form values without any validation or sanitization. An attacker could set title/description to excessively long strings or inject content.

**Fix:** Add Zod validation similar to the donation creation form.

### 8. Race condition in request approval
`handleRequestAction()` checks for existing approved requests using local state (`requests.some(...)` at line 752), not the database. Two donors viewing the same request simultaneously could both approve, or the state could be stale.

**Fix:** Use a database-level check (the trigger `handle_request_status_change` partially handles this, but an explicit database-level guard would be more robust).

### 9. Avatar upload path uses `Math.random()` -- predictable filenames
Both Auth.tsx (line 326) and Profile.tsx use `Math.random().toString(36)` for avatar filenames. `Math.random()` is not cryptographically random and could be predicted.

**Fix:** Use `crypto.randomUUID()` instead.

---

## PLAN SUMMARY

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | Null `user` crash in Dashboard | Critical | Remove dead `else` branch |
| 2 | Fallback query leaks exact locations | Critical | Use `get_public_donations()` RPC |
| 3 | Weak password change validation | Critical | Reuse `passwordSchema` |
| 4 | `insert_user_location` insecure | Security | Add search_path + auth check |
| 5 | Notification INSERT RLS blocks client inserts | Security | Move inserts to DB triggers |
| 6 | Expired approved requests not auto-rejected server-side | Security | Extend cron function |
| 7 | No validation on edit donation form | Moderate | Add Zod schema |
| 8 | Race condition in request approval | Moderate | Add DB-level guard |
| 9 | Predictable avatar filenames | Moderate | Use `crypto.randomUUID()` |

### Implementation approach:
1. Fix bugs #1, #2, #3 in the client code
2. Create a database migration for #4 (secure `insert_user_location`), #5 (add notification insert triggers for extension_granted/rejected and request rejection notifications), #6 (extend `auto_reject_stale_requests` to handle expired approved requests)
3. Fix #7, #9 in client code

