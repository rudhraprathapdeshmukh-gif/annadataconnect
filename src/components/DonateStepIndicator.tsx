import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DonateStepIndicatorProps {
  currentStep: 1 | 2;
  totalSteps?: number;
}

export function DonateStepIndicator({ currentStep, totalSteps = 2 }: DonateStepIndicatorProps) {
  const steps = [
    { number: 1, label: 'Food Details' },
    { number: 2, label: 'Pickup & Submit' },
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute left-0 top-4 h-0.5 w-full bg-muted" />
        <div 
          className="absolute left-0 top-4 h-0.5 bg-primary transition-all duration-500"
          style={{ width: currentStep === 1 ? '0%' : '100%' }}
        />
        
        {steps.map((step) => (
          <div 
            key={step.number}
            className="flex flex-col items-center relative z-10"
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                currentStep > step.number
                  ? "bg-primary text-primary-foreground"
                  : currentStep === step.number
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span 
              className={cn(
                "text-xs mt-2 font-medium transition-colors",
                currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
