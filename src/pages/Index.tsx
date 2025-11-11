import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Leaf, Package, Clock, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import heroImage from '@/assets/hero-food-sharing.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [activeDonations, setActiveDonations] = useState<ActiveDonation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          setUserType(data.user_type);
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
            .in('status', ['available', 'claimed'])
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
      <section className="relative py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Share Food, Share <span className="text-primary">Love</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect food donors with those in need. Together, we can reduce food waste and fight hunger in our community.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button size="lg" variant="default">
                      <Package className="mr-2 h-5 w-5" />
                      Your Donations
                    </Button>
                  </Link>
                  {userType !== 'receiver' && (
                    <Link to="/donate">
                      <Button size="lg" variant="secondary">
                        Donate Food
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth?mode=signup">
                  <Button size="lg">
                    Sign Up
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
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Annadataconnect Works</h2>
            <p className="text-muted-foreground text-lg">Simple, effective, and community-driven</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Donate Food</CardTitle>
                <CardDescription>
                  Have surplus food? List it on Annadataconnect and help those in need
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Connect</CardTitle>
                <CardDescription>
                  Browse available donations and request what you need
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Leaf className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Make Impact</CardTitle>
                <CardDescription>
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
            <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground">
              <CardContent className="py-12 text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Join Our Community Today
                </h2>
                <p className="text-lg opacity-90">
                  Whether you're donating or receiving, every action makes a difference
                </p>
                <Link to="/auth?mode=signup">
                  <Button size="lg" variant="secondary" className="mt-4">
                    Sign Up Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
