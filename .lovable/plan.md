

# Fix: Mobile Pop-Up Notifications Not Visible

## Root Cause

The Sonner toast component (`<Sonner />` in App.tsx) is rendering with default settings that cause issues on mobile:

1. **No z-index override**: The toasts render behind the sticky navbar (`z-50`) and other modal/dialog elements on mobile
2. **Default position (`bottom-right`)**: On mobile browsers, this position can be obscured by the browser's bottom navigation bar or other UI elements
3. **No `richColors` or `expand`**: Toasts appear too subtle on small screens and may be missed

The notifications ARE being received (they show in the bell icon because the Realtime subscription and state updates work). The `toast.info()` call in `useNotifications.ts` IS firing, but the visual toast is hidden behind other elements on mobile.

## Fix

Update `src/components/ui/sonner.tsx` to:

1. Set `position="top-center"` -- most visible on mobile, not obscured by bottom bars
2. Add `richColors` for better visibility
3. Add `expand={true}` so toasts are always expanded on mobile
4. Set a high z-index via `style` to ensure toasts render above the sticky navbar and any modals

### Changes to `src/components/ui/sonner.tsx`

```tsx
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors
      expand
      style={{ zIndex: 9999 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};
```

## Summary

| File | Change |
|------|--------|
| `src/components/ui/sonner.tsx` | Add `position="top-center"`, `richColors`, `expand`, and `style={{ zIndex: 9999 }}` to ensure toasts are always visible on mobile |

This is a single-file fix. No backend or database changes needed -- the notification insertion and Realtime subscription are working correctly (proven by the bell icon updating). The issue is purely the toast visibility on mobile.

