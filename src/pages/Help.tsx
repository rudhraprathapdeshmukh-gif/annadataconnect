import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  return <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-3xl sm:text-4xl font-bold break-words">
                    💬 {t('help.title')}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)] md:h-[600px] pr-4">
                <div className="space-y-4 sm:space-y-8">
                  {/* Contact Us Section */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">     {t('help.contactUs')}</h2>
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                        <div className="flex items-start gap-2 sm:gap-4">
                          <div className="flex-1 space-y-2 sm:space-y-3">
                            <p className="text-sm sm:text-base text-muted-foreground">
                              {t('help.needHelp')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                              <a href={`mailto:${supportEmail}?subject=AnnadataConnect Support Request`} className="text-base sm:text-lg font-semibold text-primary hover:underline break-all">
                                {supportEmail}
                              </a>
                              <Button variant="outline" size="sm" onClick={copyEmail} className="gap-2">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? t('common.copied') : t('common.copy')}
                              </Button>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              💡 {t('help.responseTime')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <Separator />

                  {/* FAQ Section */}
                  <section>
                    <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">❓ {t('help.faq')}</h2>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger className="text-sm sm:text-base">{t('help.faqItems.howToDonate')}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                            <p>{t('help.faqAnswers.howToDonateIntro')}</p>
                            <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.howToDonateSteps', { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                            <p className="mt-1 sm:mt-2 text-sm">{t('help.faqAnswers.howToDonateNote')}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-2">
                        <AccordionTrigger className="text-sm sm:text-base">{t('help.faqItems.howToRequest')}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                            <p>{t('help.faqAnswers.howToRequestIntro')}</p>
                            <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.howToRequestSteps', { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                            <p className="mt-1 sm:mt-2 text-sm">{t('help.faqAnswers.howToRequestNote')}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-3">
                        <AccordionTrigger className="text-sm sm:text-base">{t('help.faqItems.whatIsOTP')}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                            <p>{t('help.faqAnswers.whatIsOTPIntro')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.whatIsOTPSteps', { returnObjects: true }) as string[]).map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ul>
                            <p className="mt-1 sm:mt-2 text-sm font-medium">{t('help.faqAnswers.whatIsOTPNote')}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-4">
                        <AccordionTrigger className="text-sm sm:text-base">{t('help.faqItems.howReliabilityWorks')}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                            <p>{t('help.faqAnswers.howReliabilityIntro')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.howReliabilityLevels', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                            <p className="mt-1 sm:mt-2 text-sm">{t('help.faqAnswers.howReliabilityFactorsIntro')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.howReliabilityFactors', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-5">
                        <AccordionTrigger className="text-sm sm:text-base">{t('help.faqItems.missedPickup')}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                            <p>{t('help.faqAnswers.missedPickupIntro')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.missedPickupConsequences', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                            <p className="mt-1 sm:mt-2 text-sm font-medium">{t('help.faqAnswers.missedPickupAlternatives')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.missedPickupOptions', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-6">
                        <AccordionTrigger className="text-sm sm:text-base">{t('help.faqItems.howToRate')}</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base text-muted-foreground">
                            <p>{t('help.faqAnswers.howToRateIntro')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.howToRateSteps', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                            <p className="mt-1 sm:mt-2 text-sm">{t('help.faqAnswers.howToRateHelps')}</p>
                            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2 sm:ml-4 text-sm">
                              {(t('help.faqAnswers.howToRateHelpsItems', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </section>

                  <Separator />

                  {/* User Guides */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">📚 {t('help.userGuides')}</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-primary">{t('help.forDonors')}</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <ul className="space-y-3 text-muted-foreground">
                              {Object.keys(donorSteps).filter(k => k.startsWith('step')).map((key, i) => (
                                <li key={key} className="flex gap-2">
                                  <span className="font-semibold text-foreground">{i + 1}.</span>
                                  <span>{donorSteps[key]}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-primary">{t('help.forReceivers')}</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <ul className="space-y-3 text-muted-foreground">
                              {Object.keys(receiverSteps).filter(k => k.startsWith('step')).map((key, i) => (
                                <li key={key} className="flex gap-2">
                                  <span className="font-semibold text-foreground">{i + 1}.</span>
                                  <span>{receiverSteps[key]}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-primary">{t('help.forOrganizations')}</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-3 text-muted-foreground">
                              <p>{t('help.orgGuide.intro')}</p>
                              <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>{t('help.orgGuide.item1')}</li>
                                <li>{t('help.orgGuide.item2')}</li>
                                <li>{t('help.orgGuide.item3')}</li>
                                <li>{t('help.orgGuide.item4')}</li>
                              </ul>
                              <p className="mt-4 font-medium">{t('help.orgGuide.partnerNote')}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Technical Support */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">🔧 {t('help.technicalSupport')}</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{t('help.browserCompatibility')}</h3>
                        <p className="text-muted-foreground">
                          {t('help.technicalGuide.browserIntro')}
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                          {(t('help.technicalGuide.browsers', { returnObjects: true }) as string[]).map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">{t('help.accountIssues')}</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p><strong>{t('help.technicalGuide.cantSignIn')}</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            {(t('help.technicalGuide.cantSignInSteps', { returnObjects: true }) as string[]).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                          <p className="mt-3"><strong>{t('help.technicalGuide.notReceivingEmails')}</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            {(t('help.technicalGuide.notReceivingEmailsSteps', { returnObjects: true }) as string[]).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">{t('help.commonProblems')}</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p><strong>{t('help.technicalGuide.locationNotWorking')}</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            {(t('help.technicalGuide.locationSteps', { returnObjects: true }) as string[]).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                          <p className="mt-3"><strong>{t('help.technicalGuide.imageUploadFailing')}</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            {(t('help.technicalGuide.imageSteps', { returnObjects: true }) as string[]).map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Report an Issue */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">🚨 {t('help.reportIssue')}</h2>
                    
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardContent className="pt-6">
                        <div className="space-y-4 text-muted-foreground">
                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">{t('help.reportGuide.bugTitle')}</h3>
                            <p>{t('help.reportGuide.bugIntro')}</p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                              {(t('help.reportGuide.bugItems', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">{t('help.reportGuide.behaviorTitle')}</h3>
                            <p>{t('help.reportGuide.behaviorIntro')}</p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                              {(t('help.reportGuide.behaviorItems', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                            <p className="mt-2 font-medium">{t('help.reportGuide.behaviorNote')}</p>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">{t('help.reportGuide.urgentTitle')}</h3>
                            <p>{t('help.reportGuide.urgentNote')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <Separator />

                  {/* Additional Resources */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">📖 {t('help.additionalResources')}</h2>
                    <div className="space-y-3 text-muted-foreground">
                      <p>{t('help.resourcesIntro')}</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>
                          <a href="/terms" className="text-primary hover:underline">{t('help.termsConditions')}</a> - {t('help.termsDesc')}
                        </li>
                        <li>
                          <a href="/privacy" className="text-primary hover:underline">{t('help.privacyPolicy')}</a> - {t('help.privacyDesc')}
                        </li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  {/* Contact Card */}
                  <section className="pb-4">
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="text-center space-y-3">
                          <h3 className="text-xl font-semibold">{t('help.stillNeedHelp')}</h3>
                          <p className="text-muted-foreground">
                            {t('help.contactSupport')}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
                            <a href={`mailto:${supportEmail}`} className="inline-block">
                              <Button size="lg" className="gap-2">
                                <Mail className="h-5 w-5" />
                                {t('common.emailSupport')}
                              </Button>
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default Help;
