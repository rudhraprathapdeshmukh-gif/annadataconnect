import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const Terms = () => {
  const navigate = useNavigate();

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
            Back
          </Button>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-3xl sm:text-4xl font-bold break-words">
                    ⭐ AnnadataConnect – Terms & Conditions
                  </CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    Last Updated: November 17, 2024
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)] md:h-[600px] pr-4">
                <div className="space-y-8">
                  {/* Section 1 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>AnnadataConnect is a platform that connects food donors with food receivers to reduce food waste.</p>
                      <p>By using our app or website, you agree to follow these Terms & Conditions.</p>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 2 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">2. Purpose of the Platform</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>AnnadataConnect helps individuals, restaurants, homes, and organizations donate extra food.</p>
                      <p>We only provide a connection service.</p>
                      <p className="font-medium">We do not prepare, inspect, or certify food.</p>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 3 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3">3.1 Donors must:</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                          <li>Donate only safe, freshly prepared, unspoiled food.</li>
                          <li>Provide accurate information about the food.</li>
                          <li>Follow hygiene rules during food packing and handling.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3">3.2 Receivers must:</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                          <li>Check the condition, freshness, and safety of food before accepting.</li>
                          <li>Consume food at their own risk.</li>
                          <li>Be on time for pickup and communicate respectfully.</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3">3.3 General user responsibilities:</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                          <li>Provide correct profile details.</li>
                          <li>Respect all users.</li>
                          <li>Follow local laws for food handling and donation.</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 4 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">4. Prohibited Activities</h2>
                    <p className="text-muted-foreground mb-3">Users must not:</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                      <li>Sell food through this platform (donations only).</li>
                      <li>Share abusive or illegal content.</li>
                      <li>Pretend to be someone else.</li>
                      <li>Post harmful or misleading information.</li>
                      <li>Use the platform for commerce, fraud, or personal gain.</li>
                    </ul>
                  </section>

                  <Separator />

                  {/* Section 5 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">5. Food Safety & Disclaimer</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p className="font-medium">Food quality depends entirely on the donor.</p>
                      <p>AnnadataConnect does not guarantee freshness, hygiene, or safety.</p>
                      <p className="font-medium">We are not responsible for:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Illness, allergies, or health issues caused by food.</li>
                        <li>Any disputes between donor and receiver.</li>
                        <li>Any damage, loss, or misuse of donated food.</li>
                      </ul>
                      <p className="font-semibold text-foreground mt-4">Users accept food at their own risk.</p>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 6 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">6. Platform Limitations</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>AnnadataConnect may:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Modify listings</li>
                        <li>Remove harmful users</li>
                        <li>Suspend accounts violating rules</li>
                        <li>Change features or services anytime</li>
                      </ul>
                      <p className="mt-4">We are not liable for:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>App downtime</li>
                        <li>Technical issues</li>
                        <li>Delays in service</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 7 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>We may suspend or permanently remove users who:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>Break rules</li>
                        <li>Harm others</li>
                        <li>Misuse the platform</li>
                        <li>Share fake or unsafe food</li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  {/* Section 8 */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
                    <div className="space-y-3 text-muted-foreground leading-relaxed">
                      <p>We may update these Terms & Conditions from time to time.</p>
                      <p className="font-medium">Continued use of the platform means you agree to the updated terms.</p>
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
