import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-3xl sm:text-4xl font-bold break-words">
                {t('privacy.pageTitle')}
              </CardTitle>
              <Badge variant="secondary" className="w-fit">{t('privacy.lastUpdated')}</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)] md:h-[600px] pr-4">
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section1Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">{t('privacy.section1Intro')}</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    {(t('privacy.section1Items', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section2Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">{t('privacy.section2Intro')}</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    {(t('privacy.section2Items', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4 font-semibold">{t('privacy.section2Note')}</p>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section3Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">{t('privacy.section3Intro')}</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    {(t('privacy.section3Items', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4 font-semibold">{t('privacy.section3Note')}</p>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section4Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">{t('privacy.section4Intro')}</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    {(t('privacy.section4Items', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4">{t('privacy.section4Note')}</p>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section5Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">{t('privacy.section5Intro')}</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    {(t('privacy.section5Items', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section6Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed">{t('privacy.section6P1')}</p>
                  <p className="text-muted-foreground leading-relaxed mt-2">{t('privacy.section6P2')}</p>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section7Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">{t('privacy.section7Intro')}</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    {(t('privacy.section7Items', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4">{t('privacy.section7Note')}</p>
                </section>

                <Separator />

                <section>
                  <h2 className="text-2xl font-semibold mb-4">{t('privacy.section8Title')}</h2>
                  <p className="text-muted-foreground leading-relaxed">{t('privacy.section8P1')}</p>
                  <p className="text-muted-foreground leading-relaxed mt-2">{t('privacy.section8P2')}</p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
