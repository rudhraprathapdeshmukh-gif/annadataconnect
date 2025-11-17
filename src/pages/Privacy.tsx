import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function Privacy() {
  const navigate = useNavigate();

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
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-4xl font-bold">
                ⭐ AnnadataConnect – Privacy Policy
              </CardTitle>
              <Badge variant="secondary">Last Updated: November 17, 2024</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-8">
                {/* Section 1 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We may collect:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Name, phone number, and email</li>
                    <li>Location data (to find nearby donors/receivers)</li>
                    <li>Photos and details of donated food</li>
                    <li>Device information and app usage data</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 2 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We use the collected data to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Match donors with receivers</li>
                    <li>Improve app features and safety</li>
                    <li>Send notifications and updates</li>
                    <li>Prevent fraud or misuse</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4 font-semibold">
                    We never sell your personal data.
                  </p>
                </section>

                <Separator />

                {/* Section 3 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">3. Information We Share</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We only share:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Necessary information (name, contact, location) with the other user for pickup</li>
                    <li>Data with law enforcement if required</li>
                    <li>Anonymous data for analytics (non-personal)</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4 font-semibold">
                    We do not share your data with advertisers.
                  </p>
                </section>

                <Separator />

                {/* Section 4 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We take reasonable measures to protect your data from:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Unauthorized access</li>
                    <li>Loss</li>
                    <li>Misuse</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    However, no system is 100% secure.
                  </p>
                </section>

                <Separator />

                {/* Section 5 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    You can:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Edit your information</li>
                    <li>Request account deletion</li>
                    <li>Ask us to delete your data</li>
                    <li>Turn off notifications</li>
                    <li>Contact us with privacy concerns</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 6 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">6. Children's Privacy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Our service is not intended for children under 13.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-2">
                    If a child uses the platform, it must be under parental supervision.
                  </p>
                </section>

                <Separator />

                {/* Section 7 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We may use third-party services like:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Maps</li>
                    <li>Analytics</li>
                    <li>Messaging</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    These follow their own privacy policies.
                  </p>
                </section>

                <Separator />

                {/* Section 8 */}
                <section>
                  <h2 className="text-2xl font-semibold mb-4">8. Updates to Privacy Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this Privacy Policy from time to time.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-2">
                    By continuing to use the service, you accept the updated policy.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
