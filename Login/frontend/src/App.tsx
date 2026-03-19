import { Routes, Route, Navigate, Link } from 'react-router-dom';
import React from 'react';
import { useLocation } from 'react-router-dom';
import Login from './pages/Login';
import MainDashboard from './pages/MainDashboard';
import Index from './pages/Index';
import { useAuth } from './modules/auth/AuthContext';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="container-app mt-16">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RootRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect_to');

  if (!loading && !session && redirectTo) {
    return <Navigate to={`/login${location.search || ''}`} replace />;
  }

  return <Index />;
}

function LoginRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect_to');

  if (loading) return <div className="container-app mt-16">Loading...</div>;

  // If already signed in but coming from a portal with redirect_to, render Login so it can
  // forward tokens cross-app (instead of forcing /dashboard).
  if (session && redirectTo) return <Login />;

  if (session) return <Navigate to="/dashboard" replace />;

  return <Login />;
}

export default function App() {
  const { session, loading } = useAuth();
  return (
    <main>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginRoute />
          }
        />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <MainDashboard />
            </Protected>
          }
        />
        <Route path="/" element={<RootRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
