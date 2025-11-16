import { calculateDistance } from './geoUtils';
import { getReliabilityMultiplier } from './reliabilityScore';

/**
 * Calculate dynamic timer duration based on multiple factors
 * 
 * @param donorLat Donor's latitude
 * @param donorLon Donor's longitude
 * @param receiverLat Receiver's latitude (if available)
 * @param receiverLon Receiver's longitude (if available)
 * @param reliabilityScore Receiver's reliability score (0-100)
 * @param averagePickupTime Receiver's average pickup time in minutes (optional)
 * @returns Timer duration in minutes
 */
export function calculateDynamicTimer(
  donorLat: number,
  donorLon: number,
  receiverLat?: number,
  receiverLon?: number,
  reliabilityScore: number = 100,
  averagePickupTime?: number
): { duration: number; breakdown: TimerBreakdown } {
  // Base time: 5 minutes for preparation
  let baseTime = 5;
  
  // Travel time calculation
  let travelTime = 10; // Default 10 minutes if location unknown
  let distance = 0;
  
  if (receiverLat && receiverLon) {
    distance = calculateDistance(donorLat, donorLon, receiverLat, receiverLon);
    
    // Estimate travel time based on distance
    // Assuming average speed: 0-2km = 3min/km, 2-5km = 2.5min/km, 5+km = 2min/km
    if (distance <= 2) {
      travelTime = Math.ceil(distance * 3);
    } else if (distance <= 5) {
      travelTime = Math.ceil(distance * 2.5);
    } else {
      travelTime = Math.ceil(distance * 2);
    }
    
    // Add traffic buffer during rush hours (7-9 AM, 5-7 PM)
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19);
    if (isRushHour) {
      travelTime = Math.ceil(travelTime * 1.3); // +30% for traffic
    }
  }
  
  // Buffer time based on reliability score
  const reliabilityMultiplier = getReliabilityMultiplier(reliabilityScore);
  
  // Historical performance adjustment
  let historicalAdjustment = 0;
  if (averagePickupTime && averagePickupTime > 0) {
    // If user typically takes longer, add buffer
    const expectedTime = baseTime + travelTime;
    historicalAdjustment = Math.max(0, averagePickupTime - expectedTime);
  }
  
  // Calculate total duration
  const rawDuration = baseTime + travelTime + historicalAdjustment;
  const adjustedDuration = Math.ceil(rawDuration * reliabilityMultiplier);
  
  // Enforce minimum 8 minutes, maximum 30 minutes
  const finalDuration = Math.max(8, Math.min(30, adjustedDuration));
  
  return {
    duration: finalDuration,
    breakdown: {
      baseTime,
      travelTime,
      distance,
      reliabilityMultiplier,
      historicalAdjustment,
      finalDuration,
    },
  };
}

export interface TimerBreakdown {
  baseTime: number;
  travelTime: number;
  distance: number;
  reliabilityMultiplier: number;
  historicalAdjustment: number;
  finalDuration: number;
}

/**
 * Calculate expiry time for a request
 */
export function calculateExpiryTime(acceptedAt: Date, timerDuration: number): Date {
  const expiry = new Date(acceptedAt);
  expiry.setMinutes(expiry.getMinutes() + timerDuration);
  return expiry;
}

/**
 * Check if request is in grace period (5 minutes after timer expires)
 */
export function isInGracePeriod(expiryTime: Date): boolean {
  const now = new Date();
  const gracePeriodEnd = new Date(expiryTime);
  gracePeriodEnd.setMinutes(gracePeriodEnd.getMinutes() + 5);
  
  return now > expiryTime && now <= gracePeriodEnd;
}

/**
 * Calculate if warning threshold reached (90% of timer)
 */
export function shouldShowWarning(acceptedAt: Date, timerDuration: number): boolean {
  const now = new Date();
  const elapsed = (now.getTime() - acceptedAt.getTime()) / 1000 / 60; // minutes
  const threshold = timerDuration * 0.9;
  
  return elapsed >= threshold;
}

/**
 * Calculate time remaining percentage
 */
export function getTimeRemainingPercentage(acceptedAt: Date, timerDuration: number): number {
  const now = new Date();
  const elapsed = (now.getTime() - acceptedAt.getTime()) / 1000 / 60; // minutes
  const percentage = ((timerDuration - elapsed) / timerDuration) * 100;
  
  return Math.max(0, Math.min(100, percentage));
}
