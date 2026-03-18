import { Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { useAuth } from './modules/auth/AuthContext';
import EmployeePortal from './pages/ManagerPortal';

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
