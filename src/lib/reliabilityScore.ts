/**
 * Reliability Score - Multi-Factor Calculation
 * 
 * Factors:
 * 1. Donor Ratings (40%) - Average receiver ratings mapped to 0-100
 * 2. Pickup Punctuality (25%) - On-time pickups / total pickups
 * 3. Completion Rate (25%) - Completed requests / total resolved requests
 * 4. No-Show Penalty (10%) - Penalizes no-show behavior
 * 
 * The actual score is calculated server-side via a DB trigger.
 * This file provides tiers, display logic, and client-side utilities.
 */

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
  const weights = {
    on_time: 5,
    late: -3,
    no_show: -15,
  };

  const alpha = Math.min(0.3, 2 / (totalPickups + 1));
  const impact = weights[outcome];
  const rawNewScore = currentScore + impact * alpha * 100;
  
  return Math.max(0, Math.min(100, rawNewScore));
}

/**
 * Get reliability score multiplier for timer calculation
 * Higher reliability = longer timer allowance
 */
export function getReliabilityMultiplier(score: number): number {
  if (score >= 85) return 1.2;
  if (score >= 70) return 1.0;
  if (score >= 50) return 0.85;
  return 0.7;
}

/**
 * Check if user should be temporarily blocked from requesting
 */
export function shouldBlockUser(noShowCount: number, totalPickups: number): boolean {
  if (totalPickups >= 10 && noShowCount >= 3) {
    const noShowRate = noShowCount / totalPickups;
    return noShowRate >= 0.3;
  }
  return noShowCount >= 2 && totalPickups < 5;
}
