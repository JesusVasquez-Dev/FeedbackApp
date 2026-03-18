import { Routes, Route, Navigate, Link } from 'react-router-dom';
import React from 'react';
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

export default function App() {
  const { session, loading } = useAuth();
  return (
    <main>
      <Routes>
        <Route
          path="/login"
          element={
            loading ? (
              <div className="container-app mt-16">Loading...</div>
            ) : session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
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
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
