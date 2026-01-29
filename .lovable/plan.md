
# Plan: Mobile Accessibility & Layout Fixes

## Problem Analysis

After exploring the codebase, I've identified several mobile UX issues:

### 1. **Index Page (Home)**
- Hero text `text-5xl` is too large for mobile screens causing text overflow
- Welcome message with user name can overflow on smaller screens  
- Container padding `px-4` combined with large text causes congestion
- Floating food icons create visual clutter on mobile

### 2. **Dashboard Page**
- Welcome message can overflow with long names
- Cards don't adapt well to narrow screens
- Tab triggers may overflow horizontally

### 3. **Donate Form**
- Form is well-structured but some text labels overflow
- Date/Time picker area feels cramped
- Button text can overflow on narrow screens

### 4. **History Page**  
- Stats cards `grid-cols-3` can feel cramped on very small screens
- Tab labels may truncate poorly
- Card content text can overflow containers

### 5. **ImpactScoreCard (Achievements)**
- Badge grid works well but badge names may truncate
- Horizontal scrollable stats work but may not be obvious

### 6. **Global Issues**
- Container has `padding: 2rem` which is too much on mobile
- Some fixed widths cause overflow
- Font sizes don't scale appropriately for mobile

---

## Implementation Plan

### Phase 1: Global Mobile Improvements

**File: `src/index.css`**
- Reduce container padding on mobile using responsive utilities
- Add text wrapping utilities
- Improve touch target visibility

**File: `tailwind.config.ts`**  
- Adjust container padding to be responsive (`padding: { DEFAULT: '1rem', md: '2rem' }`)

---

### Phase 2: Index Page Mobile Fixes

**File: `src/pages/Index.tsx`**

Changes:
1. **Hero Section**
   - Reduce heading size: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl`
   - Add `break-words` to prevent text overflow
   - Hide floating food icons on mobile (`hidden sm:block`)
   - Reduce section padding on mobile: `py-12 md:py-20 lg:py-28`

2. **Welcome Message (logged in)**
   - Truncate long names or use smaller text on mobile
   - Use `text-2xl sm:text-4xl md:text-5xl` for name

3. **Active Donations Grid**
   - Ensure cards scale properly
   - Add `min-w-0` to prevent text overflow in flex containers
   - Truncate location text with `line-clamp-2`

4. **Features Section**
   - Reduce card padding on mobile
   - Stack cards properly with appropriate gaps

5. **Footer**
   - Hide bullet separators on mobile, use vertical layout instead

---

### Phase 3: Dashboard Mobile Fixes

**File: `src/pages/Dashboard.tsx`**

Changes:
1. **Header Section**
   - Already has some mobile fixes, add `min-w-0` for flex children
   - Ensure welcome text wraps properly with `break-words`

2. **Tabs**
   - Make tabs scrollable horizontally if needed
   - Reduce tab text size on mobile

3. **Cards**
   - Add proper text truncation
   - Ensure images don't push content out

---

### Phase 4: Donate Form Mobile Fixes

**File: `src/components/DonateFormStep1.tsx`**
- Already well-designed, minor spacing adjustments

**File: `src/components/DonateFormStep2.tsx`**
- Reduce time picker width on mobile
- Improve grid layout for location fields

**File: `src/pages/Donate.tsx`**
- Reduce container max-width slightly for more breathing room

---

### Phase 5: History Page Mobile Fixes

**File: `src/pages/History.tsx`**

Changes:
1. **Stats Grid**
   - Use `grid-cols-3` but with smaller padding on mobile
   - Reduce font sizes for very small screens

2. **Tabs**
   - Add horizontal scroll overflow if needed
   - Use icons only on very small screens

3. **Cards**
   - Already using good layout with image + content side by side
   - Ensure text truncation works properly

---

### Phase 6: Impact Score Card Mobile Fixes

**File: `src/components/ImpactScoreCard.tsx`**

Changes:
1. **Badge Grid** (already 3 cols on mobile - good)
   - Reduce badge name text size slightly
   - Ensure proper wrapping

2. **Progress Section**
   - Already responsive

3. **Stats Row**
   - Already uses horizontal scroll - good

---

## Technical Changes Summary

| File | Changes |
|------|---------|
| `tailwind.config.ts` | Responsive container padding |
| `src/index.css` | Mobile utility classes, reduced base spacing |
| `src/pages/Index.tsx` | Responsive text sizes, hide decorative elements on mobile, text wrapping |
| `src/pages/Dashboard.tsx` | Text truncation, min-width fixes, responsive padding |
| `src/pages/Donate.tsx` | Container width adjustments |
| `src/components/DonateFormStep2.tsx` | Time picker grid improvements |
| `src/pages/History.tsx` | Stats grid spacing, tab overflow handling |
| `src/components/ImpactScoreCard.tsx` | Minor text size adjustments |
| `src/components/Navbar.tsx` | Minor spacing tweaks if needed |

---

## Key Improvements

1. **Text Overflow Prevention**
   - Add `break-words`, `truncate`, `line-clamp-*` where needed
   - Use `min-w-0` in flex containers to allow shrinking

2. **Responsive Typography**
   - Scale down heading sizes significantly for mobile
   - Use `text-sm` base with `md:text-base` for body text

3. **Reduced Congestion**
   - Less padding on mobile (`p-3` instead of `p-4`)
   - Hide decorative elements (floating icons, background blobs)
   - Simpler layouts with more whitespace

4. **Better Touch Targets**
   - Ensure buttons and interactive elements are at least 44px
   - Add padding to clickable areas

5. **Horizontal Scroll Prevention**
   - Use `overflow-hidden` on containers
   - Truncate long text
   - Use flexible widths instead of fixed
