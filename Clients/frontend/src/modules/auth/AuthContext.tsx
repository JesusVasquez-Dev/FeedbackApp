import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithOtp: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: { subscription: { unsubscribe: () => void } } | null = null;
    (async () => {
      setLoading(true);
      try {
        const url = new URL(window.location.href);

        const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
        const qpAccess = url.searchParams.get('access_token');
        const qpRefresh = url.searchParams.get('refresh_token');
        const hashAccess = hashParams.get('access_token');
        const hashRefresh = hashParams.get('refresh_token');
        const code = url.searchParams.get('code');

        const access = qpAccess || hashAccess;
        const refresh = qpRefresh || hashRefresh;

        if (access && refresh) {
          try {
            await supabase.auth.signOut();
          } catch {}
          const { data, error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
          if (!error) {
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
          }
          url.searchParams.delete('access_token');
          url.searchParams.delete('refresh_token');
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setSession(data.session ?? null);
            setUser(data.session?.user ?? null);
          }
          url.searchParams.delete('code');
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        } else {
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } finally {
        setLoading(false);
      }

      // Subscribe after initial session resolution
      const subResult = supabase.auth.onAuthStateChange((_event: string, sess: Session | null) => {
        setSession(sess);
        setUser(sess?.user ?? null);
      });
      unsub = subResult.data as any;
    })();

    return () => {
      if (unsub) unsub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    async signInWithOtp(email: string) {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      setLoading(false);
      if (error) throw error;
    },
    async signInWithPassword(email: string, password: string) {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) throw error;
      setSession(data.session);
      setUser(data.user ?? null);
    },
    async signUpWithPassword(email: string, password: string) {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) throw error;
      // Depending on project settings, user may need email confirmation
      setSession(data.session ?? null);
      setUser(data.user ?? null);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
