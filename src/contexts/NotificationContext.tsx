import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { registerServiceWorkerAndSubscribe } from '@/lib/pushSubscription';
import { playNotificationSound } from '@/lib/notificationSound';
import { playDonationAlertSound } from '@/lib/donationAlertSound';

interface Notification {
  id: string;
  user_id: string;
  type: 'request_approved' | 'message_received' | 'extension_request' | 'extension_granted' | 'extension_rejected' | 'donation_cancelled' | 'donation_expired' | 'nearby_donation' | 'donation_requested' | 'low_rating_warning' | 'account_suspended' | 'account_blocked';
  title: string;
  message: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationPreferences {
  notification_push: boolean | null;
  notification_email: boolean | null;
  user_type: string | null;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  permission: NotificationPermission;
  preferences: NotificationPreferences | null;
  requestPermission: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

const isPushEnabled = (prefs: NotificationPreferences | null) => prefs?.notification_push !== false;
const moderationTypes = ['low_rating_warning', 'account_suspended', 'account_blocked'];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  const preferencesRef = useRef<NotificationPreferences | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const lastCheckedAtRef = useRef<string>(new Date(Date.now() - 2 * 60 * 1000).toISOString());
  const notificationsRef = useRef<Notification[]>([]);

  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);
  useEffect(() => { permissionRef.current = permission; }, [permission]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  const showNotificationToast = (n: Notification) => {
    if (toastedIdsRef.current.has(n.id)) return;
    if (moderationTypes.includes(n.type)) return;
    if (!isPushEnabled(preferencesRef.current)) return;

    if (n.type === 'nearby_donation') {
      playDonationAlertSound();
    } else {
      playNotificationSound();
    }
    toast.info(n.title, { description: n.message });

    toastedIdsRef.current.add(n.id);
    if (toastedIdsRef.current.size > 200) {
      const first = toastedIdsRef.current.values().next().value;
      if (first) toastedIdsRef.current.delete(first);
    }
  };

  // Browser permission
  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') toast.success('Notifications enabled!');
    }
  };

  // Load preferences
  useEffect(() => {
    if (!user) { setPreferences(null); return; }

    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_push, notification_email, user_type')
        .eq('id', user.id)
        .single();
      if (!error && data) setPreferences(data);
    };
    loadPreferences();

    const channel = supabase
      .channel('profile-preferences')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const u = payload.new as any;
          setPreferences({ notification_push: u.notification_push, notification_email: u.notification_email, user_type: u.user_type });
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load existing notifications
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) { console.error('Error loading notifications:', error); return; }

      const all = (data as Notification[]) || [];
      setNotifications(all);
      setUnreadCount(all.filter(n => !n.read).length);

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      for (const n of all.filter(n => !n.read && n.created_at && n.created_at > twoMinutesAgo)) {
        showNotificationToast(n);
      }

      lastCheckedAtRef.current = all.length > 0 && all[0].created_at ? all[0].created_at : new Date().toISOString();
    };
    loadNotifications();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let unmounted = false;

    const setupSubscription = () => {
      if (unmounted) return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }

      const channelName = 'notifications-' + user.id;

      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as Notification;
            if (notificationsRef.current.some(x => x.id === n.id)) return;

            lastCheckedAtRef.current = new Date().toISOString();
            setNotifications(prev => [n, ...prev]);
            setUnreadCount(prev => prev + 1);

            if (isPushEnabled(preferencesRef.current) && permissionRef.current === 'granted') {
              try {
                new window.Notification(n.title, { body: n.message, icon: '/favicon.ico', tag: n.id });
              } catch (e) { /* mobile may block */ }
            }
            showNotificationToast(n);
          })
        .subscribe((status) => {
          if (unmounted) return;
          if (status === 'SUBSCRIBED') {
            retryCount = 0; // reset on successful connection
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            retryCount++;
            console.warn(`Notification channel ${status}, retry #${retryCount} in ${delay}ms`);
            retryTimeout = setTimeout(() => setupSubscription(), delay);
          }
          // Don't retry on CLOSED — that's triggered by our own cleanup
        });
    };

    setupSubscription();

    return () => {
      unmounted = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // CRUD operations
  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    if (!error) { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnreadCount(0); }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
    if (error) { console.error('Error deleting notification:', error); return; }
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const deleted = notifications.find(n => n.id === id);
      return deleted && !deleted.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const deleteAllNotifications = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (error) { console.error('Error deleting all notifications:', error); toast.error('Failed to delete notifications'); return; }
    setNotifications([]); setUnreadCount(0); toast.success('All notifications removed');
  };

  // Auto-prompt push for receivers
  useEffect(() => {
    if (user && (preferences?.user_type === 'receiver' || preferences?.user_type === 'both') && 'Notification' in window) {
      if (permission === 'default') requestPermission();
      if (permission === 'granted') registerServiceWorkerAndSubscribe(user.id);
    }
  }, [user, preferences?.user_type, permission]);

  // Visibility-based polling fallback
  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      const since = lastCheckedAtRef.current;
      const now = new Date().toISOString();
      try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).gt('created_at', since).order('created_at', { ascending: true });
        if (error || !data?.length) { lastCheckedAtRef.current = now; return; }

        const existingIds = new Set(notificationsRef.current.map(n => n.id));
        const newOnes = (data as Notification[]).filter(n => !existingIds.has(n.id));
        if (newOnes.length > 0) {
          setNotifications(prev => [...newOnes.reverse(), ...prev]);
          setUnreadCount(prev => prev + newOnes.filter(n => !n.read).length);
          for (const n of newOnes) showNotificationToast(n);
        }
        lastCheckedAtRef.current = now;
      } catch (e) { console.error('Unexpected error polling notifications:', e); }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', poll);
    const intervalId = setInterval(poll, 5000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', poll);
      clearInterval(intervalId);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, permission, preferences, requestPermission, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
