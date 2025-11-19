import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { getTimeRemainingPercentage, shouldShowWarning } from '@/lib/timerCalculations';

interface TimerProgressBarProps {
  acceptedAt: Date;
  timerDuration: number;
  onWarningThreshold?: () => void;
}

export function TimerProgressBar({ 
  acceptedAt, 
  timerDuration, 
  onWarningThreshold 
}: TimerProgressBarProps) {
  const [percentage, setPercentage] = useState(100);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const updateProgress = () => {
      const newPercentage = getTimeRemainingPercentage(acceptedAt, timerDuration);
      setPercentage(newPercentage);
      
      const warning = shouldShowWarning(acceptedAt, timerDuration);
      if (warning && !showWarning) {
        setShowWarning(true);
        onWarningThreshold?.();
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [acceptedAt, timerDuration, showWarning, onWarningThreshold]);

  const getProgressColor = () => {
    if (percentage > 50) return 'bg-primary';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {showWarning ? (
            <AlertTriangle className="w-4 h-4 text-yellow-600 animate-pulse" />
          ) : (
            <Clock className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={showWarning ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}>
            {showWarning ? 'Hurry up!' : 'Time remaining'}
          </span>
        </div>
        <span className="font-medium">
          {(() => {
            const remainingMinutes = Math.max(0, Math.ceil(percentage * timerDuration / 100));
            const hours = Math.floor(remainingMinutes / 60);
            const mins = remainingMinutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
          })()}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div 
          className={`h-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
