import React, { useEffect, useState } from 'react';
import Card from '../modules/ui/Card';
import { useAuth } from '../modules/auth/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase } from '../modules/auth/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signInWithPassword, session, loading } = useAuth();
  const location = useLocation();

  function getRedirectTo(): string {
    const params = new URLSearchParams(location.search);
    const fromParam = params.get('redirect_to');
    // Default fallback is the main dashboard on this site
    const fallback = `${window.location.origin}/dashboard`;

    if (!fromParam) return fallback;
    try {
      const targetUrl = new URL(fromParam);

      const allowedRaw = [
        (import.meta as any).env?.VITE_ONBOARDING_URL,
        (import.meta as any).env?.VITE_ADMIN_URL,
        (import.meta as any).env?.VITE_MANAGER_URL,
        (import.meta as any).env?.VITE_CLIENTS_URL,
        (import.meta as any).env?.VITE_COMPANY_URL,
        (import.meta as any).env?.VITE_EMPLOYEE_URL,
        (import.meta as any).env?.VITE_MAIN_DASHBOARD_URL,
      ].filter(Boolean) as string[];

      const allowedOrigins = allowedRaw
        .map((u) => {
          try {
            return new URL(u).origin;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];

      if (allowedOrigins.includes(targetUrl.origin)) return targetUrl.toString();

      return fallback;
    } catch {
      return fallback;
    }
  }

  // If already authenticated on load, send tokens to redirect_to (or onboarding)
  useEffect(() => {
    (async () => {
      if (!session) return;
      const redirectTo = getRedirectTo();
      const access = session.access_token;
      const refresh = session.refresh_token;
      try {
        const url = new URL(redirectTo);
        // Only append tokens when redirecting to a different origin (e.g., onboarding app)
        const isCrossOrigin = url.origin !== window.location.origin;
        if (isCrossOrigin && access && refresh) {
          url.searchParams.set('access_token', access);
          url.searchParams.set('refresh_token', refresh);
        }
        window.location.href = url.toString();
      } catch {
        // Fallback to plain href if URL parse fails
        window.location.href = redirectTo;
      }
    })();
  }, [session]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signInWithPassword(email, password);
      // After successful auth, fetch session and redirect
      const { data } = await supabase.auth.getSession();
      const access = data.session?.access_token;
      const refresh = data.session?.refresh_token;
      const redirectTo = getRedirectTo();
      try {
        const url = new URL(redirectTo);
        const isCrossOrigin = url.origin !== window.location.origin;
        if (isCrossOrigin && access && refresh) {
          url.searchParams.set('access_token', access);
          url.searchParams.set('refresh_token', refresh);
        }
        window.location.href = url.toString();
      } catch {
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl mb-4 shadow-lg">
            H
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Hub</h1>
          <p className="text-muted-foreground">Your centralized workspace portal</p>
        </div>
        <Card title="Welcome">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="mb-2">
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to access your workspace
              </p>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              className="btn btn-primary w-full transition hover:brightness-95"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Please wait…' : 'Sign In'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
