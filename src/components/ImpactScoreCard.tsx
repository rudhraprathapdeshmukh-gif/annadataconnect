import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  ImpactBadge, 
  IMPACT_BADGES, 
  getEarnedBadges, 
  calculateImpactScore, 
  getNextBadge 
} from '@/lib/impactBadges';
import { Heart, Users, TrendingUp, Lock, Sparkles, Share2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ShareAchievementsDialog } from './ShareAchievementsDialog';

interface ImpactScoreCardProps {
  completedDonations: number;
  reliabilityScore: number;
  peopleHelped: number;
  isTopDonor?: boolean;
  userName?: string;
}

export function ImpactScoreCard({ 
  completedDonations, 
  reliabilityScore, 
  peopleHelped,
  isTopDonor = false,
  userName = 'Donor'
}: ImpactScoreCardProps) {
  const { t } = useTranslation();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const impactScore = calculateImpactScore(completedDonations, reliabilityScore, peopleHelped);
  const earnedBadges = getEarnedBadges(completedDonations, reliabilityScore, isTopDonor);
  const nextBadge = getNextBadge(completedDonations);
  
  const getBadgeName = (badgeId: string): string => {
    return t(`achievements.badges.${badgeId}.name`, { defaultValue: IMPACT_BADGES.find(b => b.id === badgeId)?.name });
  };
  
  const getBadgeDescription = (badgeId: string): string => {
    return t(`achievements.badges.${badgeId}.description`, { defaultValue: IMPACT_BADGES.find(b => b.id === badgeId)?.description });
  };
  
  useEffect(() => {
    const duration = 1000;
    const steps = 40;
    const increment = impactScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= impactScore) {
        setAnimatedScore(impactScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [impactScore]);

  const BadgeItem = ({ badge, earned }: { badge: ImpactBadge; earned: boolean }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`
            relative flex flex-col items-center p-1.5 sm:p-2 md:p-3 rounded-xl cursor-pointer
            transition-all duration-200 min-w-0
            ${earned 
              ? `${badge.bgColor} hover:scale-105` 
              : 'bg-muted/30 opacity-60 grayscale'
            }
          `}
        >
          <span className="text-lg sm:text-xl md:text-2xl">{badge.icon}</span>
          <span className={`text-[9px] sm:text-[10px] md:text-xs font-medium mt-0.5 sm:mt-1 text-center leading-tight truncate w-full px-0.5 ${earned ? badge.color : 'text-muted-foreground'}`}>
            {getBadgeName(badge.id)}
          </span>
          {!earned && (
            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-muted rounded-full p-0.5">
              <Lock className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-3">
        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2 text-sm">
            <span>{badge.icon}</span> {getBadgeName(badge.id)}
          </p>
          <p className="text-xs text-muted-foreground">{getBadgeDescription(badge.id)}</p>
          {!earned && (
            <p className="text-xs text-primary font-medium mt-2">
              {badge.type === 'donations' && t('achievements.needDonations', { count: badge.requirement })}
              {badge.type === 'reliability' && t('achievements.needReliability', { percent: badge.requirement })}
              {badge.type === 'special' && t('achievements.topDonorRequirement')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('achievements.impactScore')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-5">
        {/* Score Circle */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-card flex flex-col items-center justify-center shadow-inner">
                <span className="text-3xl md:text-4xl font-bold text-primary">
                  {animatedScore}
                </span>
                <span className="text-xs text-muted-foreground">{t('achievements.points')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Grid - 3 columns on mobile, 4 on larger */}
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            🏅 {t('achievements.badgesLabel')} ({earnedBadges.length}/{IMPACT_BADGES.length})
          </h4>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
            {IMPACT_BADGES.map((badge) => (
              <BadgeItem 
                key={badge.id} 
                badge={badge} 
                earned={earnedBadges.some(e => e.id === badge.id)}
              />
            ))}
          </div>
        </div>

        {/* Next Badge Progress */}
        {nextBadge && (
          <div className="space-y-2 p-2 sm:p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
              <span className="font-medium flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                <span className="shrink-0">{nextBadge.badge.icon}</span>
                <span className="truncate">{t('achievements.next')} {getBadgeName(nextBadge.badge.id)}</span>
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {nextBadge.remaining} {t('achievements.moreToGo')}
              </span>
            </div>
            <Progress value={nextBadge.progress} className="h-1.5 sm:h-2" />
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              {completedDonations}/{nextBadge.badge.requirement} {t('achievements.donations')}
            </p>
          </div>
        )}

        {/* Stats Summary - Responsive grid */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="flex flex-col items-center p-2 sm:p-3 bg-muted/30 rounded-lg">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 mb-0.5 sm:mb-1" />
            <span className="text-base sm:text-lg font-bold">{completedDonations}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center leading-tight">{t('achievements.mealsShared')}</span>
          </div>
          <div className="flex flex-col items-center p-2 sm:p-3 bg-muted/30 rounded-lg">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mb-0.5 sm:mb-1" />
            <span className="text-base sm:text-lg font-bold">{peopleHelped}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center leading-tight">{t('achievements.peopleHelped')}</span>
          </div>
          <div className="flex flex-col items-center p-2 sm:p-3 bg-muted/30 rounded-lg">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 mb-0.5 sm:mb-1" />
            <span className="text-base sm:text-lg font-bold">{Math.round(reliabilityScore)}%</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center leading-tight">{t('achievements.reliability')}</span>
          </div>
        </div>

        {/* Share Button */}
        {earnedBadges.length > 0 && (
          <Button 
            onClick={() => setShowShareDialog(true)}
            variant="outline"
            className="w-full gap-2"
          >
            <Share2 className="h-4 w-4" />
            {t('achievements.shareAchievements')}
          </Button>
        )}

        {/* Share Dialog */}
        <ShareAchievementsDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          userName={userName}
          completedDonations={completedDonations}
          reliabilityScore={reliabilityScore}
          peopleHelped={peopleHelped}
          earnedBadges={earnedBadges}
          impactScore={impactScore}
        />
      </CardContent>
    </Card>
  );
}
