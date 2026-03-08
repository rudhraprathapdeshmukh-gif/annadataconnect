import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { 
  HeartHandshake, LogOut, User, LayoutDashboard, Plus, HelpCircle,
  Moon, Sun, Globe, Bell, Mail, Key, Trophy, History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NotificationBell from './NotificationBell';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { MobileMenu } from '@/components/MobileMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const LANGUAGES = [
  { value: 'en', label: 'EN' },
  { value: 'te', label: 'తె' },
  { value: 'hi', label: 'हि' },
  { value: 'mr', label: 'मरा' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMobile = useIsMobile();

  const isDonor = profile?.user_type === 'donor' || profile?.user_type === 'both';

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
          if (data.language && data.language !== i18n.language) {
            i18n.changeLanguage(data.language);
          }
        } else if (attempt < 5) {
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
  }, [user, i18n]);

  const handleNotificationChange = async (type: 'push' | 'email', value: boolean) => {
    if (!user?.id) return;
    try {
      const updateField = `notification_${type}` as const;
      const { error } = await supabase
        .from('profiles')
        .update({ [updateField]: value })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile({
        ...profile,
        [`notification_${type}`]: value
      });
      toast.success(t('toast.notificationUpdated'));
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error(t('toast.failedUpdateNotification'));
    }
  };

  const handleLanguageChange = async (value: string) => {
    if (!user?.id) return;
    try {
      i18n.changeLanguage(value);
      
      const { error } = await supabase
        .from('profiles')
        .update({ language: value })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile({ ...profile, language: value });
      toast.success(t('toast.languageUpdated'));
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error(t('toast.failedUpdateLanguage'));
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary">
            <HeartHandshake className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-base sm:text-xl">Annadataconnect</span>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2 h-9 px-2 sm:px-3">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('nav.dashboard')}</span>
                  </Button>
                </Link>
                {profile?.user_type !== 'receiver' && (
                  <Link to="/donate">
                    <Button variant="default" size="sm" className="gap-2 h-9 px-2 sm:px-3">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('nav.donateFood')}</span>
                    </Button>
                  </Link>
                )}
                
                <NotificationBell />
                
                {/* Mobile: Bottom Sheet Menu */}
                {isMobile ? (
                  <MobileMenu 
                    user={user}
                    profile={profile}
                    onLanguageChange={handleLanguageChange}
                    onNotificationChange={handleNotificationChange}
                    onChangePassword={() => setShowChangePassword(true)}
                    onLogout={() => setShowLogoutConfirm(true)}
                  />
                ) : (
                  /* Desktop: Flat Dropdown Menu */
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative rounded-full">
                        <Avatar className="h-9 w-9">
                          <AvatarImage 
                            src={profile?.avatar_url || undefined} 
                            alt={`${capitalizeName(profile?.first_name)} ${capitalizeName(profile?.last_name)}`}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {capitalizeName(profile?.first_name)?.[0] || capitalizeName(profile?.last_name)?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 bg-background border-border z-[1000]">
                      {/* User Info */}
                      <DropdownMenuLabel className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {capitalizeName(profile?.first_name)?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {capitalizeName(profile?.first_name)} {capitalizeName(profile?.last_name) || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            <p className="text-xs text-primary capitalize mt-0.5">{profile?.user_type || 'both'}</p>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {/* Quick Links */}
                      <Link to="/profile">
                        <DropdownMenuItem className="cursor-pointer h-10">
                          <User className="h-4 w-4 mr-3" />
                          {t('nav.profile')}
                        </DropdownMenuItem>
                      </Link>
                      <Link to="/history">
                        <DropdownMenuItem className="cursor-pointer h-10">
                          {isDonor ? <Trophy className="h-4 w-4 mr-3" /> : <History className="h-4 w-4 mr-3" />}
                          {isDonor ? t('nav.historyAchievements') : t('nav.history')}
                        </DropdownMenuItem>
                      </Link>
                      
                      <DropdownMenuSeparator />
                      
                      {/* Settings - Flat */}
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
                        {t('nav.appPreferences')}
                      </DropdownMenuLabel>
                      
                      {/* Theme */}
                      <DropdownMenuItem 
                        className="cursor-pointer h-10 flex justify-between"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center">
                          {theme === 'dark' ? <Moon className="h-4 w-4 mr-3" /> : <Sun className="h-4 w-4 mr-3" />}
                          {t('nav.darkMode')}
                        </div>
                        <Switch 
                          checked={theme === 'dark'} 
                          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        />
                      </DropdownMenuItem>
                      
                      {/* Language */}
                      <DropdownMenuItem 
                        className="cursor-pointer h-10 flex justify-between"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center">
                          <Globe className="h-4 w-4 mr-3" />
                          {t('nav.language')}
                        </div>
                        <div className="flex gap-1">
                          {LANGUAGES.map((lang) => (
                            <Button
                              key={lang.value}
                              variant={i18n.language === lang.value ? 'default' : 'outline'}
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleLanguageChange(lang.value)}
                            >
                              {lang.label}
                            </Button>
                          ))}
                        </div>
                      </DropdownMenuItem>
                      
                      {/* Push Notifications */}
                      <DropdownMenuItem 
                        className="cursor-pointer h-10 flex justify-between"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center">
                          <Bell className="h-4 w-4 mr-3" />
                          {t('nav.push')}
                        </div>
                        <Switch 
                          checked={profile?.notification_push ?? true}
                          onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                        />
                      </DropdownMenuItem>
                      
                      {/* Email Notifications */}
                      <DropdownMenuItem 
                        className="cursor-pointer h-10 flex justify-between"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-3" />
                          {t('nav.email')}
                        </div>
                        <Switch 
                          checked={profile?.notification_email ?? true}
                          onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                        />
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {/* Account */}
                      <DropdownMenuItem 
                        className="cursor-pointer h-10"
                        onClick={() => setShowChangePassword(true)}
                      >
                        <Key className="h-4 w-4 mr-3" />
                        {t('nav.changePassword')}
                      </DropdownMenuItem>
                      
                      <Link to="/help">
                        <DropdownMenuItem className="cursor-pointer h-10">
                          <HelpCircle className="h-4 w-4 mr-3" />
                          {t('nav.helpSupport')}
                        </DropdownMenuItem>
                      </Link>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        className="cursor-pointer h-10 text-destructive focus:text-destructive"
                        onClick={() => setShowLogoutConfirm(true)}
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        {t('nav.logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default">{t('nav.signIn')}</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Dialogs */}
      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logout.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('logout.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('nav.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
