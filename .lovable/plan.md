
Goal: make donor “Reject” reliably change `food_requests.status` from `pending` → `rejected` (no false failure, no no-op).

What I found
- `Dashboard.tsx` is calling `donor_set_request_status` for reject, but when RPC errors/returns unexpected payload, UI falls back to generic failure and request stays pending.
- The DB function exists and is security-definer, but current flow still depends on ambiguous runtime outcomes (especially in error path).
- This needs a stricter backend contract + a safer frontend failover path.

Implementation plan

1) Harden reject logic in backend function (migration)
- Update `public.donor_set_request_status` so reject uses one atomic mutation tied to donor ownership:
  - `UPDATE food_requests fr ... FROM food_donations fd ... WHERE fr.id=_request_id AND fr.status='pending' AND fd.donor_id=auth.uid() RETURNING ...`
- Return a consistent JSON contract for every path:
  - `success, reason, request_id, donation_id, current_status, requested_status, error_code`
- Add `EXCEPTION WHEN OTHERS` block that returns structured failure JSON (instead of opaque RPC error) so frontend can map it correctly.

2) Tighten auth/permission surface for this RPC (migration)
- Ensure function remains `SECURITY DEFINER` with `SET search_path = public`.
- Ensure execute is explicitly intended for signed-in users (authenticated role).
- Keep RLS ownership enforcement in place for direct update fallback safety.

3) Make reject handling deterministic in `src/pages/Dashboard.tsx`
- Keep one primary path: RPC call for reject.
- Parse result defensively (object/array/string payloads).
- Map reasons explicitly:
  - `not_authorized`, `not_found`, `already_handled`, `update_failed`, `exception`.
- If result is unclear or RPC-level error occurs, immediately read back request status:
  - if `rejected` => treat as success/idempotent
  - if still `pending` => true failure toast.

4) Add last-resort donor-safe fallback when RPC hard-fails
- If RPC throws and read-back is still `pending`, do one emergency direct update:
  - `.update({ status: 'rejected' }).eq('id', requestId).eq('status','pending')`
- Rely on donor UPDATE RLS policy to enforce ownership.
- Re-read status after fallback and show final toast from actual state (not guessed state).

5) Keep UX race-safe and traceable
- Retain per-request loading lock (`actionLoadingIds`) so reject can’t double-fire.
- Add temporary dev logs around:
  - requestId, action, rpc payload/result, read-back status, fallback result.
- Remove verbose logs after one stable cycle.

Technical scope
- `supabase/migrations/<new>.sql`  
  (harden `donor_set_request_status` contract + exception-safe result + auth execute scope)
- `src/pages/Dashboard.tsx`  
  (deterministic reject handling + read-back verification + emergency fallback + precise toasts)

Validation checklist
1. Donor rejects a fresh pending request → status becomes `rejected`, no “Failed to reject request” toast.
2. Reject same request again → idempotent “already handled” behavior (no hard failure).
3. Pending request truly updates in DB (not just UI toast suppression).
4. Approve flow still works (claim donation + reject competing pending requests).
5. Verify end-to-end on desktop and mobile, and confirm behavior after publish.
