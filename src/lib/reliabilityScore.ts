/**
 * Reliability tiers based on score
 */
export const RELIABILITY_TIERS = {
  EXCELLENT: { min: 85, label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' },
  GOOD: { min: 70, label: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FAIR: { min: 50, label: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  POOR: { min: 0, label: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100' },
} as const;

/**
 * Get reliability tier based on score
 */
export function getReliabilityTier(score: number) {
  if (score >= RELIABILITY_TIERS.EXCELLENT.min) return RELIABILITY_TIERS.EXCELLENT;
  if (score >= RELIABILITY_TIERS.GOOD.min) return RELIABILITY_TIERS.GOOD;
  if (score >= RELIABILITY_TIERS.FAIR.min) return RELIABILITY_TIERS.FAIR;
  return RELIABILITY_TIERS.POOR;
}

/**
 * Calculate new reliability score based on pickup outcome
 * Uses exponential moving average for recent behavior weighting
 * 
 * @param currentScore Current reliability score (0-100)
 * @param outcome 'on_time' | 'late' | 'no_show'
 * @param totalPickups Total number of pickups completed
 * @returns New reliability score
 */
export function calculateNewReliabilityScore(
  currentScore: number,
  outcome: 'on_time' | 'late' | 'no_show',
  totalPickups: number
): number {
  // Define impact weights
  const weights = {
    on_time: 5,    // +5 points for on-time pickup
    late: -3,      // -3 points for late pickup
    no_show: -15,  // -15 points for no-show (severe penalty)
  };

  // Calculate smoothing factor (more weight to recent behavior for new users)
  const alpha = Math.min(0.3, 2 / (totalPickups + 1));
  
  // Calculate new score using exponential moving average
  const impact = weights[outcome];
  const rawNewScore = currentScore + impact * alpha * 100;
  
  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, rawNewScore));
}

/**
 * Get reliability score multiplier for timer calculation
 * Higher reliability = longer timer allowance
 */
export function getReliabilityMultiplier(score: number): number {
  if (score >= 85) return 1.2;  // Excellent: +20% time
  if (score >= 70) return 1.0;  // Good: standard time
  if (score >= 50) return 0.85; // Fair: -15% time
  return 0.7;                   // Poor: -30% time
}

/**
 * Check if user should be temporarily blocked from requesting
 */
export function shouldBlockUser(noShowCount: number, totalPickups: number): boolean {
  // Block if 3+ no-shows in last 10 requests
  if (totalPickups >= 10 && noShowCount >= 3) {
    const noShowRate = noShowCount / totalPickups;
    return noShowRate >= 0.3; // 30% no-show rate
  }
  
  // Block if 2 consecutive no-shows (for new users)
  return noShowCount >= 2 && totalPickups < 5;
}
