import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState } from 'react';
import { toast } from 'sonner';
const Help = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const supportEmail = "annadataconnectgptwgl@gmail.com";
  const copyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  return <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-3xl sm:text-4xl font-bold break-words">
                    💬 Help & Support
                  </CardTitle>
                  
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-16rem)] md:h-[600px] pr-4">
                <div className="space-y-8">
                  {/* Contact Us Section */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">     Contact Us</h2>
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          
                          <div className="flex-1 space-y-3">
                            <p className="text-muted-foreground">
                              Need help? Have questions? We're here to assist you!
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                              <a href={`mailto:${supportEmail}?subject=AnnadataConnect Support Request`} className="text-lg font-semibold text-primary hover:underline">
                                {supportEmail}
                              </a>
                              <Button variant="outline" size="sm" onClick={copyEmail} className="gap-2">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied!" : "Copy"}
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              💡 We typically respond within 24-48 hours
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <Separator />

                  {/* FAQ Section */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">❓ Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>How do I donate food?</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-muted-foreground">
                            <p>To donate food:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-4">
                              <li>Sign in to your account</li>
                              <li>Click "Donate Food" button in the navbar</li>
                              <li>Fill in food details (title, quantity, type, location)</li>
                              <li>Upload a photo of the food</li>
                              <li>Set expiry date if applicable</li>
                              <li>Submit your donation</li>
                            </ol>
                            <p className="mt-2">Your donation will be visible to receivers immediately!</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-2">
                        <AccordionTrigger>How do I request food?</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-muted-foreground">
                            <p>To request food:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-4">
                              <li>Go to Dashboard to see available donations</li>
                              <li>Browse nearby food donations</li>
                              <li>Click on a donation to view details</li>
                              <li>Click "Request This Food" button</li>
                              <li>Add a message to the donor (optional)</li>
                              <li>Wait for donor approval</li>
                            </ol>
                            <p className="mt-2">Once approved, you'll receive the pickup location and OTP!</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-3">
                        <AccordionTrigger>What is the OTP system?</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-muted-foreground">
                            <p>The OTP (One-Time Password) system ensures secure food pickups:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>When a donor accepts your request, they generate a 6-digit OTP</li>
                              <li>The OTP is shown to both donor and receiver</li>
                              <li>During pickup, the receiver must provide the correct OTP</li>
                              <li>This prevents unauthorized people from claiming the food</li>
                              <li>Once verified, the donation is marked as completed</li>
                            </ul>
                            <p className="mt-2 font-medium">💡 Keep your OTP private and only share during actual pickup!</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-4">
                        <AccordionTrigger>How does the reliability score work?</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-muted-foreground">
                            <p>The reliability score helps build trust in the community:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li><strong>Excellent (90-100%):</strong> Highly reliable, rarely misses pickups</li>
                              <li><strong>Good (75-89%):</strong> Generally reliable with occasional issues</li>
                              <li><strong>Fair (60-74%):</strong> Some reliability concerns</li>
                              <li><strong>Poor (Below 60%):</strong> Frequently misses pickups</li>
                            </ul>
                            <p className="mt-2">Factors affecting your score:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>On-time pickups improve your score</li>
                              <li>No-shows significantly decrease your score</li>
                              <li>Average pickup time is tracked</li>
                              <li>Total completed pickups count</li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-5">
                        <AccordionTrigger>What happens if I miss a pickup?</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-muted-foreground">
                            <p>Missing a pickup has consequences:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Your reliability score will decrease</li>
                              <li>The donor can mark you as a "no-show"</li>
                              <li>Repeated no-shows may affect your ability to request food</li>
                              <li>It wastes the donor's time and potentially the food</li>
                            </ul>
                            <p className="mt-2 font-medium">If you can't make it:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Request a time extension through the platform</li>
                              <li>Contact the donor through the chat feature</li>
                              <li>Cancel the request early so others can claim it</li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-6">
                        <AccordionTrigger>How do I rate a transaction?</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 text-muted-foreground">
                            <p>After completing a pickup, both parties can rate each other:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Go to History page</li>
                              <li>Find the completed transaction</li>
                              <li>Click "Rate" button</li>
                              <li>Give a star rating (1-5 stars)</li>
                              <li>Optionally add a written review</li>
                            </ul>
                            <p className="mt-2">Ratings help:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Build trust in the community</li>
                              <li>Highlight reliable users</li>
                              <li>Improve the overall experience</li>
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </section>

                  <Separator />

                  {/* User Guides */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">📚 User Guides</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-primary">For Donors</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <ul className="space-y-3 text-muted-foreground">
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">1.</span>
                                <span>Ensure food is fresh, safe, and properly packaged</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">2.</span>
                                <span>Take a clear photo showing the food quality</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">3.</span>
                                <span>Provide accurate quantity and expiry information</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">4.</span>
                                <span>Review requests and approve reliable receivers</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">5.</span>
                                <span>Generate OTP when ready for pickup</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">6.</span>
                                <span>Verify OTP from receiver during handoff</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">7.</span>
                                <span>Rate the receiver after successful pickup</span>
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-primary">For Receivers</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <ul className="space-y-3 text-muted-foreground">
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">1.</span>
                                <span>Browse available food donations near you</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">2.</span>
                                <span>Check food details, quantity, and expiry date</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">3.</span>
                                <span>Send a polite request message to the donor</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">4.</span>
                                <span>Wait for donor approval (check notifications)</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">5.</span>
                                <span>Note the OTP and pickup location details</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">6.</span>
                                <span>Arrive on time for pickup (or request extension)</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">7.</span>
                                <span>Provide OTP to donor to complete pickup</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">8.</span>
                                <span>Inspect food quality before accepting</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-foreground">9.</span>
                                <span>Rate the donor after receiving the food</span>
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold mb-3 text-primary">For Organizations & NGOs</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-3 text-muted-foreground">
                              <p>Organizations can use AnnadataConnect to:</p>
                              <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Collect surplus food from restaurants and events</li>
                                <li>Distribute food to communities in need</li>
                                <li>Build a reliable track record through the rating system</li>
                                <li>Access larger quantities of donations</li>
                              </ul>
                              <p className="mt-4 font-medium">Contact us for partnership opportunities!</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Technical Support */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">🔧 Technical Support</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Browser Compatibility</h3>
                        <p className="text-muted-foreground">
                          AnnadataConnect works best on modern browsers:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                          <li>Google Chrome (recommended)</li>
                          <li>Mozilla Firefox</li>
                          <li>Safari (macOS and iOS)</li>
                          <li>Microsoft Edge</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Account Issues</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p><strong>Can't sign in?</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Check your email and password are correct</li>
                            <li>Clear browser cache and cookies</li>
                            <li>Try using password reset option</li>
                          </ul>
                          <p className="mt-3"><strong>Not receiving emails?</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Check spam/junk folder</li>
                            <li>Add our email to your contacts</li>
                            <li>Verify your email address is correct</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Common Problems</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p><strong>Location not working?</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Enable location services in browser settings</li>
                            <li>Grant location permission when prompted</li>
                            <li>Manually enter address if auto-detection fails</li>
                          </ul>
                          <p className="mt-3"><strong>Image upload failing?</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Ensure image is under 5MB</li>
                            <li>Use JPG, PNG, or WebP formats</li>
                            <li>Try a different image or compress it</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Report an Issue */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">🚨 Report an Issue</h2>
                    
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardContent className="pt-6">
                        <div className="space-y-4 text-muted-foreground">
                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">Report a Bug</h3>
                            <p>Found a technical issue? Please email us with:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                              <li>Description of the problem</li>
                              <li>Steps to reproduce the issue</li>
                              <li>Screenshots if possible</li>
                              <li>Device and browser information</li>
                            </ul>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">Report Inappropriate Behavior</h3>
                            <p>If you encounter:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                              <li>Fake or misleading food listings</li>
                              <li>Harassment or inappropriate messages</li>
                              <li>Spam or scam attempts</li>
                              <li>Safety concerns</li>
                            </ul>
                            <p className="mt-2 font-medium">Contact us immediately with details and evidence.</p>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">Urgent Issues</h3>
                            <p>For urgent safety or security concerns, email us with subject line: <strong>[URGENT]</strong></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <Separator />

                  {/* Additional Resources */}
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">📖 Additional Resources</h2>
                    <div className="space-y-3 text-muted-foreground">
                      <p>For more information, check out:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>
                          <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a> - Legal terms of use
                        </li>
                        <li>
                          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> - How we handle your data
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
                          <h3 className="text-xl font-semibold">Still need help?</h3>
                          <p className="text-muted-foreground">
                            Don't hesitate to reach out! We're here to help make your experience better.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
                            <a href={`mailto:${supportEmail}`} className="inline-block">
                              <Button size="lg" className="gap-2">
                                <Mail className="h-5 w-5" />
                                Email Support
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