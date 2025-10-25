import { useState, useEffect } from 'react';

export function useCountdown(targetDate: Date | null) {
  const [timeRemaining, setTimeRemaining] = useState<{
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ minutes: 0, seconds: 0, expired: true });

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining({ minutes: 0, seconds: 0, expired: true });
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining({ minutes: 0, seconds: 0, expired: true });
        return;
      }

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ minutes, seconds, expired: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeRemaining;
}
