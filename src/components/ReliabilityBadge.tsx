import { getReliabilityTier } from '@/lib/reliabilityScore';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface ReliabilityBadgeProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function ReliabilityBadge({ score, showLabel = true, className = '' }: ReliabilityBadgeProps) {
  const tier = getReliabilityTier(score);
  
  return (
    <Badge 
      variant="outline" 
      className={`${tier.color} ${tier.bgColor} border-current ${className}`}
    >
      <Star className="w-3 h-3 mr-1 fill-current" />
      {showLabel ? `${tier.label} (${Math.round(score)}%)` : `${Math.round(score)}%`}
    </Badge>
  );
}
