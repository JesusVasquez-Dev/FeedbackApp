import { Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { useAuth } from './modules/auth/AuthContext';
import EmployeePortal from './pages/AdminPortal';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="container-app mt-16">Loading...</div>;
  if (!session) {
    const loginUrl =
      (import.meta as any).env?.VITE_LOGIN_URL ||
      (import.meta as any).env?.VITE_MAIN_LOGIN_URL ||
      'http://localhost:5173/login';
    const redirect = encodeURIComponent(window.location.href);
    const sep = loginUrl.includes('?') ? '&' : '?';
    window.location.href = `${loginUrl}${sep}redirect_to=${redirect}`;
    return null;
  }
  return children;
}

export default function App() {
  const { session } = useAuth();

  return (
    <div>
      <main>
        <Routes>
          <Route
            path="/employee"
            element={
              <Protected>
                <EmployeePortal />
              </Protected>
            }
          />
          <Route
            path="/"
            element={
              <Protected>
                <EmployeePortal />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
