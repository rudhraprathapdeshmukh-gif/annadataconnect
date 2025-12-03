import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toPng } from 'html-to-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AchievementCertificate } from './AchievementCertificate';
import { ImpactBadge } from '@/lib/impactBadges';
import { 
  shareToWhatsApp, 
  shareToTwitter, 
  shareToFacebook, 
  shareToLinkedIn, 
  copyToClipboard,
  canUseWebShare,
  useWebShare
} from '@/lib/socialShare';
import { toast } from 'sonner';
import { Download, Share2, Copy, Loader2 } from 'lucide-react';

interface ShareAchievementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  completedDonations: number;
  reliabilityScore: number;
  peopleHelped: number;
  earnedBadges: ImpactBadge[];
  impactScore: number;
}

export function ShareAchievementsDialog({
  open,
  onOpenChange,
  userName,
  completedDonations,
  reliabilityScore,
  peopleHelped,
  earnedBadges,
  impactScore
}: ShareAchievementsDialogProps) {
  const { t } = useTranslation();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const appUrl = window.location.origin;
  const highestBadge = earnedBadges[earnedBadges.length - 1];
  const badgeName = highestBadge 
    ? t(`achievements.badges.${highestBadge.id}.name`, { defaultValue: highestBadge.name })
    : '';

  const shareMessage = t('achievements.shareMessage', {
    badge: badgeName,
    meals: completedDonations,
    people: peopleHelped
  });

  const generateImage = async (): Promise<string | null> => {
    if (!certificateRef.current) return null;
    
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(certificateRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#fffbeb'
      });
      return dataUrl;
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error(t('achievements.failedGenerateImage'));
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `annadataconnect-certificate-${userName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();
    toast.success(t('achievements.certificateDownloaded'));
  };

  const handleNativeShare = async () => {
    if (!canUseWebShare()) {
      toast.error('Native sharing not supported');
      return;
    }

    const dataUrl = await generateImage();
    if (!dataUrl) return;

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'annadataconnect-certificate.png', { type: 'image/png' });

    const success = await useWebShare({
      title: t('achievements.certificateTitle'),
      text: shareMessage,
      files: [file]
    });

    if (!success && !canUseWebShare()) {
      // Fallback to text share
      await useWebShare({
        title: t('achievements.certificateTitle'),
        text: shareMessage,
        url: appUrl
      });
    }
  };

  const handleWhatsApp = () => shareToWhatsApp(shareMessage, appUrl);
  const handleTwitter = () => shareToTwitter(shareMessage, appUrl);
  const handleFacebook = () => shareToFacebook(appUrl);
  const handleLinkedIn = () => shareToLinkedIn(appUrl);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(`${shareMessage}\n\n${appUrl}`);
    if (success) {
      toast.success(t('achievements.linkCopied'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('achievements.shareAchievements')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Certificate Preview */}
          <div className="overflow-hidden rounded-lg">
            <AchievementCertificate
              ref={certificateRef}
              userName={userName}
              completedDonations={completedDonations}
              reliabilityScore={reliabilityScore}
              peopleHelped={peopleHelped}
              earnedBadges={earnedBadges}
              impactScore={impactScore}
            />
          </div>

          {/* Download Button */}
          <Button 
            onClick={handleDownload} 
            disabled={isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t('achievements.downloadCertificate')}
          </Button>

          {/* Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('achievements.shareOn')}:</p>
            <div className="grid grid-cols-2 gap-2">
              {canUseWebShare() && (
                <Button 
                  variant="outline" 
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {t('common.share')}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleWhatsApp}
                className="gap-2 hover:bg-green-50 hover:border-green-300"
              >
                <span className="text-lg">📱</span>
                {t('achievements.whatsapp')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTwitter}
                className="gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <span className="text-lg">𝕏</span>
                {t('achievements.twitter')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleFacebook}
                className="gap-2 hover:bg-blue-50 hover:border-blue-300"
              >
                <span className="text-lg">📘</span>
                {t('achievements.facebook')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleLinkedIn}
                className="gap-2 hover:bg-sky-50 hover:border-sky-300"
              >
                <span className="text-lg">💼</span>
                {t('achievements.linkedin')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopyLink}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                {t('achievements.copyLink')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
