

# Plan: Replace All Hardcoded English with `t()` Calls

## Problem
The translation keys already exist in both `en.json` and `te.json`, but the component files (Help, Terms, Privacy, Auth, DonateStepIndicator) still render hardcoded English strings instead of calling `t('key')`.

## Changes Required

### 1. `src/pages/Help.tsx` (~80 replacements)
Replace every hardcoded string with corresponding `t('help.*')` calls. This includes:
- Page title, section headers, contact text, FAQ questions/answers, user guide steps, technical support content, report section, and footer card
- Use array `.map()` for `faqAnswers` step arrays (e.g., `t('help.faqAnswers.howToDonateSteps', { returnObjects: true })`)

### 2. `src/pages/Terms.tsx` (~30 replacements)
- Add `useTranslation` import
- Replace all section titles, paragraphs, and list items with `t('terms.*')` calls
- Use `t('terms.section3_1Items', { returnObjects: true })` for array content

### 3. `src/pages/Privacy.tsx` (~25 replacements)
- Add `useTranslation` import
- Replace all section titles, paragraphs, and list items with `t('privacy.*')` calls

### 4. `src/pages/Auth.tsx` (~10 replacements)
Remaining hardcoded strings to replace:
- Line 481: `"Password must contain:"` → `t('auth.passwordMustContain')`
- Line 564: `"Max size: 5MB"` → `t('auth.maxSize5MB')`
- Line 603: `"Format: +91 followed by 10 digits"` → `t('auth.phoneFormat')`
- Line 648: `"Password must contain:"` → `t('auth.passwordMustContain')`
- Line 685: `"Choose carefully..."` → `t('auth.chooseCareully')`
- Line 731: `"Only available if you signed up..."` → `t('auth.googleOnlyExisting')`
- Line 764: `"By continuing..."` → uses `t('auth.agreeTerms')`, `t('auth.termsOfService')`, `t('auth.and')`, `t('auth.privacyPolicy')`
- Toast messages in handlers (lines 85, 109, 111, 136, 152, 156, 180, 192, 212, 234, 266-267, 278, 293, 334, 354, 360, 371-381, 385, 388, 391, 400, 402, 407, 413)

### 5. `src/components/DonateStepIndicator.tsx`
- Add `useTranslation` import
- Replace `'Food Details'` and `'Pickup & Submit'` with `t('donate.stepFoodDetails')` and `t('donate.stepPickupSubmit')`
- Add these 2 keys to both JSON files

### 6. `src/i18n/locales/en.json` and `src/i18n/locales/te.json`
- Add 2 new keys for DonateStepIndicator step labels

## Files to Modify
1. `src/pages/Help.tsx` — full i18n replacement
2. `src/pages/Terms.tsx` — full i18n replacement  
3. `src/pages/Privacy.tsx` — full i18n replacement
4. `src/pages/Auth.tsx` — remaining hardcoded strings
5. `src/components/DonateStepIndicator.tsx` — step labels
6. `src/i18n/locales/en.json` — add 2 step label keys
7. `src/i18n/locales/te.json` — add 2 step label keys

