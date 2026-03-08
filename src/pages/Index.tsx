import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Users, Leaf, Package, Clock, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import heroImage from '@/assets/hero-food-sharing.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

// Helper function to capitalize first letter of each word
const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

interface DonationItemInfo {
  id: string;
  title: string;
  quantity: string;
  quantity_unit: string;
  food_type: string;
  diet_type: string | null;
  image_url: string | null;
}

interface ActiveDonation {
  id: string;
  title: string;
  quantity: string;
  quantity_unit: string;
  status: string;
  pickup_location: string;
  expiry_date: string | null;
  image_url: string | null;
  pending_requests: number;
  items: DonationItemInfo[];
}

const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [userType, setUserType] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null>(null);
  const [activeDonations, setActiveDonations] = useState<ActiveDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase.from('profiles').select('user_type, first_name, last_name, avatar_url').eq('id', user.id).maybeSingle();
        if (data) {
          setUserType(data.user_type);
          setUserProfile({
            first_name: data.first_name,
            last_name: data.last_name,
            avatar_url: data.avatar_url
          });
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const fetchActiveDonations = async () => {
      if (user && userType && userType !== 'receiver') {
        setLoadingDonations(true);
        try {
          const { data: donations, error } = await supabase.from('food_donations').select(`
              id,
              title,
              quantity,
              quantity_unit,
              status,
              pickup_location,
              expiry_date,
              image_url
            `).eq('donor_id', user.id).eq('status', 'available').is('deleted_at', null).order('created_at', {
            ascending: false
          }).limit(6);
          if (error) throw error;
            if (donations) {
            // Filter out expired donations client-side
            const now = new Date().toISOString();
            const activeDonationsList = donations.filter(d => !d.expiry_date || d.expiry_date > now);
            // Fetch pending requests count for each donation
            const donationsWithCounts = await Promise.all(activeDonationsList.map(async donation => {
              const { count } = await supabase.from('food_requests').select('*', {
                count: 'exact',
                head: true
              }).eq('donation_id', donation.id).eq('status', 'pending');
              return {
                ...donation,
                pending_requests: count || 0
              };
            }));
            setActiveDonations(donationsWithCounts);
          }
        } catch (error) {
          console.error('Error fetching active donations:', error);
        } finally {
          setLoadingDonations(false);
        }
      }
    };
    fetchActiveDonations();
  }, [user, userType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden mesh-gradient">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 blob" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 blob" style={{ animationDelay: '4s' }} />
        
        {/* Floating Food Icons */}
        <div className="floating-element">🍕</div>
        <div className="floating-element">🍎</div>
        <div className="floating-element">🍞</div>
        <div className="floating-element">🥗</div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-slide-up">
            {user && userProfile ? (
              <>
                <div className="flex justify-center">
                  <Avatar className="h-24 w-24 mb-6 border-4 border-primary/20 shadow-xl">
                    <AvatarImage src={userProfile.avatar_url || undefined} alt={`${capitalizeName(userProfile.first_name)} ${capitalizeName(userProfile.last_name)}`} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {capitalizeName(userProfile.first_name)?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight drop-shadow-lg">
                  {t('home.welcomeBack')} <span className="text-primary drop-shadow-xl">{capitalizeName(userProfile.first_name)} {capitalizeName(userProfile.last_name)}</span>! 👋
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground">
                  {t('home.readyToMakeDifference')}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight drop-shadow-lg">
                  {t('home.shareFoodShareLove')} <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-2xl animate-pulse">{t('home.love')}</span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                  {t('home.heroDescription')}
                </p>
              </>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button size="lg" variant="default" className="shadow-lg hover-lift w-full sm:w-auto transform hover:scale-105 transition-all duration-300">
                      <Package className="mr-2 h-5 w-5" />
                      {userType === 'receiver' ? t('home.availableFood') : t('home.yourDonations')}
                    </Button>
                  </Link>
                  {userType !== 'receiver' && (
                    <Link to="/donate">
                      <Button size="lg" variant="secondary" className="shadow-lg hover-lift w-full sm:w-auto transform hover:scale-105 transition-all duration-300">
                        {t('nav.donateFood')}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="shadow-lg glow-effect text-lg px-8 w-full sm:w-auto transform hover:scale-105 transition-all duration-300">
                    {t('home.getStarted')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Active Donations Section - Only for Donors */}
      {user && userType && userType !== 'receiver' && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">{t('home.yourActiveDonations')}</h2>
                <p className="text-muted-foreground">{t('home.manageOngoingDonations')}</p>
              </div>
              <Link to="/dashboard">
                <Button variant="outline">{t('home.viewAll')}</Button>
              </Link>
            </div>

            {loadingDonations ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('home.loadingDonations')}</p>
              </div>
            ) : activeDonations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeDonations.map(donation => (
                  <Card key={donation.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 card-3d group">
                    {donation.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img src={donation.image_url} alt={donation.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">{donation.title}</CardTitle>
                        <Badge variant={donation.status === 'available' ? 'default' : 'secondary'}>
                          {donation.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{donation.quantity} {donation.quantity_unit}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="line-clamp-1">{donation.pickup_location}</span>
                      </div>
                      {donation.expiry_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{t('home.expires')}: {new Date(donation.expiry_date).toLocaleDateString()} at {new Date(donation.expiry_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                        </div>
                      )}
                      {donation.pending_requests > 0 && (
                        <div className="pt-2 border-t">
                          <Badge variant="outline" className="w-full justify-center">
                            {donation.pending_requests} {t('home.pendingRequests')}{donation.pending_requests !== 1 ? '' : ''}
                          </Badge>
                        </div>
                      )}
                      <Link to="/dashboard" className="block pt-2">
                        <Button variant="secondary" size="sm" className="w-full">
                          {t('home.viewDetails')}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="text-center space-y-4">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium mb-2">{t('home.noActiveDonations')}</p>
                    <p className="text-muted-foreground mb-4">{t('home.startMakingDifference')}</p>
                    <Link to="/donate">
                      <Button>{t('home.createFirstDonation')}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 gradient-warm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t('home.howItWorks')}</h2>
            <p className="text-muted-foreground text-lg md:text-xl">{t('home.simpleEffective')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center hover-lift border-0 shadow-lg card-3d gradient-border overflow-hidden group">
              <CardHeader className="pb-6 pt-8">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full gradient-primary flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-3">{t('home.donateFood')}</CardTitle>
                <CardDescription className="text-base">
                  {t('home.donateFoodDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover-lift border-0 shadow-lg card-3d gradient-border overflow-hidden group">
              <CardHeader className="pb-6 pt-8">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl mb-3">{t('home.connect')}</CardTitle>
                <CardDescription className="text-base">
                  {t('home.connectDesc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover-lift border-0 shadow-lg card-3d gradient-border overflow-hidden group">
              <CardHeader className="pb-6 pt-8">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                  <Leaf className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl mb-3">{t('home.makeImpact')}</CardTitle>
                <CardDescription className="text-base">
                  {t('home.makeImpactDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <Card className="max-w-3xl mx-auto gradient-primary text-white border-0 shadow-2xl overflow-hidden">
              <CardContent className="py-16 text-center space-y-6 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4">
                    {t('home.joinCommunity')}
                  </h2>
                  <p className="text-xl md:text-2xl opacity-95 mb-8">
                    {t('home.everyActionMatters')}
                  </p>
                  <Link to="/auth?mode=signup">
                    <Button size="lg" variant="secondary" className="shadow-xl hover-lift text-lg px-10">
                      {t('home.signUpNow')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-muted/30 border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-primary transition-colors">
              {t('home.termsConditions')}
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              {t('home.privacyPolicy')}
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/help" className="hover:text-primary transition-colors">
              {t('nav.helpSupport')}
            </Link>
            <span className="hidden sm:inline">•</span>
            <span>© 2025 AnnadataConnect</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
