
Goal: make donor “Reject request” reliable and stop the false “Failed to reject request” toast.

1) Confirm and isolate the failing path
- Review `handleRequestAction` in `src/pages/Dashboard.tsx` (current reject flow uses direct `.update(...).select()` and throws generic error).
- Distinguish 3 cases in code path:
  - true backend error (permission/constraint)
  - no row returned (already processed/stale UI)
  - successful reject
- Replace generic failure handling with actionable messages based on error code/message.

2) Make request status updates deterministic via backend function
- Add a migration creating a security-definer DB function (e.g. `donor_set_request_status`) that:
  - accepts `_request_id` and `_status` (`approved` or `rejected`)
  - verifies caller owns the donation for that request
  - enforces valid transitions (primarily `pending -> approved/rejected`)
  - for approve: sets `accepted_at` and `timer_duration`
  - for reject: sets `status='rejected'`
  - returns the updated row id/status so frontend can trust outcome
- Keep `set search_path = public` and explicit auth checks to avoid recursion/security issues.

3) Update Dashboard action handler to use RPC instead of raw table update
- In `handleRequestAction`, replace direct `food_requests.update(...)` with `supabase.rpc(...)`.
- Remove brittle “no rows means RLS failure” branch and instead:
  - show success when RPC returns updated row
  - show “already handled” if transition is invalid/stale
  - show “failed to reject request” only for real backend errors.
- Add per-request loading/disabled state on Accept/Reject buttons to prevent double-click races.

4) Keep existing behavior intact
- Preserve:
  - auto-rejecting other pending requests after one approval
  - refresh calls for donor/receiver lists
  - existing notifications/triggers.
- Ensure reject action does not regress approved/completed flows.

5) Validation checklist after implementation
- Donor can reject a pending request without error toast.
- Rejected card disappears from donor list after refresh.
- Receiver sees the request as rejected (or removed from active list as designed).
- Approve flow still works (single approved request guard still enforced).
- Test end-to-end on both desktop and mobile viewports.
