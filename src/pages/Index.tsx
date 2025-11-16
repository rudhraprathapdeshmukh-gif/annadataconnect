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

// Helper function to capitalize first letter of each word
const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

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
}

const Index = () => {
  const { user, loading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; avatar_url: string | null } | null>(null);
  const [activeDonations, setActiveDonations] = useState<ActiveDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type, first_name, last_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          setUserType(data.user_type);
          setUserProfile({ first_name: data.first_name, last_name: data.last_name, avatar_url: data.avatar_url });
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
          const { data: donations, error } = await supabase
            .from('food_donations')
            .select(`
              id,
              title,
              quantity,
              quantity_unit,
              status,
              pickup_location,
              expiry_date,
              image_url
            `)
            .eq('donor_id', user.id)
            .eq('status', 'available')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(6);

          if (error) throw error;

          if (donations) {
            // Fetch pending requests count for each donation
            const donationsWithCounts = await Promise.all(
              donations.map(async (donation) => {
                const { count } = await supabase
                  .from('food_requests')
                  .select('*', { count: 'exact', head: true })
                  .eq('donation_id', donation.id)
                  .eq('status', 'pending');

                return {
                  ...donation,
                  pending_requests: count || 0
                };
              })
            );

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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-10 sm:py-16 md:py-28 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container mx-auto px-3 sm:px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6 animate-slide-up">
            {user && userProfile ? (
              <>
                <div className="flex justify-center">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 mb-3 sm:mb-6 border-2 sm:border-4 border-primary/20 shadow-xl">
                    <AvatarImage 
                      src={userProfile.avatar_url || undefined} 
                      alt={`${capitalizeName(userProfile.first_name)} ${capitalizeName(userProfile.last_name)}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-lg sm:text-xl md:text-2xl bg-primary/10">
                      {capitalizeName(userProfile.first_name)?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight px-2">
                  Welcome back, <span className="text-primary hidden sm:inline">{capitalizeName(userProfile.first_name)} {capitalizeName(userProfile.last_name)}</span><span className="text-primary sm:hidden">{capitalizeName(userProfile.first_name)}</span>! 👋
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground px-4">
                  Ready to make a difference today? Connect with your community and share the love.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-tight px-2">
                  Share Food, Share <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Love</span>
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
                  Connect food donors with those in need. Together, we can reduce food waste and fight hunger in our community.
                </p>
              </>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4 sm:pt-6 px-4">
              {user ? (
                <>
                <Link to="/dashboard">
                  <Button size="lg" variant="default" className="shadow-lg hover-lift w-full sm:w-auto">
                    <Package className="mr-2 h-5 w-5" />
                    {userType === 'receiver' ? 'Available Food' : 'Your Donations'}
                  </Button>
                </Link>
                  {userType !== 'receiver' && (
                    <Link to="/donate">
                      <Button size="lg" variant="secondary" className="shadow-lg hover-lift w-full sm:w-auto">
                        Donate Food
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="shadow-lg hover-lift text-lg px-8 w-full sm:w-auto">
                    Get Started
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
                <h2 className="text-3xl font-bold mb-2">Your Active Donations</h2>
                <p className="text-muted-foreground">Manage your ongoing food donations</p>
              </div>
              <Link to="/dashboard">
                <Button variant="outline">View All</Button>
              </Link>
            </div>

            {loadingDonations ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading donations...</p>
              </div>
            ) : activeDonations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeDonations.map((donation) => (
                  <Card key={donation.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {donation.image_url && (
                      <div className="w-full h-48 overflow-hidden">
                        <img
                          src={donation.image_url}
                          alt={donation.title}
                          className="w-full h-full object-cover"
                        />
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
                          <span>Expires: {new Date(donation.expiry_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {donation.pending_requests > 0 && (
                        <div className="pt-2 border-t">
                          <Badge variant="outline" className="w-full justify-center">
                            {donation.pending_requests} Pending Request{donation.pending_requests !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                      <Link to="/dashboard" className="block pt-2">
                        <Button variant="secondary" size="sm" className="w-full">
                          View Details
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
                    <p className="text-lg font-medium mb-2">No active donations yet</p>
                    <p className="text-muted-foreground mb-4">Start making a difference by donating food today</p>
                    <Link to="/donate">
                      <Button>Create Your First Donation</Button>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How Annadataconnect Works</h2>
            <p className="text-muted-foreground text-lg md:text-xl">Simple, effective, and community-driven</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center hover-lift border-0 shadow-lg">
              <CardHeader className="pb-6 pt-8">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full gradient-primary flex items-center justify-center shadow-xl">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl mb-3">Donate Food</CardTitle>
                <CardDescription className="text-base">
                  Have surplus food? List it on Annadataconnect and help those in need
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover-lift border-0 shadow-lg">
              <CardHeader className="pb-6 pt-8">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center shadow-xl">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl mb-3">Connect</CardTitle>
                <CardDescription className="text-base">
                  Browse available donations and request what you need
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover-lift border-0 shadow-lg">
              <CardHeader className="pb-6 pt-8">
                <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center shadow-xl">
                  <Leaf className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl mb-3">Make Impact</CardTitle>
                <CardDescription className="text-base">
                  Reduce food waste while helping your community thrive
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
                    Join Our Community Today
                  </h2>
                  <p className="text-xl md:text-2xl opacity-95 mb-8">
                    Whether you're donating or receiving, every action makes a difference
                  </p>
                  <Link to="/auth?mode=signup">
                    <Button size="lg" variant="secondary" className="shadow-xl hover-lift text-lg px-10">
                      Sign Up Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
