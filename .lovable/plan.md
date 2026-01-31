
Goal
- Fix the mobile donor-side overflow where the “History & Achievements” label spills outside its button/container (as shown in the screenshot).

What’s causing it
- In `src/components/MobileMenu.tsx`, the “Quick Actions” area is a `grid grid-cols-2`, so each button gets ~50% width.
- The Button base styles include `whitespace-nowrap`, and the label is currently rendered as plain text (no `min-w-0`, no `overflow-hidden`, no `truncate`), so the text can extend outside the button.

Changes to implement (no backend work)
1) Make the Quick Actions layout responsive (stack on small phones)
- File: `src/components/MobileMenu.tsx`
- Change the container from:
  - `grid grid-cols-2 ...`
  to:
  - `grid grid-cols-1 min-[420px]:grid-cols-2 ...`
- This keeps 2 columns on larger phones/tablets, but stacks on narrow devices so the full label can fit without squeezing.

2) Ensure the label can’t overflow even in 2-column mode
- File: `src/components/MobileMenu.tsx`
- For both Quick Action buttons (“Profile” and “History & Achievements”):
  - Wrap the text in a `<span>` with `flex-1 min-w-0 truncate`
  - Keep the icon as-is (it already has `shrink-0` via the Button component’s `[&_svg]:shrink-0`)
- Example structure:
  - `<Button ...>`
    - icon
    - `<span className="flex-1 min-w-0 truncate">...</span>`
    - `</Button>`
- Optionally add `overflow-hidden` to the Button class as extra safety.

3) Verify the History page tabs aren’t the source (already mostly handled)
- File: `src/pages/History.tsx`
- It already uses `min-w-0 overflow-hidden` on `TabsTrigger` + `truncate` on the inner `<span>`.
- After fixing the MobileMenu Quick Actions, re-check the History page on mobile; only adjust further if a separate overflow still exists there.

Acceptance checks (end-to-end)
- On a narrow phone width (e.g., 360–390px):
  - The Quick Actions should stack vertically (Profile on top, History & Achievements below) and text must stay inside the button.
- On wider mobile/tablet:
  - Quick Actions can show in 2 columns, but the “History & Achievements” label should truncate with ellipsis rather than overflow.
- Confirm the tap targets still navigate correctly to `/profile` and `/history`.

Files to change
- `src/components/MobileMenu.tsx` (primary fix)
- `src/pages/History.tsx` (only if we still find a separate overflow after the menu fix)

Potential edge cases
- Non-English languages can be longer/shorter; truncation + responsive stacking prevents breakage.
- Very small devices: stacking plus truncation ensures nothing spills out.
