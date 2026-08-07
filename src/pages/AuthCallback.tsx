import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';

/**
 * Completes the full-page OAuth redirect flow.
 * The OAuth broker sends the user back here with tokens in the URL
 * (hash or query). We exchange them for a session and continue.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const pick = (key: string) => hash.get(key) || query.get(key);

      const errorDescription = pick('error_description') || pick('error');
      const accessToken = pick('access_token');
      const refreshToken = pick('refresh_token');

      // Clean sensitive params out of the URL right away
      window.history.replaceState(null, '', '/auth/callback');

      if (errorDescription) {
        toast.error(errorDescription, { duration: 6000 });
        navigate('/auth', { replace: true });
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          toast.error(error.message, { duration: 6000 });
          navigate('/auth', { replace: true });
          return;
        }
        navigate('/dashboard', { replace: true });
        return;
      }

      // No tokens in the URL - maybe the session was already persisted
      const { data } = await supabase.auth.getSession();
      navigate(data.session ? '/dashboard' : '/auth', { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Heart className="h-10 w-10 text-primary animate-pulse" />
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}
