import { Routes, Route, Navigate, Link } from 'react-router-dom';
import React from 'react';
import { useAuth } from './modules/auth/AuthContext';
import EmployeePortal from './pages/EmployeePortal';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="container-app mt-16">Loading...</div>;
  if (!session) {
    const mainLoginUrl = (() => {
      const raw =
        (import.meta as any).env?.VITE_LOGIN_URL ||
        (import.meta as any).env?.VITE_MAIN_LOGIN_URL ||
        'http://localhost:5173/login';
      try {
        const u = new URL(raw);
        if (!u.pathname || u.pathname === '/') u.pathname = '/login';
        return u.toString();
      } catch {
        return raw;
      }
    })();
    const redirect = encodeURIComponent(window.location.href);
    const sep = mainLoginUrl.includes('?') ? '&' : '?';
    window.location.href = `${mainLoginUrl}${sep}redirect_to=${redirect}`;
    return null;
  }
  return children;
}

export default function App() {
  const { session } = useAuth();
  // Redirect target for the main dashboard (another project)
  const mainDashboardUrl = (import.meta as any).env?.VITE_MAIN_DASHBOARD_URL || 'http://localhost:5173/dashboard';
  const mainLoginUrl = (import.meta as any).env?.VITE_MAIN_LOGIN_URL || 'http://localhost:5173/login';

  const goToMainDashboard = () => {
    window.location.href = mainDashboardUrl;
  };

  return (
    <div>
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Protected>
                <EmployeePortal />
              </Protected>
            }
          />
          <Route
            path="/employee"
            element={
              session ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
