import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, phoneNumber: string, userType: string, avatarUrl?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Safety timeout: if auth never resolves (slow network), stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        clearTimeout(timeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string, phoneNumber: string, userType: string, avatarUrl?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          user_type: userType,
          avatar_url: avatarUrl,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sign-in timed out. Please check your internet connection and try again.')), 15000)
      );
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { error };
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err instanceof TypeError) {
        return { error: { message: 'Network error. Please check your internet connection and try again.' } };
      }
      return { error: { message: err?.message || 'An unexpected error occurred. Please try again.' } };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      
      // Attempt to sign out from server
      const { error } = await supabase.auth.signOut();
      
      // Navigate away regardless of error (session might already be expired)
      navigate('/');
      
      // Only log error in development, don't throw
      if (error && import.meta.env.DEV) {
        console.error('Sign out error (non-critical):', error.message);
      }
    } catch (error) {
      // Still navigate even if there's an exception
      navigate('/');
      if (import.meta.env.DEV) {
        console.error('Sign out exception:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
