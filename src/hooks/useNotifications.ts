import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playDonationAlertSound } from '@/lib/donationAlertSound';
import { playNotificationSound } from '@/lib/notificationSound';
import { registerServiceWorkerAndSubscribe } from '@/lib/pushSubscription';

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

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Treat NULL as enabled (DB defaults may be NULL for older rows).
  // Only explicit FALSE means disabled.
  const isPushEnabled = (prefs: NotificationPreferences | null) => prefs?.notification_push !== false;
  
  // Use refs to always have latest values in realtime callback
  const preferencesRef = useRef<NotificationPreferences | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');
  const toastedIdsRef = useRef<Set<string>>(new Set());
  // Initialize to 2 minutes ago so mount-time fetch can toast recent notifications
  const lastCheckedAtRef = useRef<string>(new Date(Date.now() - 2 * 60 * 1000).toISOString());
  const notificationsRef = useRef<Notification[]>([]);
  
  // Keep refs in sync with state
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    permissionRef.current = permission;
  }, [permission]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Centralized toast helper — ensures each notification toasts exactly once
  const moderationTypes = ['low_rating_warning', 'account_suspended', 'account_blocked'];

  const showNotificationToast = (n: Notification) => {
    if (toastedIdsRef.current.has(n.id)) return;
    if (moderationTypes.includes(n.type)) return;

    const currentPrefs = preferencesRef.current;
    if (!isPushEnabled(currentPrefs)) return;

    if (n.type === 'nearby_donation') {
      playDonationAlertSound();
    } else {
      playNotificationSound();
    }
    toast.info(n.title, { description: n.message });

    toastedIdsRef.current.add(n.id);
    // Cap size to prevent unbounded growth
    if (toastedIdsRef.current.size > 200) {
      const first = toastedIdsRef.current.values().next().value;
      if (first) toastedIdsRef.current.delete(first);
    }
  };

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled!');
      }
    }
  };

  // Load user notification preferences
  useEffect(() => {
    if (!user) {
      setPreferences(null);
      return;
    }

    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_push, notification_email, user_type')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading notification preferences:', error);
        return;
      }

      setPreferences(data);
    };

    loadPreferences();

    // Subscribe to profile changes to update preferences in real-time
    const channel = supabase
      .channel('profile-preferences')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setPreferences({
            notification_push: updated.notification_push,
            notification_email: updated.notification_email,
            user_type: updated.user_type,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      const allNotifications = (data as Notification[]) || [];
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);

      // Show toasts for recent unread notifications (arrived while app was away)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const recentUnread = allNotifications.filter(
        n => !n.read && n.created_at && n.created_at > twoMinutesAgo
      );

      for (const n of recentUnread) {
        showNotificationToast(n);
      }

      // Set lastCheckedAt to the most recent notification timestamp to avoid re-toasting
      if (allNotifications.length > 0 && allNotifications[0].created_at) {
        lastCheckedAtRef.current = allNotifications[0].created_at;
      } else {
        lastCheckedAtRef.current = new Date().toISOString();
      }
    };

    loadNotifications();
  }, [user]);

  // Real-time subscription for new notifications with health monitoring
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = () => {
      // Clean up previous channel if any
      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel('notifications-' + Date.now())
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            
            // Deduplicate: if polling already picked this up, skip
            const alreadyExists = notificationsRef.current.some(n => n.id === newNotification.id);
            if (alreadyExists) return;
            
            // Keep polling ref in sync
            lastCheckedAtRef.current = new Date().toISOString();

            // Add to state
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Browser notification (separate from toast dedup)
            if (isPushEnabled(preferencesRef.current) && permissionRef.current === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
                tag: newNotification.id,
              });
            }

            showNotificationToast(newNotification);
          }
        )
        .subscribe((status) => {
          // Monitor channel health — auto-reconnect on error
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('Notification channel error, reconnecting...', status);
            setTimeout(() => setupSubscription(), 1000);
          }
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, permission]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => {
      const deletedNotification = notifications.find(n => n.id === notificationId);
      return deletedNotification && !deletedNotification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const deleteAllNotifications = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('Failed to delete notifications');
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    toast.success('All notifications removed');
  };

  // Auto-prompt push permission for receivers and register SW
  useEffect(() => {
    if (
      user &&
      (preferences?.user_type === 'receiver' || preferences?.user_type === 'both') &&
      'Notification' in window
    ) {
      if (permission === 'default') {
        requestPermission();
      }
      if (permission === 'granted') {
        registerServiceWorkerAndSubscribe(user.id);
      }
    }
  }, [user, preferences?.user_type, permission]);

  // Visibility-based polling fallback for mobile
  useEffect(() => {
    if (!user) return;

    const moderationTypes = ['low_rating_warning', 'account_suspended', 'account_blocked'];

    const pollForMissedNotifications = async () => {
      const since = lastCheckedAtRef.current;
      const now = new Date().toISOString();

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .gt('created_at', since)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error polling notifications:', error);
          return;
        }

        if (!data || data.length === 0) {
          lastCheckedAtRef.current = now;
          return;
        }

        // Deduplicate against current state
        const existingIds = new Set(notificationsRef.current.map(n => n.id));
        const newOnes = (data as Notification[]).filter(n => !existingIds.has(n.id));

        if (newOnes.length > 0) {
          setNotifications(prev => [...newOnes.reverse(), ...prev]);
          setUnreadCount(prev => prev + newOnes.filter(n => !n.read).length);

          for (const n of newOnes) {
            showNotificationToast(n);
          }
        }

        lastCheckedAtRef.current = now;
      } catch (e) {
        console.error('Unexpected error polling notifications:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollForMissedNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', pollForMissedNotifications);
    const intervalId = setInterval(pollForMissedNotifications, 5000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', pollForMissedNotifications);
      clearInterval(intervalId);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    permission,
    preferences,
    requestPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};
