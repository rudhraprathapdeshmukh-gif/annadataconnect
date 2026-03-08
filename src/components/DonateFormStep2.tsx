import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, MapPin, Loader2, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
