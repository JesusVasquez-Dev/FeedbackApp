import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadOnboarding } from '../../modules/onboarding/state';
import Stepper, { Step } from '../../modules/ui/Stepper';

const steps: Step[] = [
  { path: '/onboarding/welcome', label: 'Welcome' },
  { path: '/onboarding/profile', label: 'Profile' },
  { path: '/onboarding/team', label: 'Team' },
  { path: '/onboarding/preferences', label: 'Preferences' },
  { path: '/onboarding/survey', label: 'Survey' },
  { path: '/onboarding/finish', label: 'Complete' },
];

export default function OnboardingLayout() {
  const state = loadOnboarding();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Determine the allowed step route from localStorage (acts as a guard)
  const allowedPath = (() => {
    try {
      const p = localStorage.getItem('onboarding_current_path');
      return p || '/onboarding/welcome';
    } catch {
      return '/onboarding/welcome';
    }
  })();

  // If user tries to deep-link to a FUTURE step (beyond allowed), redirect back to allowed.
  // Allow backward navigation to earlier steps (e.g., Welcome).
  useEffect(() => {
    if (!pathname.startsWith('/onboarding/')) return;
    const findIndex = (p: string) => steps.findIndex((s) => p.startsWith(s.path));
    const currentIdx = findIndex(pathname);
    const allowedIdx = findIndex(allowedPath);
    if (currentIdx === -1 || allowedIdx === -1) return;
    if (currentIdx > allowedIdx) {
      navigate(allowedPath, { replace: true });
    }
  }, [pathname, allowedPath, navigate]);

  // Keep URL bar fixed at /onboarding while allowing nested pages to render.
  useEffect(() => {
    if (pathname.startsWith('/onboarding/') || pathname === '/onboarding') {
      // Replace only if not already exactly '/onboarding'
      if (window.location.pathname !== '/onboarding') {
        window.history.replaceState(null, '', '/onboarding');
      }
    }
  }, [pathname]);

  return (
    <div className="container-app py-8">
      <div className="mb-6">
        <Stepper steps={steps} />
      </div>

      <div className="mx-auto max-w-3xl">
        <Outlet />
      </div>

      {state.completed ? (
        <div className="mt-8 text-sm text-green-700">Setup complete. You can visit the milestones dashboard.</div>
      ) : null}
    </div>
  );
}
