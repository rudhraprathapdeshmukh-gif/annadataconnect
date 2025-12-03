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
  const [showBadges, setShowBadges] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const impactScore = calculateImpactScore(completedDonations, reliabilityScore, peopleHelped);
  const earnedBadges = getEarnedBadges(completedDonations, reliabilityScore, isTopDonor);
  const nextBadge = getNextBadge(completedDonations);
  
  // Get badge translations
  const getBadgeName = (badgeId: string): string => {
    return t(`achievements.badges.${badgeId}.name`, { defaultValue: IMPACT_BADGES.find(b => b.id === badgeId)?.name });
  };
  
  const getBadgeDescription = (badgeId: string): string => {
    return t(`achievements.badges.${badgeId}.description`, { defaultValue: IMPACT_BADGES.find(b => b.id === badgeId)?.description });
  };
  
  // Animated counter effect
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
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

  // Stagger badge animations
  useEffect(() => {
    const timer = setTimeout(() => setShowBadges(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const BadgeItem = ({ badge, earned, index }: { badge: ImpactBadge; earned: boolean; index: number }) => (
    <Popover>
      <PopoverTrigger asChild>
        <div 
          className={`
            relative flex flex-col items-center p-3 rounded-xl cursor-pointer
            transition-all duration-300 transform
            ${earned 
              ? `${badge.bgColor} animate-badge-pop hover:scale-110` 
              : 'bg-muted/50 opacity-50 grayscale hover:opacity-70'
            }
          `}
          style={{ 
            animationDelay: showBadges ? `${index * 100}ms` : '0ms',
            animationFillMode: 'backwards'
          }}
        >
          <span className={`text-2xl ${earned ? 'animate-wiggle' : ''}`} style={{ animationDelay: `${index * 150}ms` }}>
            {badge.icon}
          </span>
          <span className={`text-xs font-medium mt-1 text-center ${earned ? badge.color : 'text-muted-foreground'}`}>
            {getBadgeName(badge.id)}
          </span>
          {!earned && (
            <div className="absolute -top-1 -right-1 bg-muted rounded-full p-0.5">
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          {earned && (
            <div className="absolute -top-1 -right-1 animate-pulse-glow">
              <Sparkles className="h-3 w-3 text-yellow-500" />
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3">
        <div className="space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <span>{badge.icon}</span> {getBadgeName(badge.id)}
          </p>
          <p className="text-sm text-muted-foreground">{getBadgeDescription(badge.id)}</p>
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
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          {t('achievements.impactScore')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* Animated Score Circle */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-pulse-glow">
              <div className="w-28 h-28 rounded-full bg-card flex flex-col items-center justify-center shadow-inner">
                <span className="text-4xl font-bold text-primary animate-count-up">
                  {animatedScore}
                </span>
                <span className="text-xs text-muted-foreground">{t('achievements.points')}</span>
              </div>
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>

        {/* Badge Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            🏅 {t('achievements.badgesLabel')} ({earnedBadges.length}/{IMPACT_BADGES.length})
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {IMPACT_BADGES.map((badge, index) => (
              <BadgeItem 
                key={badge.id} 
                badge={badge} 
                earned={earnedBadges.some(e => e.id === badge.id)}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Next Badge Progress */}
        {nextBadge && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                <span>{nextBadge.badge.icon}</span>
                {t('achievements.next')} {getBadgeName(nextBadge.badge.id)}
              </span>
              <span className="text-muted-foreground">
                {nextBadge.remaining} {t('achievements.moreToGo')}
              </span>
            </div>
            <Progress value={nextBadge.progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {completedDonations}/{nextBadge.badge.requirement} {t('achievements.donations')}
            </p>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Heart className="h-5 w-5 text-red-500 mb-1" />
            <span className="text-xl font-bold">{completedDonations}</span>
            <span className="text-xs text-muted-foreground text-center">{t('achievements.mealsShared')}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg animate-fade-in" style={{ animationDelay: '400ms' }}>
            <Users className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-xl font-bold">{peopleHelped}</span>
            <span className="text-xs text-muted-foreground text-center">{t('achievements.peopleHelped')}</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg animate-fade-in" style={{ animationDelay: '600ms' }}>
            <TrendingUp className="h-5 w-5 text-green-500 mb-1" />
            <span className="text-xl font-bold">{Math.round(reliabilityScore)}%</span>
            <span className="text-xs text-muted-foreground text-center">{t('achievements.reliability')}</span>
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