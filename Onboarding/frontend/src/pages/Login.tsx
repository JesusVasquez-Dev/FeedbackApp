import React, { useState } from 'react';
import Card from '../modules/ui/Card';
import { useAuth } from '../modules/auth/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const { signInWithPassword, signUpWithPassword, session, loading } = useAuth();

  // If already authenticated, go to root so App can decide (by CompletionPercent)
  if (session) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    }
  }

  return (
    <div className="container-app py-16 max-w-md">
      <Card title={mode === 'signin' ? 'Sign in' : 'Create account'}>
        <form className="space-y-4" onSubmit={onSubmit}>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <div className="text-xs text-gray-600 text-center">
            {mode === 'signin' ? (
              <span>
                Don’t have an account?{' '}
                <button type="button" className="link" onClick={() => setMode('signup')}>Create one</button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button type="button" className="link" onClick={() => setMode('signin')}>Sign in</button>
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

