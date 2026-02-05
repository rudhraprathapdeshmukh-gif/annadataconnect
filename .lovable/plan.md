
# Plan: Change Quantity Field to Dropdown with Manual Entry Option

## Overview
Replace the current text input for quantity with a dropdown select that offers preset values (1-9) plus a "Custom" option that allows users to enter any number up to 99.

## Current State
- Simple text input field for quantity
- Users can type any value freely
- No validation for maximum value

## Implementation

### File: `src/components/DonateFormStep1.tsx`

**Change the quantity input section (lines 143-150)**

Replace the current `<Input>` with a hybrid approach:
1. A `<Select>` dropdown with options 1-9 plus "Custom..."
2. When "Custom" is selected, show an input field for manual entry (1-99)

**New Logic:**
```tsx
// Add state to track if custom mode is active
const [isCustomQuantity, setIsCustomQuantity] = useState(false);

// Check if current value is a preset (1-9) or custom
useEffect(() => {
  const num = parseInt(formData.quantity);
  setIsCustomQuantity(num > 9 || isNaN(num) || formData.quantity === '');
}, []);
```

**New UI Structure:**
```tsx
{/* Quantity */}
<div className="space-y-2">
  <Label className="text-base font-semibold">Quantity *</Label>
  <div className="flex gap-2">
    {isCustomQuantity ? (
      <div className="flex-1 flex gap-2">
        <Input
          type="number"
          min="1"
          max="99"
          value={formData.quantity}
          onChange={(e) => {
            const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 0));
            setFormData({ ...formData, quantity: val.toString() });
          }}
          className="flex-1 h-12"
        />
        <Button variant="outline" onClick={() => {
          setIsCustomQuantity(false);
          setFormData({ ...formData, quantity: '1' });
        }}>
          Presets
        </Button>
      </div>
    ) : (
      <Select
        value={formData.quantity}
        onValueChange={(value) => {
          if (value === 'custom') {
            setIsCustomQuantity(true);
            setFormData({ ...formData, quantity: '' });
          } else {
            setFormData({ ...formData, quantity: value });
          }
        }}
      >
        <SelectTrigger className="flex-1 h-12">
          <SelectValue placeholder="Select quantity" />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
          ))}
          <SelectItem value="custom">Custom (10-99)...</SelectItem>
        </SelectContent>
      </Select>
    )}
    {/* Unit selector remains unchanged */}
    <Select ... />
  </div>
</div>
```

## Result
- Users see a clean dropdown with options 1-9
- Selecting "Custom (10-99)..." switches to an input field
- Input field is limited to numbers 1-99
- "Presets" button returns to dropdown mode
- Works on both mobile and desktop
