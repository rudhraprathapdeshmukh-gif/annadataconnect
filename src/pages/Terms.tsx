import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar';

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto overflow-x-hidden">
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
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-3xl sm:text-4xl font-bold break-words">
                    {t('terms.pageTitle')}
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {t('terms.lastUpdated')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)] md:h-[600px] pr-4">
                <div className="space-y-8">
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section1Title')}</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>{t('terms.section1P1')}</p>
                      <p>{t('terms.section1P2')}</p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section2Title')}</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>{t('terms.section2P1')}</p>
                      <p>{t('terms.section2P2')}</p>
                      <p className="font-medium">{t('terms.section2P3')}</p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section3Title')}</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3">{t('terms.section3_1Title')}</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                          {(t('terms.section3_1Items', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3">{t('terms.section3_2Title')}</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                          {(t('terms.section3_2Items', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3">{t('terms.section3_3Title')}</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                          {(t('terms.section3_3Items', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section4Title')}</h2>
                    <p className="text-muted-foreground mb-3">{t('terms.section4Intro')}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                      {(t('terms.section4Items', { returnObjects: true }) as string[]).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section5Title')}</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p className="font-medium">{t('terms.section5P1')}</p>
                      <p>{t('terms.section5P2')}</p>
                      <p className="font-medium">{t('terms.section5P3')}</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        {(t('terms.section5Items', { returnObjects: true }) as string[]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      <p className="font-semibold text-foreground mt-4">{t('terms.section5P4')}</p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section6Title')}</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>{t('terms.section6P1')}</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        {(t('terms.section6Items1', { returnObjects: true }) as string[]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      <p className="mt-4">{t('terms.section6P2')}</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        {(t('terms.section6Items2', { returnObjects: true }) as string[]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section7Title')}</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>{t('terms.section7P1')}</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        {(t('terms.section7Items', { returnObjects: true }) as string[]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">{t('terms.section8Title')}</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>{t('terms.section8P1')}</p>
                      <p className="font-medium">{t('terms.section8P2')}</p>
                    </div>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;
