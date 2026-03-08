import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Eye, Share2, Lock, UserCheck, Baby, Globe, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';

const sectionIcons = [Eye, Shield, Share2, Lock, UserCheck, Baby, Globe, RefreshCw];

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sections = [
    { key: '1', hasIntro: true, hasItems: true },
    { key: '2', hasIntro: true, hasItems: true, hasNote: true },
    { key: '3', hasIntro: true, hasItems: true, hasNote: true },
    { key: '4', hasIntro: true, hasItems: true, hasNote: true },
    { key: '5', hasIntro: true, hasItems: true },
    { key: '6', paragraphs: ['P1', 'P2'] },
    { key: '7', hasIntro: true, hasItems: true, hasNote: true },
    { key: '8', paragraphs: ['P1', 'P2'] },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 sm:mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Hero */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
            {t('privacy.pageTitle')}
          </h1>
          <Badge variant="secondary" className="text-xs">{t('privacy.lastUpdated')}</Badge>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {sections.map((section, idx) => {
            const Icon = sectionIcons[idx];
            return (
              <Card key={section.key}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold pt-1">
                      {t(`privacy.section${section.key}Title`)}
                    </h2>
                  </div>

                  <div className="space-y-2.5 ml-11">
                    {section.hasIntro && (
                      <p className="text-sm text-muted-foreground">
                        {t(`privacy.section${section.key}Intro`)}
                      </p>
                    )}
                    {section.hasItems && (
                      <ul className="space-y-1.5">
                        {(t(`privacy.section${section.key}Items`, { returnObjects: true }) as string[]).map((item, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                            <span className="text-primary shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.hasNote && (
                      <p className="text-sm font-medium bg-primary/5 rounded-lg p-2.5">
                        {t(`privacy.section${section.key}Note`)}
                      </p>
                    )}
                    {section.paragraphs?.map(p => (
                      <p key={p} className="text-sm text-muted-foreground">
                        {t(`privacy.section${section.key}${p}`)}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}