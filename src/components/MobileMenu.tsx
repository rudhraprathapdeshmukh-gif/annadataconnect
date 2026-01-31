import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { 
  User, Trophy, History, Moon, Sun, Globe, Bell, Mail, Key, LogOut, HelpCircle, Menu
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

interface MobileMenuProps {
  user: any;
  profile: any;
  onLanguageChange: (lang: string) => void;
  onNotificationChange: (type: 'push' | 'email', value: boolean) => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

const LANGUAGES = [
  { value: 'en', label: 'EN' },
  { value: 'te', label: 'తె' },
];

export function MobileMenu({ 
  user, 
  profile, 
  onLanguageChange, 
  onNotificationChange,
  onChangePassword,
  onLogout 
}: MobileMenuProps) {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  
  const isDonor = profile?.user_type === 'donor' || profile?.user_type === 'both';

  const handleClose = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="sr-only">Menu</SheetTitle>
        </SheetHeader>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link to="/profile" onClick={handleClose}>
            <Button variant="outline" className="w-full h-12 gap-2">
              <User className="h-4 w-4" />
              {t('nav.profile')}
            </Button>
          </Link>
          <Link to="/history" onClick={handleClose}>
            <Button variant="outline" className="w-full h-12 gap-2">
              {isDonor ? <Trophy className="h-4 w-4" /> : <History className="h-4 w-4" />}
              {isDonor ? t('nav.historyAchievements') : t('nav.history')}
            </Button>
          </Link>
        </div>

        <Separator className="mb-4" />

        {/* Settings Section */}
        <div className="space-y-4 mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('nav.appPreferences')}</p>
          
          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <span className="text-sm font-medium">{t('nav.darkMode')}</span>
            </div>
            <Switch 
              checked={theme === 'dark'} 
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          {/* Language Selection */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('nav.language')}</span>
            </div>
            <div className="flex gap-1">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang.value}
                  variant={i18n.language === lang.value ? 'default' : 'outline'}
                  size="sm"
                  className="min-w-[40px] h-8"
                  onClick={() => onLanguageChange(lang.value)}
                >
                  {lang.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('nav.push')}</span>
            </div>
            <Switch 
              checked={profile?.notification_push ?? true}
              onCheckedChange={(checked) => onNotificationChange('push', checked)}
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{t('nav.email')}</span>
            </div>
            <Switch 
              checked={profile?.notification_email ?? true}
              onCheckedChange={(checked) => onNotificationChange('email', checked)}
            />
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Account Section */}
        <div className="space-y-1 mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('nav.account')}</p>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start h-12 gap-3"
            onClick={() => {
              handleClose();
              onChangePassword();
            }}
          >
            <Key className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{t('nav.changePassword')}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start h-12 gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              handleClose();
              onLogout();
            }}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">{t('nav.logout')}</span>
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Help */}
        <Link to="/help" onClick={handleClose}>
          <Button variant="ghost" className="w-full justify-start h-12 gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{t('nav.helpSupport')}</span>
          </Button>
        </Link>
      </SheetContent>
    </Sheet>
  );
}
