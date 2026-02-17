import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, ShieldBan, ShieldAlert } from 'lucide-react';

type ModerationState =
  | { type: 'none' }
  | { type: 'warning'; message: string }
  | { type: 'suspended'; until: string; message: string }
  | { type: 'blocked'; message: string };

export default function AccountModerationOverlay() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<ModerationState>({ type: 'none' });

  // Fetch profile moderation status on mount
  useEffect(() => {
    if (!user) return;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('suspended_until, permanently_blocked')
        .eq('id', user.id)
        .single();

      if (!data) return;

      if (data.permanently_blocked) {
        setState({
          type: 'blocked',
          message:
            'Your account has been permanently blocked due to consistently low food quality ratings across 7 donations. You can no longer use this platform.',
        });
      } else if (
        data.suspended_until &&
        new Date(data.suspended_until) > new Date()
      ) {
        setState({
          type: 'suspended',
          until: data.suspended_until,
          message:
            'Your account has been suspended due to consistently low ratings on your donations. Please ensure food quality and hygiene standards.',
        });
      }
    };

    fetchStatus();
  }, [user]);

  // Listen for realtime moderation notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('moderation-overlay')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as { type: string; message: string };

          if (notif.type === 'account_blocked') {
            setState({
              type: 'blocked',
              message: notif.message,
            });
          } else if (notif.type === 'account_suspended') {
            // Re-fetch profile to get the suspension end date
            supabase
              .from('profiles')
              .select('suspended_until')
              .eq('id', user.id)
              .single()
              .then(({ data }) => {
                setState({
                  type: 'suspended',
                  until: data?.suspended_until || '',
                  message: notif.message,
                });
              });
          } else if (notif.type === 'low_rating_warning') {
            setState({
              type: 'warning',
              message: notif.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (state.type === 'none') return null;

  const handleDismissWarning = () => setState({ type: 'none' });

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        className={`max-w-md sm:max-w-lg ${
          state.type === 'warning'
            ? 'border-yellow-500/50'
            : 'border-destructive/50'
        }`}
        style={{ zIndex: 99999 }}
      >
        <AlertDialogHeader className="items-center text-center">
          {state.type === 'warning' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <AlertDialogTitle className="text-xl text-yellow-700 dark:text-yellow-400">
                ⚠️ Quality Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base leading-relaxed">
                {state.message}
              </AlertDialogDescription>
            </>
          )}

          {state.type === 'suspended' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl text-destructive">
                🚫 Account Suspended
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base leading-relaxed">
                {state.message}
              </AlertDialogDescription>
              {state.until && (
                <p className="mt-2 text-sm font-semibold text-destructive">
                  Suspension lifts on:{' '}
                  {new Date(state.until).toLocaleString()}
                </p>
              )}
            </>
          )}

          {state.type === 'blocked' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldBan className="h-8 w-8 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl text-destructive">
                ⛔ Account Permanently Blocked
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base leading-relaxed">
                {state.message}
              </AlertDialogDescription>
            </>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center">
          {state.type === 'warning' && (
            <AlertDialogAction
              onClick={handleDismissWarning}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              I Understand
            </AlertDialogAction>
          )}
          {state.type === 'suspended' && (
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          )}
          {state.type === 'blocked' && (
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
