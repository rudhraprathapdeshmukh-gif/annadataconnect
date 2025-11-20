import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { HeartHandshake, LogOut, User, FolderClock, LayoutDashboard, Plus, HelpCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NotificationBell from './NotificationBell';

// Helper function to capitalize first letter of each word
const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async (attempt = 1) => {
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!cancelled) {
        if (data) {
          setProfile(data);
        } else if (attempt < 5) {
          // Profile row might not be ready just yet after signup; retry briefly
          setTimeout(() => fetchProfile(attempt + 1), 400);
        }
      }
    };

    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <HeartHandshake className="h-6 w-6" />
          Annadataconnect
        </Link>
        
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              {profile?.user_type !== 'receiver' && (
                <Link to="/donate">
                  <Button variant="default" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Donate Food</span>
                  </Button>
                </Link>
              )}
              
              <NotificationBell />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={profile?.avatar_url || undefined} 
                        alt={`${capitalizeName(profile?.first_name)} ${capitalizeName(profile?.last_name)}`}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        {capitalizeName(profile?.first_name)?.[0] || capitalizeName(profile?.last_name)?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] bg-background border-border z-[1000]">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage 
                          src={profile?.avatar_url || undefined} 
                          alt={`${capitalizeName(profile?.first_name)} ${capitalizeName(profile?.last_name)}`}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {capitalizeName(profile?.first_name)?.[0] || capitalizeName(profile?.last_name)?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {capitalizeName(profile?.first_name)} {capitalizeName(profile?.last_name) || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-primary capitalize">Type: {profile?.user_type || 'both'}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <Link to="/profile">
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to="/history">
                    <DropdownMenuItem className="cursor-pointer">
                      <FolderClock className="h-4 w-4 mr-2" />
                      History
                    </DropdownMenuItem>
                  </Link>
                  
                  <Link to="/help">
                    <DropdownMenuItem className="cursor-pointer">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help & Support
                    </DropdownMenuItem>
                  </Link>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
