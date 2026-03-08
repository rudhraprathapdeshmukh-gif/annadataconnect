

# Plan: Add Hindi Language Support

## Summary
Create a Hindi locale file (`hi.json`) with all ~837 lines translated, and register it in the i18n config and language selectors.

## Changes

### 1. Create `src/i18n/locales/hi.json`
- Copy the full structure from `en.json` (837 lines) and translate all values to Hindi
- This is the bulk of the work — covers nav, auth, dashboard, donate, history, profile, help, terms, privacy, and all dynamic content keys

### 2. Register Hindi in `src/i18n/index.ts`
- Import `hi` from `./locales/hi.json`
- Add `hi: { translation: hi }` to the resources object

### 3. Add Hindi to language selectors (2 files)
- **`src/components/Navbar.tsx`** line 37-40: Add `{ value: 'hi', label: 'हि' }` to `LANGUAGES` array
- **`src/components/MobileMenu.tsx`** line 23-26: Same addition

### 4. Update `src/contexts/LanguageContext.tsx`
- No changes needed — it's already generic (reads/writes any language string)

## Files to Create/Modify
1. **Create** `src/i18n/locales/hi.json` — full Hindi translation (~837 lines)
2. **Edit** `src/i18n/index.ts` — import and register Hindi
3. **Edit** `src/components/Navbar.tsx` — add Hindi to LANGUAGES array
4. **Edit** `src/components/MobileMenu.tsx` — add Hindi to LANGUAGES array

