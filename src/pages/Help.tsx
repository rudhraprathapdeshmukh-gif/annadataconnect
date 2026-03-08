import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mail, Copy, Check, HelpCircle, BookOpen, Wrench, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState } from 'react';
import { toast } from 'sonner';

const Help = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const supportEmail = "annadataconnectgptwgl@gmail.com";
  const copyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    toast.success(t('help.emailCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const donorSteps = t('help.donorGuide', { returnObjects: true }) as Record<string, string>;
  const receiverSteps = t('help.receiverGuide', { returnObjects: true }) as Record<string, string>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 sm:mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Hero Header */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
            💬 {t('help.title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('help.needHelp')}
          </p>
        </div>

        <div className="space-y-5 sm:space-y-8">
          {/* Contact Card */}
          <Card className="bg-gradient-to-br from-primary/8 to-primary/3 border-primary/15 overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('help.contactUs')}</h2>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <a href={`mailto:${supportEmail}?subject=AnnadataConnect Support Request`}
                    className="text-sm sm:text-base font-medium text-primary hover:underline break-all">
                    {supportEmail}
                  </a>
                  <Button variant="outline" size="sm" onClick={copyEmail} className="gap-1.5 h-8 text-xs shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('common.copied') : t('common.copy')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 {t('help.responseTime')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-semibold">
                {t('help.faq')}
              </h2>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {[
                    { value: 'donate', q: 'howToDonate', intro: 'howToDonateIntro', steps: 'howToDonateSteps', note: 'howToDonateNote', ordered: true },
                    { value: 'request', q: 'howToRequest', intro: 'howToRequestIntro', steps: 'howToRequestSteps', note: 'howToRequestNote', ordered: true },
                    { value: 'otp', q: 'whatIsOTP', intro: 'whatIsOTPIntro', steps: 'whatIsOTPSteps', note: 'whatIsOTPNote', ordered: false },
                    { value: 'timer', q: 'whatIsTimer', intro: 'whatIsTimerIntro', steps: 'whatIsTimerSteps', note: 'whatIsTimerNote', ordered: false },
                    { value: 'reliability', q: 'howReliabilityWorks', intro: 'howReliabilityIntro', steps: 'howReliabilityLevels', note: null, ordered: false, extra: { intro2: 'howReliabilityFactorsIntro', steps2: 'howReliabilityFactors' } },
                    { value: 'missed', q: 'missedPickup', intro: 'missedPickupIntro', steps: 'missedPickupConsequences', note: null, ordered: false, extra: { intro2: 'missedPickupAlternatives', steps2: 'missedPickupOptions' } },
                    { value: 'rate', q: 'howToRate', intro: 'howToRateIntro', steps: 'howToRateSteps', note: null, ordered: false, extra: { intro2: 'howToRateHelps', steps2: 'howToRateHelpsItems' } },
                    { value: 'impact', q: 'whatIsImpactTracker', intro: 'whatIsImpactTrackerIntro', steps: 'whatIsImpactTrackerSteps', note: 'whatIsImpactTrackerNote', ordered: false },
                    { value: 'language', q: 'howToChangeLanguage', intro: 'howToChangeLanguageIntro', steps: 'howToChangeLanguageSteps', note: 'howToChangeLanguageNote', ordered: false },
                  ].map((faq) => (
                    <AccordionItem key={faq.value} value={faq.value} className="border-b last:border-0">
                      <AccordionTrigger className="text-sm sm:text-base px-4 sm:px-5 py-3 sm:py-4 hover:no-underline hover:bg-muted/30 text-left">
                        {t(`help.faqItems.${faq.q}`)}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 sm:px-5 pb-4">
                        <div className="space-y-2.5 text-sm text-muted-foreground">
                          <p>{t(`help.faqAnswers.${faq.intro}`)}</p>
                          {faq.ordered ? (
                            <ol className="space-y-1.5 ml-1">
                              {(t(`help.faqAnswers.${faq.steps}`, { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i} className="flex gap-2.5">
                                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <ul className="space-y-1.5 ml-1">
                              {(t(`help.faqAnswers.${faq.steps}`, { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i} className="flex gap-2.5">
                                  <span className="text-primary shrink-0">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {faq.extra && (
                            <>
                              <p className="font-medium text-foreground/80 pt-1">{t(`help.faqAnswers.${faq.extra.intro2}`)}</p>
                              <ul className="space-y-1.5 ml-1">
                                {(t(`help.faqAnswers.${faq.extra.steps2}`, { returnObjects: true }) as string[]).map((step, i) => (
                                  <li key={i} className="flex gap-2.5">
                                    <span className="text-primary shrink-0">•</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {faq.note && (
                            <p className="text-xs sm:text-sm font-medium bg-primary/5 rounded-lg p-2.5 mt-2">
                              {t(`help.faqAnswers.${faq.note}`)}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* User Guides */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-semibold">{t('help.userGuides')}</h2>
            </div>
            <div className="space-y-4">
              {/* Donor Guide */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-3">{t('help.forDonors')}</h3>
                  <ol className="space-y-2.5">
                    {Object.keys(donorSteps).filter(k => k.startsWith('step')).map((key, i) => (
                      <li key={key} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{donorSteps[key]}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Receiver Guide */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-3">{t('help.forReceivers')}</h3>
                  <ol className="space-y-2.5">
                    {Object.keys(receiverSteps).filter(k => k.startsWith('step')).map((key, i) => (
                      <li key={key} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{receiverSteps[key]}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Org Guide */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-primary mb-3">{t('help.forOrganizations')}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{t('help.orgGuide.intro')}</p>
                  <ul className="space-y-2 ml-1">
                    {['item1', 'item2', 'item3', 'item4'].map(key => (
                      <li key={key} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="text-primary shrink-0">•</span>
                        <span>{t(`help.orgGuide.${key}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium text-primary mt-3">{t('help.orgGuide.partnerNote')}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Technical Support */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-semibold">{t('help.technicalSupport')}</h2>
            </div>
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-5">
                {/* Browser Compatibility */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-2">{t('help.browserCompatibility')}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{t('help.technicalGuide.browserIntro')}</p>
                  <ul className="space-y-1 ml-1">
                    {(t('help.technicalGuide.browsers', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="text-primary shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border" />

                {/* Account Issues */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-3">{t('help.accountIssues')}</h3>
                  <div className="space-y-4">
                    {[
                      { title: 'cantSignIn', steps: 'cantSignInSteps' },
                      { title: 'notReceivingEmails', steps: 'notReceivingEmailsSteps' },
                    ].map(({ title, steps }) => (
                      <div key={title} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">{t(`help.technicalGuide.${title}`)}</p>
                        <ul className="space-y-1 ml-1">
                          {(t(`help.technicalGuide.${steps}`, { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                              <span className="text-primary shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Common Problems */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-3">{t('help.commonProblems')}</h3>
                  <div className="space-y-4">
                    {[
                      { title: 'locationNotWorking', steps: 'locationSteps' },
                      { title: 'imageUploadFailing', steps: 'imageSteps' },
                      { title: 'profilePhotoLimit', steps: 'profilePhotoSteps' },
                    ].map(({ title, steps }) => (
                      <div key={title} className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">{t(`help.technicalGuide.${title}`)}</p>
                        <ul className="space-y-1 ml-1">
                          {(t(`help.technicalGuide.${steps}`, { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                              <span className="text-primary shrink-0">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Report an Issue */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg sm:text-xl font-semibold">{t('help.reportIssue')}</h2>
            </div>
            <Card className="border-destructive/15">
              <CardContent className="p-4 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-2">{t('help.reportGuide.bugTitle')}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{t('help.reportGuide.bugIntro')}</p>
                  <ul className="space-y-1 ml-1">
                    {(t('help.reportGuide.bugItems', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="text-destructive shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-border" />

                <div>
                  <h3 className="text-sm sm:text-base font-semibold mb-2">{t('help.reportGuide.behaviorTitle')}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{t('help.reportGuide.behaviorIntro')}</p>
                  <ul className="space-y-1 ml-1">
                    {(t('help.reportGuide.behaviorItems', { returnObjects: true }) as string[]).map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="text-destructive shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm font-medium mt-2">{t('help.reportGuide.behaviorNote')}</p>
                </div>

                <div className="border-t border-border" />

                <div className="bg-destructive/5 rounded-lg p-3">
                  <h3 className="text-sm sm:text-base font-semibold mb-1">{t('help.reportGuide.urgentTitle')}</h3>
                  <p className="text-sm text-muted-foreground">{t('help.reportGuide.urgentNote')}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Additional Resources */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-semibold">{t('help.additionalResources')}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/terms">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm font-semibold text-primary">{t('help.termsConditions')}</span>
                    <span className="text-xs text-muted-foreground">{t('help.termsDesc')}</span>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/privacy">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-sm font-semibold text-primary">{t('help.privacyPolicy')}</span>
                    <span className="text-xs text-muted-foreground">{t('help.privacyDesc')}</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Footer CTA */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/4 border-primary/15">
            <CardContent className="p-5 sm:p-8 text-center space-y-3">
              <h3 className="text-lg sm:text-xl font-semibold">{t('help.stillNeedHelp')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t('help.contactSupport')}
              </p>
              <a href={`mailto:${supportEmail}`}>
                <Button size="lg" className="gap-2 mt-2">
                  <Mail className="h-4 w-4" />
                  {t('common.emailSupport')}
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Bottom spacer for mobile nav */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
};
export default Help;