
Goal: make request lifecycle reliable across 3 cases:
1) donor rejects receiver request without false failure toast,
2) donor deleting a donation cancels all open receiver requests,
3) once claimed, donation is removed from available list and blocked from new requests.

What I found
- `notify_receivers_on_donation_delete()` currently cancels only `approved` requests, not `pending`.
- `donor_set_request_status()` is in place, but frontend handling is brittle (JSON response shape assumptions can still fall into generic “failed to reject”).
- Request creation protections rely heavily on claimed status checks; we should harden “requestable donation” conditions to prevent stale/edge-case inserts.

Implementation plan

1) Backend migration: make deletion + claim state transitions deterministic
- Update `public.notify_receivers_on_donation_delete()` to cancel all non-final requests for that donation (`pending`, `approved`) when `deleted_at` is set.
- Keep `completed/rejected/cancelled` unchanged.
- Insert cancellation notifications for affected receivers (same messaging model as existing flow).

2) Backend migration: harden donor action RPC (`donor_set_request_status`)
- Keep `SECURITY DEFINER` + `SET search_path = public`.
- Add row lock (`FOR UPDATE`) on target request to avoid race conditions.
- Validate:
  - request exists,
  - caller owns the donation,
  - `_new_status` is `approved|rejected`,
  - transition allowed only from `pending`.
- On `approved`:
  - set request `approved` + `accepted_at` + `timer_duration`,
  - mark donation `claimed`,
  - auto-reject other pending requests for same donation.
- On `rejected`:
  - set request `rejected`.
- Return structured JSON (`success`, `reason`, `current_status`, `status`, `donation_id`) so UI can map outcomes reliably.

3) Backend migration: tighten receiver request creation guard
- Introduce/replace a helper check (e.g. `is_donation_requestable`) used by the insert policy so new requests are allowed only when donation is truly requestable:
  - exists,
  - `status = 'available'`,
  - `deleted_at IS NULL`,
  - not expired.
- Keep existing anti-abuse checks (`has_completed_request`, active-approved guard, requester ownership).
- This ensures claimed/deleted donations cannot accept new requests even in stale UI scenarios.

4) Frontend update: fix false “Failed to reject request” toast
- In `src/pages/Dashboard.tsx` `handleRequestAction`:
  - normalize RPC payload robustly (handle object/array/null safely),
  - map backend reasons to actionable toasts.
- Key behavior:
  - true backend error => failure toast,
  - already-handled stale state => info toast,
  - already `rejected` while action is reject => treat as successful/idempotent (no failure toast).

5) Frontend update: prevent double-action races + reflect cancellation clearly
- Add per-request loading state (by request id) and disable Accept/Reject while request is processing.
- Keep current refresh hooks (`fetchRequests`, `fetchMyRequests`, `fetchMyDonations`) after mutation.
- Align receiver request list filtering so cancelled-by-deletion requests remain visible as cancelled (instead of silently disappearing), matching the existing cancelled-card UX intent.

Technical details (implementation scope)
- Files:
  - `supabase/migrations/<new>.sql` (functions/policy updates)
  - `src/pages/Dashboard.tsx` (RPC result handling + loading/disabled states + receiver cancelled visibility alignment)
- No direct edits to generated integration client/types files.

Validation checklist
1. Donor rejects a pending request:
   - request status changes to rejected,
   - no false “Failed to reject request” toast.
2. Donor deletes a donation with pending/approved requests:
   - all those requests become cancelled automatically,
   - receivers see cancellation state/message.
3. One receiver gets approved:
   - donation becomes claimed immediately,
   - donation disappears from available list,
   - other users cannot create new request on it.
4. Approve flow regression check:
   - auto-reject of other pending requests still works,
   - timer + pickup flow remains unchanged.
5. End-to-end verification on desktop and mobile viewport.
