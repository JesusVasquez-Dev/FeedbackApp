import { Routes, Route, Navigate, Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDetail from './pages/EmployeeDetail';
import { useAuth } from './modules/auth/AuthContext';
import { getProfile } from './modules/api/me';
import OnboardingLayout from './pages/onboarding/Layout';
import Welcome from './pages/onboarding/Welcome';
import Profile from './pages/onboarding/Profile';
import Team from './pages/onboarding/Team';
import Preferences from './pages/onboarding/Preferences';
import Survey from './pages/onboarding/Survey';
import Finish from './pages/onboarding/Finish';

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="container-app mt-16">Loading...</div>;
  if (!session) {
    const mainLoginUrl = (import.meta as any).env?.VITE_MAIN_LOGIN_URL || 'http://localhost:5173/login';
    const redirect = encodeURIComponent(window.location.href);
    // Hard redirect to external login and come back here after login. Tag request as coming from onboarding.
    const sep = mainLoginUrl.includes('?') ? '&' : '?';
    window.location.href = `${mainLoginUrl}${sep}redirect_to=${redirect}&from=onboarding`;
    return null;
  }
  return children;
}

function OnboardingGuard({ children, completed }: { children: JSX.Element; completed: boolean | null }) {
  // Wait until completion status is known to avoid flashing the wizard
  if (completed === null) {
    return <div className="container-app mt-16">Loading...</div>;
  }
  // If onboarding is marked complete, send user to the employee dashboard instead of the wizard
  if (completed === true) {
    return <Navigate to="/employee" replace />;
  }
  return children;
}

function CompletedOnly({ children, completed }: { children: JSX.Element; completed: boolean | null }) {
  // Wait until completion status is known
  if (completed === null) {
    return <div className="container-app mt-16">Loading...</div>;
  }
  // If onboarding is NOT complete, force user back into the wizard
  if (completed !== true) {
    return <Navigate to="/onboarding/welcome" replace />;
  }
  return children;
}

export default function App() {
  const { session } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = (session as any)?.user?.id;
        if (!userId) { setCompleted(null); return; }
        const email = (session as any)?.user?.email as string | undefined;
        const { profile } = await getProfile(userId, email);
        const rawCP: any = (profile as any)?.CompletionPercent;
        const percent = typeof rawCP === 'number'
          ? rawCP
          : (typeof rawCP === 'string' && rawCP.trim() !== '' && !Number.isNaN(Number(rawCP)) ? Number(rawCP) : null);
        setCompleted(typeof percent === 'number' ? percent >= 100 : false);
      } catch {
        // If we cannot load status, default to NOT completed
        setCompleted(false);
      }
    })();
  }, [session?.user?.id]);
  // Redirect target for the main dashboard (another project)
  const mainDashboardUrl = (import.meta as any).env?.VITE_MAIN_DASHBOARD_URL || 'http://localhost:5173/dashboard';

  const goToMainDashboard = () => {
    window.location.href = mainDashboardUrl;
  };

  return (
    <div>
      <header className="bg-white border-b border-gray-200">
        <div className="container-app flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white grid place-items-center">OB</div>
            Onboarding
          </Link>
          <nav className="flex items-center gap-4">
            {session ? (
              <>
                <button className="btn btn-outline" onClick={goToMainDashboard}>Return to Main Dashboard</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">Login</Link>
            )}
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Onboarding Wizard (protected) */}
          <Route
            path="/onboarding"
            element={
              <Protected>
                <OnboardingGuard completed={completed}>
                  <OnboardingLayout />
                </OnboardingGuard>
              </Protected>
            }
          >
            <Route path="welcome" element={<Welcome />} />
            <Route path="profile" element={<Profile />} />
            <Route path="team" element={<Team />} />
            <Route path="preferences" element={<Preferences />} />
            <Route path="survey" element={<Survey />} />
            <Route path="finish" element={<Finish />} />
            <Route path="" element={<Navigate to="welcome" replace />} />
          </Route>
          <Route
            path="/employee"
            element={
              <Protected>
                <CompletedOnly completed={completed}>
                  <EmployeeDashboard />
                </CompletedOnly>
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route
            path="/admin/employees/:id"
            element={
              <Protected>
                <EmployeeDetail />
              </Protected>
            }
          />
          <Route
            path="/"
            element={
              session ? (
                completed === null ? (
                  <div className="container-app mt-16">Loading...</div>
                ) : (
                  <Navigate to={completed ? '/employee' : '/onboarding/welcome'} replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
