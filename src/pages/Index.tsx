import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Heart, Users, Leaf } from 'lucide-react';
import Navbar from '@/components/Navbar';
import heroImage from '@/assets/hero-food-sharing.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Show nothing while checking auth or if user is logged in
  if (loading || user) {
    return null;
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
            <div className="flex justify-center pt-4">
              <Link to="/auth?mode=signup">
                <Button size="lg">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
    </div>
  );
};

export default Index;
