

# Fix Item Card Layout: Food Type, Expiry, and Rating Visibility

## Problem
From the screenshots, the item detail cards in Available Donations, My Requests, and DonorRequestCard have these issues:
1. **Food type not visible** — `truncate` class causes food type text to collapse to zero width on mobile when quantity + diet type take up space
2. **Expiry time congested** — displayed on its own line but still feels cramped
3. **Rating not visible** — rating stars placed as a right-aligned flex sibling get squeezed off-screen on narrow viewports

## Solution
Restructure the item card layout across all 4 locations to use a clearer vertical stack:
- **Row 1**: Title (left) + Rating stars with freshness label (right) — always visible
- **Row 2**: Quantity, food type, and diet type as `flex-wrap` tags so they wrap gracefully instead of truncating
- **Row 3**: Expiry date/time with proper spacing

## Files to Change

### 1. `src/pages/Dashboard.tsx` (3 locations)
- **Available Donations items** (~lines 1206-1240): Restructure item card
- **My Donations / DonorRequestCard items** (~lines 1656-1690): Same restructure  
- **DonorRequestCard items** (~lines 2092-2126): Same restructure

### 2. `src/components/RequestCard.tsx` (1 location)
- **My Requests items** (~lines 321-355): Same restructure

### Layout Change (applied consistently everywhere)
```
Before (single flex row, truncation hides content):
  [img] [title]                    
        [qty • foodtype • diet]  [★★★★★ / Just-Made]
        [expiry]

After (clear vertical stack, wrap-friendly):
  [img] [title]              [★★★★★]
        [qty • foodtype • diet]  [Just-Made]
        [🕐 17/03/2026, 1:15 PM]
```

Key CSS changes per item card:
- Move rating from a separate flex column into the title row as inline elements
- Change metadata row from `flex items-center` with `truncate` to `flex flex-wrap` so food type and diet type wrap instead of disappearing
- Keep expiry on its own line with consistent small text

