
Goal: make donor reject action actually update `food_requests.status` from `pending` → `rejected` (not just suppress the toast).

Issue rephrased:
- Reject click currently shows failure and the request stays `pending`, so the mutation is not being applied.
- This is now a true state-change failure (not only a toast-mapping issue).

Do I know what the issue is?
- Yes: the reject path is currently split between a direct table update + RPC fallback, and this can still end in ambiguous/no-op outcomes (especially with RLS-style silent no-row updates), while UI falls back to generic failure handling.

Implementation plan

1) Make reject path single-source-of-truth (frontend)
- In `src/pages/Dashboard.tsx`, remove “direct update first” behavior for reject.
- Always call `donor_set_request_status` for both approve/reject.
- Keep per-request loading lock to prevent double clicks.

2) Harden RPC result parsing + status verification (frontend)
- Expand parser to handle nested/unexpected payload shapes safely.
- If RPC response is malformed or `success !== true`, do an immediate read-back of that request’s current status:
  - if now `rejected`, treat as success (idempotent),
  - if still `pending`, show actionable error (not generic).

3) Add explicit backend diagnostics in RPC return (DB migration)
- Update `public.donor_set_request_status` to return a richer JSON contract:
  `success, reason, current_status, requested_status, donation_id, request_id`.
- Keep `FOR UPDATE`, ownership check, allowed statuses, and pending-only transitions.
- For reject branch, use `UPDATE ... WHERE id=_request_id AND status='pending' RETURNING id` so success is tied to actual row mutation.

4) Tighten UI error mapping (frontend)
- Map backend reasons distinctly:
  - `not_authorized` → permission message
  - `already_handled` → info/idempotent
  - `not_found` → info
  - unknown + still pending after read-back → true failure toast.
- Add temporary dev logs around requestId/action/RPC payload/result for one release cycle.

5) Validation
- Donor rejects pending request: card leaves pending list and receiver sees rejected/cancelled outcome as designed.
- Repeat reject on same request: no hard failure (idempotent info/success).
- Approve flow still works (claim + competing pending auto-reject unchanged).
- End-to-end test on desktop + mobile viewport.

Technical details (files)
- `supabase/migrations/<new>.sql` (update `donor_set_request_status` contract/logic)
- `src/pages/Dashboard.tsx` (single RPC path, parser hardening, read-back verification, toast mapping)
