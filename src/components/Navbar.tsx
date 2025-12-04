import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { 
  HeartHandshake, LogOut, User, FolderClock, LayoutDashboard, Plus, HelpCircle,
  Settings, Moon, Sun, Globe, Bell, Mail, Key, Trophy, History,
  Shield
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import NotificationBell from './NotificationBell';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Helper function to capitalize first letter of each word
const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'te', label: 'తెలుగు' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
          // Sync language from profile
          if (data.language && data.language !== i18n.language) {
            i18n.changeLanguage(data.language);
          }
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
      // Change UI language immediately
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary">
            <HeartHandshake className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-base sm:text-xl">Annadataconnect</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('nav.dashboard')}</span>
                  </Button>
                </Link>
                {profile?.user_type !== 'receiver' && (
                  <Link to="/donate">
                    <Button variant="default" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('nav.donateFood')}</span>
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
                    {/* User Info Header */}
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
                          <p className="text-xs text-primary capitalize">{t('nav.type')}: {profile?.user_type || 'both'}</p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Profile Link */}
                    <Link to="/profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        {t('nav.profile')}
                      </DropdownMenuItem>
                    </Link>
                    
                    {/* History / Achievements Link */}
                    <Link to="/history">
                      <DropdownMenuItem className="cursor-pointer">
                        {isDonor ? <Trophy className="h-4 w-4 mr-2" /> : <History className="h-4 w-4 mr-2" />}
                        {isDonor ? t('nav.historyAchievements') : t('nav.history')}
                      </DropdownMenuItem>
                    </Link>
                    
                    <DropdownMenuSeparator />
                    
                    {/* App Preferences Sub-menu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        {t('nav.appPreferences')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56 bg-background border-border">
                        {/* Dark Mode Toggle */}
                        <DropdownMenuItem 
                          className="cursor-pointer flex items-center justify-between"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <div className="flex items-center gap-2">
                            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            <span>{t('nav.darkMode')}</span>
                          </div>
                          <Switch 
                            checked={theme === 'dark'} 
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                          />
                        </DropdownMenuItem>
                        
                        {/* Language Sub-menu */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Globe className="h-4 w-4 mr-2" />
                            {t('nav.language')}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-background border-border">
                            {LANGUAGES.map((lang) => (
                              <DropdownMenuItem 
                                key={lang.value}
                                className={`cursor-pointer ${profile?.language === lang.value || i18n.language === lang.value ? 'bg-accent' : ''}`}
                                onClick={() => handleLanguageChange(lang.value)}
                              >
                                {lang.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        
                        {/* Notifications Sub-menu */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <Bell className="h-4 w-4 mr-2" />
                            {t('nav.notifications')}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-56 bg-background border-border">
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center justify-between"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4" />
                                <span>{t('nav.push')}</span>
                              </div>
                              <Switch 
                                checked={profile?.notification_push ?? true}
                                onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                              />
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer flex items-center justify-between"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{t('nav.email')}</span>
                              </div>
                              <Switch 
                                checked={profile?.notification_email ?? true}
                                onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                              />
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    
                    {/* Account Sub-menu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        {t('nav.account')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-background border-border">
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => setShowChangePassword(true)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          {t('nav.changePassword')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => setShowLogoutConfirm(true)}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {t('nav.logout')}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Help Link */}
                    <Link to="/help">
                      <DropdownMenuItem className="cursor-pointer">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        {t('nav.helpSupport')}
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logout.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('logout.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('nav.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
