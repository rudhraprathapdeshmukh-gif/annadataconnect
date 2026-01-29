export interface ImpactBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  requirement: number;
  type: 'donations' | 'reliability' | 'special';
}

export const IMPACT_BADGES: ImpactBadge[] = [
  // Donation milestones
  { 
    id: 'first_meal', 
    name: 'First Meal', 
    description: 'Donated your first meal!', 
    icon: '🎉', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30', 
    requirement: 1, 
    type: 'donations' 
  },
  { 
    id: 'rising_star', 
    name: 'Rising Star', 
    description: 'Donated 5 meals', 
    icon: '🌟', 
    color: 'text-yellow-600 dark:text-yellow-400', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', 
    requirement: 5, 
    type: 'donations' 
  },
  { 
    id: 'community_champion', 
    name: 'Community Champion', 
    description: 'Donated 10 meals', 
    icon: '🏆', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/30', 
    requirement: 10, 
    type: 'donations' 
  },
  { 
    id: 'food_hero', 
    name: 'Food Hero', 
    description: 'Donated 25 meals', 
    icon: '💎', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    requirement: 25, 
    type: 'donations' 
  },
  { 
    id: 'hunger_fighter', 
    name: 'Hunger Fighter', 
    description: 'Donated 50 meals', 
    icon: '👑', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30', 
    requirement: 50, 
    type: 'donations' 
  },
  { 
    id: 'legendary_giver', 
    name: 'Legendary Giver', 
    description: 'Donated 100 meals', 
    icon: '🔥', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    requirement: 100, 
    type: 'donations' 
  },
  // Reliability badges
  { 
    id: 'perfect_score', 
    name: 'Perfect Score', 
    description: '100% reliability rating', 
    icon: '🎯', 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', 
    requirement: 100, 
    type: 'reliability' 
  },
  // Special badges
  { 
    id: 'top_donor', 
    name: 'Top Donor', 
    description: 'In the top 10% of donors', 
    icon: '⭐', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30', 
    requirement: 50, 
    type: 'special' 
  },
];

export function getEarnedBadges(
  completedDonations: number, 
  reliabilityScore: number,
  isTopDonor: boolean = false
): ImpactBadge[] {
  // Don't show any donation badges if no donations yet
  if (completedDonations === 0) {
    // Only check reliability badges (if applicable with score threshold)
    return IMPACT_BADGES.filter(badge => {
      if (badge.type === 'reliability') {
        return reliabilityScore >= badge.requirement && completedDonations > 0;
      }
      return false;
    });
  }
  
  return IMPACT_BADGES.filter(badge => {
    if (badge.type === 'donations') {
      return completedDonations >= badge.requirement;
    }
    if (badge.type === 'reliability') {
      // Only show reliability badge if user has made donations
      return reliabilityScore >= badge.requirement && completedDonations > 0;
    }
    if (badge.type === 'special' && badge.id === 'top_donor') {
      return isTopDonor && completedDonations > 0;
    }
    return false;
  });
}

export function calculateImpactScore(
  completedDonations: number, 
  reliabilityScore: number,
  peopleHelped: number
): number {
  // If no donations, return 0 score
  if (completedDonations === 0) {
    return 0;
  }
  
  // Base score from donations (50 points per donation, max 500)
  const donationScore = Math.min(completedDonations * 50, 500);
  
  // Reliability bonus (up to 200 points) - only counts if has donations
  const reliabilityBonus = (reliabilityScore / 100) * 200;
  
  // People helped bonus (25 points per person, max 300)
  const helpedBonus = Math.min(peopleHelped * 25, 300);
  
  return Math.round(donationScore + reliabilityBonus + helpedBonus);
}

export function getNextBadge(completedDonations: number): { badge: ImpactBadge; progress: number; remaining: number } | null {
  const donationBadges = IMPACT_BADGES.filter(b => b.type === 'donations')
    .sort((a, b) => a.requirement - b.requirement);
  
  const nextBadge = donationBadges.find(badge => completedDonations < badge.requirement);
  
  if (!nextBadge) return null;
  
  const previousBadge = donationBadges.find(b => b.requirement <= completedDonations);
  const startPoint = previousBadge ? previousBadge.requirement : 0;
  const progress = ((completedDonations - startPoint) / (nextBadge.requirement - startPoint)) * 100;
  
  return {
    badge: nextBadge,
    progress: Math.min(progress, 100),
    remaining: nextBadge.requirement - completedDonations
  };
}

export function getCurrentLevel(completedDonations: number): ImpactBadge | null {
  const donationBadges = IMPACT_BADGES.filter(b => b.type === 'donations')
    .sort((a, b) => b.requirement - a.requirement);
  
  return donationBadges.find(badge => completedDonations >= badge.requirement) || null;
}
