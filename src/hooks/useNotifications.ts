import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  user_id: string;
  type: 'request_approved' | 'message_received' | 'extension_request' | 'extension_granted' | 'extension_rejected' | 'donation_cancelled';
  title: string;
  message: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationPreferences {
  notification_push: boolean | null;
  notification_email: boolean | null;
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
  
  // Use ref to always have latest preferences in realtime callback
  const preferencesRef = useRef<NotificationPreferences | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

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
        .select('notification_push, notification_email')
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

      setNotifications(data as Notification[] || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    };

    loadNotifications();
  }, [user]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
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
          
          // Add to state
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Use ref to get latest preferences (avoids stale closure)
          const currentPrefs = preferencesRef.current;

          const pushEnabled = isPushEnabled(currentPrefs);

          // Only show browser notification if push notifications are enabled
          if (pushEnabled && permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico',
              tag: newNotification.id,
            });
          }

          // Only show toast notification if push notifications are enabled
          if (pushEnabled) {
            toast.info(newNotification.title, {
              description: newNotification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
