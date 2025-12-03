import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ImpactBadge, IMPACT_BADGES } from '@/lib/impactBadges';
import { Heart, Users, TrendingUp, Award } from 'lucide-react';

interface AchievementCertificateProps {
  userName: string;
  completedDonations: number;
  reliabilityScore: number;
  peopleHelped: number;
  earnedBadges: ImpactBadge[];
  impactScore: number;
}

export const AchievementCertificate = forwardRef<HTMLDivElement, AchievementCertificateProps>(
  ({ userName, completedDonations, reliabilityScore, peopleHelped, earnedBadges, impactScore }, ref) => {
    const { t } = useTranslation();
    const issueDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const getBadgeName = (badgeId: string): string => {
      return t(`achievements.badges.${badgeId}.name`, { 
        defaultValue: IMPACT_BADGES.find(b => b.id === badgeId)?.name 
      });
    };

    return (
      <div 
        ref={ref}
        className="w-full max-w-lg mx-auto bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-6 shadow-lg border-4 border-double border-amber-400"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header with decorative border */}
        <div className="text-center border-b-2 border-amber-300 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="h-8 w-8 text-amber-600" />
            <span className="text-2xl font-bold text-amber-800">🍲 Annadataconnect</span>
          </div>
          <h1 className="text-xl font-bold text-amber-900 tracking-wide uppercase">
            {t('achievements.certificateTitle')}
          </h1>
        </div>

        {/* Presented to section */}
        <div className="text-center mb-4">
          <p className="text-sm text-amber-700 mb-1">{t('achievements.issuedTo')}</p>
          <h2 className="text-2xl font-bold text-amber-900 border-b border-amber-300 inline-block px-4 pb-1">
            {userName}
          </h2>
          <p className="text-sm text-amber-700 mt-2 max-w-xs mx-auto">
            {t('achievements.forContributing')}
          </p>
        </div>

        {/* Impact Score Circle */}
        <div className="flex justify-center my-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-amber-900">{impactScore}</span>
              <span className="text-[10px] text-amber-700">{t('achievements.points')}</span>
            </div>
          </div>
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-amber-800 text-center mb-2">
              🏅 {t('achievements.badgesLabel')} ({earnedBadges.length})
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {earnedBadges.map((badge) => (
                <div 
                  key={badge.id}
                  className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-full border border-amber-300"
                >
                  <span className="text-lg">{badge.icon}</span>
                  <span className="text-xs font-medium text-amber-800">{getBadgeName(badge.id)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 bg-amber-100/50 rounded-lg">
            <Heart className="h-4 w-4 text-red-500 mb-1" />
            <span className="text-lg font-bold text-amber-900">{completedDonations}</span>
            <span className="text-[10px] text-amber-700 text-center">{t('achievements.mealsShared')}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-amber-100/50 rounded-lg">
            <Users className="h-4 w-4 text-blue-500 mb-1" />
            <span className="text-lg font-bold text-amber-900">{peopleHelped}</span>
            <span className="text-[10px] text-amber-700 text-center">{t('achievements.peopleHelped')}</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-amber-100/50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-500 mb-1" />
            <span className="text-lg font-bold text-amber-900">{Math.round(reliabilityScore)}%</span>
            <span className="text-[10px] text-amber-700 text-center">{t('achievements.reliability')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-amber-300 pt-3">
          <p className="text-xs text-amber-600">
            {t('achievements.issuedOn')}: {issueDate}
          </p>
          <p className="text-xs text-amber-500 mt-1">
            {t('achievements.poweredBy')}
          </p>
        </div>
      </div>
    );
  }
);

AchievementCertificate.displayName = 'AchievementCertificate';
