import { Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { useAuth } from './modules/auth/AuthContext';
import ClientsPortal from './pages/ClientsPortal';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="container-app mt-16">Loading...</div>;
  // TEMP: allow access even without a local session so we don't bounce back to Login
  return children;
}

export default function App() {
  const { session } = useAuth();

  return (
    <div>
      <main>
        <Routes>
          <Route
            path="/clients"
            element={
              <Protected>
                <ClientsPortal />
              </Protected>
            }
          />
          <Route
            path="/"
            element={
              <Protected>
                <ClientsPortal />
              </Protected>
            }
          />
          <Route path="/employee" element={<Navigate to="/clients" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/clients" replace />} />
        </Routes>
      </main>
    </div>
  );
}
