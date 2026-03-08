import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Clock, ShieldCheck, MapPin, Loader2, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';

interface SharedData {
  phone_number: string;
  city: string;
  area: string;
  complete_address: string;
}

interface DonateFormStep2Props {
  sharedData: SharedData;
  setSharedData: React.Dispatch<React.SetStateAction<SharedData>>;
  itemFoodTypes: string[];
  expiryDate: Date | undefined;
  setExpiryDate: (date: Date | undefined) => void;
  hour12: string;
  setHour12: (hour: string) => void;
  minute: string;
  setMinute: (minute: string) => void;
  ampm: string;
  setAmpm: (ampm: string) => void;
  safetyConfirmed: boolean;
  setSafetyConfirmed: (confirmed: boolean) => void;
  loadingLocation: boolean;
  onUseCurrentLocation: () => void;
  locationDetected: boolean;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function DonateFormStep2({
  sharedData,
  setSharedData,
  itemFoodTypes,
  expiryDate,
  setExpiryDate,
  hour12,
  setHour12,
  minute,
  setMinute,
  ampm,
  setAmpm,
  safetyConfirmed,
  setSafetyConfirmed,
  loadingLocation,
  onUseCurrentLocation,
  locationDetected,
  submitting,
  onBack,
  onSubmit,
}: DonateFormStep2Props) {
  const { t } = useTranslation();

  // Determine the most restrictive expiry based on ALL item food types
  const hasPreparedFood = itemFoodTypes.includes('Prepared Food');
  const hasVegetableOrFruit = itemFoodTypes.includes('Vegetables') || itemFoodTypes.includes('Fruits');
  const hasDairy = itemFoodTypes.includes('Dairy');
  const hasBakery = itemFoodTypes.includes('Bakery Products');
  const hasGrains = itemFoodTypes.includes('Grains');

  const getDateConstraints = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use the most restrictive constraint across all items
    if (hasPreparedFood || hasDairy || hasBakery) {
      return { min: today, max: addDays(today, 2) };
    } else if (hasVegetableOrFruit) {
      return { min: today, max: addDays(today, 4) };
    } else if (hasGrains) {
      return { min: today, max: addMonths(today, 5) };
    }
    return { min: today, max: addYears(today, 2) };
  };

  const constraints = getDateConstraints();

  const getDateHelpText = () => {
    const types: string[] = [];
    if (hasPreparedFood) types.push('Prepared Food');
    if (hasDairy) types.push('Dairy');
    if (hasBakery) types.push('Bakery');
    if (hasVegetableOrFruit) types.push('Vegetables/Fruits');
    if (hasGrains) types.push('Grains');

    if (hasPreparedFood || hasDairy || hasBakery) {
      return `Most perishable item limits expiry to 2 days (${types.join(', ')})`;
    }
    if (hasVegetableOrFruit) return 'Vegetables/Fruits: Expiry within 4 days';
    if (hasGrains) return 'Grains: Expiry within 5 months';
    return 'Select expiry date (up to 2 years)';
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Date & Time Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">
            Approx Expiry Date & Time *
          </Label>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full h-12 justify-start text-left font-normal",
                !expiryDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={expiryDate}
              onSelect={setExpiryDate}
              disabled={(date) => date < constraints.min || date > constraints.max}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Time Picker */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="grid grid-cols-3 gap-2 flex-1">
            <Select value={hour12} onValueChange={setHour12}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {String(hour).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={minute} onValueChange={setMinute}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent>
                {['00', '15', '30', '45'].map((min) => (
                  <SelectItem key={min} value={min}>
                    {min}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={ampm} onValueChange={setAmpm}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="AM/PM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{getDateHelpText()}</p>
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phone_number" className="text-base font-semibold">Contact Phone Number *</Label>
        <Input
          id="phone_number"
          type="tel"
          value={sharedData.phone_number}
          onChange={(e) => setSharedData(prev => ({ ...prev, phone_number: e.target.value }))}
          placeholder="10-digit mobile number"
          className="h-12"
          maxLength={10}
        />
      </div>

      {/* Location Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Pickup Location *</Label>
        </div>

        {locationDetected ? (
          <div className="bg-muted/50 p-4 rounded-xl border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Location Detected</span>
            </div>
            <p className="text-sm text-foreground">
              {sharedData.complete_address || `${sharedData.area}, ${sharedData.city}`}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onUseCurrentLocation}
              disabled={loadingLocation}
              className="text-xs text-muted-foreground px-0 h-auto"
            >
              {loadingLocation ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <MapPin className="mr-1 h-3 w-3" />
              )}
              Re-detect Location
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={onUseCurrentLocation}
              disabled={loadingLocation}
              className="w-full h-12"
            >
              {loadingLocation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              {loadingLocation ? 'Detecting Location...' : 'Use Current Location'}
            </Button>
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Current location is required for pickup. Please allow location access when prompted.</span>
            </div>
          </div>
        )}
      </div>

      {/* Safety Confirmation */}
      <div className="bg-muted/50 p-4 rounded-xl border">
        <div className="flex items-start gap-3">
          <Checkbox
            id="safety"
            checked={safetyConfirmed}
            onCheckedChange={(checked) => setSafetyConfirmed(checked as boolean)}
            className="mt-1 h-5 w-5"
          />
          <div className="flex-1">
            <Label 
              htmlFor="safety" 
              className="text-sm leading-relaxed cursor-pointer flex items-start gap-2"
            >
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span>
                I confirm this food is <strong>safe to consume</strong>, properly stored, and suitable for donation. 
                I understand that food safety is my responsibility.
              </span>
            </Label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1 h-12"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={submitting || !safetyConfirmed || !locationDetected}
          className="flex-[2] h-12 text-base font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Donation'
          )}
        </Button>
      </div>
    </form>
  );
}
