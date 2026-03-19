import React from 'react';
import { Bell, Settings as Cog, LogOut } from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { supabase } from '../modules/auth/supabaseClient';
import { useProfileName } from '../modules/profile/useProfileName';

export default function MainDashboard() {
  const { session, user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [roles, setRoles] = React.useState<string[] | null>(null);
  const [rolesError, setRolesError] = React.useState<string | null>(null);

  const [displayName, setDisplayName] = React.useState<string>(
    (user?.user_metadata?.full_name as string | undefined) ||
      user?.email?.split('@')[0] ||
      'Guest'
  );
  const avatarInitial = displayName[0]?.toUpperCase() ?? 'G';

  // Unified profile name hook (used across apps)
  const { firstName: profFirst } = useProfileName(user?.id, user?.email || undefined);

  React.useEffect(() => {
    document.title = 'Main Dashboard';
  }, []);

  // When hook returns a first name, update greeting
  React.useEffect(() => {
    if (profFirst && profFirst.trim()) setDisplayName(profFirst.trim());
  }, [profFirst]);

  // Load roles (two-step to avoid required DB relationship naming)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id || user?.id;
        if (!uid) {
          if (!cancelled) setRoles([]);
          return;
        }
        // 1) fetch role ids for this profile
        const { data: prData, error: prError } = await supabase
          .schema('feedbackApp')
          .from('ProfileRoles')
          .select('idRol')
          .eq('idProfile', uid);
        if (prError) throw prError;
        const roleIds = (prData || []).map((r: any) => r.idRol).filter((v: any) => v !== null);
        if (!roleIds.length) {
          if (!cancelled) setRoles([]);
          return;
        }
        // 2) fetch role names from Roles
        const { data: rolesData, error: rolesErr } = await supabase
          .schema('feedbackApp')
          .from('Roles')
          .select('Role, id')
          .in('id', roleIds);
        if (rolesErr) throw rolesErr;
        const names = (rolesData || [])
          .map((r: any) => r?.Role as string | undefined)
          .filter(Boolean) as string[];
        if (!cancelled) setRoles(Array.from(new Set(names)));
      } catch (e: any) {
        if (!cancelled) {
          setRolesError(e?.message || 'Failed to load roles');
          setRoles([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  async function openOnboarding() {
    const url = import.meta.env.VITE_ONBOARDING_URL as string | undefined;
    if (!url) {
      alert('Onboarding URL is not configured. Please set VITE_ONBOARDING_URL in your frontend environment.');
      return;
    }
    try {
      const target = new URL(url);
      // Land on app root to avoid static-host deep-link 404s; the app will route internally after session is set
      target.pathname = '/';
      // Ensure we use the freshest session from Supabase
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token || session?.access_token;
      const refresh_token = data.session?.refresh_token || session?.refresh_token;
      if (access_token && refresh_token) {
        target.searchParams.set('access_token', access_token);
        target.searchParams.set('refresh_token', refresh_token);
      }
      // Navigate in the same tab
      window.location.href = target.toString();
    } catch {
      window.location.href = url; // fallback
    }
  }

  async function openEmployee() {
    const url = import.meta.env.VITE_EMPLOYEE_URL as string | undefined;
    if (!url) {
      alert('Employee URL is not configured. Please set VITE_EMPLOYEE_URL in your frontend environment.');
      return;
    }
    try {
      const target = new URL(url);
      // Always land on the employee route
      target.pathname = '/employee';
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token || session?.access_token;
      const refresh_token = data.session?.refresh_token || session?.refresh_token;
      if (access_token && refresh_token) {
        target.searchParams.set('access_token', access_token);
        target.searchParams.set('refresh_token', refresh_token);
      }
      window.location.href = target.toString();
    } catch {
      window.location.href = url; // fallback
    }
  }

  async function openManager() {
    const url = import.meta.env.VITE_MANAGER_URL as string | undefined;
    if (!url) {
      alert('Manager URL is not configured. Please set VITE_MANAGER_URL in the Login frontend .env file.');
      return;
    }
    try {
      const target = new URL(url);
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token || session?.access_token;
      const refresh_token = data.session?.refresh_token || session?.refresh_token;
      if (access_token && refresh_token) {
        target.searchParams.set('access_token', access_token);
        target.searchParams.set('refresh_token', refresh_token);
      }
      window.location.href = target.toString();
    } catch {
      window.location.href = url;
    }
  }

  async function openCompany() {
    const url = (import.meta.env.VITE_CLIENTS_URL || import.meta.env.VITE_COMPANY_URL) as string | undefined;
    if (!url) {
      alert('Clients URL is not configured. Please set VITE_CLIENTS_URL in your frontend environment.');
      return;
    }
    try {
      const target = new URL(url);
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token || session?.access_token;
      const refresh_token = data.session?.refresh_token || session?.refresh_token;
      if (access_token && refresh_token) {
        target.searchParams.set('access_token', access_token);
        target.searchParams.set('refresh_token', refresh_token);
      }
      window.location.href = target.toString();
    } catch {
      window.location.href = url;
    }
  }

  async function openAdmin() {
    const url = import.meta.env.VITE_ADMIN_URL as string | undefined;
    if (!url) {
      alert('Admin URL is not configured. Please set VITE_ADMIN_URL in the Login frontend .env file.');
      return;
    }
    try {
      const target = new URL(url);
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token || session?.access_token;
      const refresh_token = data.session?.refresh_token || session?.refresh_token;
      if (access_token && refresh_token) {
        target.searchParams.set('access_token', access_token);
        target.searchParams.set('refresh_token', refresh_token);
      }
      window.location.href = target.toString();
    } catch {
      window.location.href = url;
    }
  }

  const apps = [
    {
      icon: '🏁',
      title: 'Onboarding',
      description: 'Complete your onboarding journey and get familiar with the team.',
      onClick: openOnboarding,
    },
    {
      icon: '👥',
      title: 'Employee Portal',
      description: 'Access employee resources, time tracking, and personal information.',
      onClick: openEmployee,
    },
    {
      icon: '🔑',
      title: 'Manager Portal',
      description: 'Manage your team, review requests, and track team performance.',
      onClick: openManager,
    },
    {
      icon: '📁',
      title: 'Clients',
      description: 'Give feedback about employees and manage your team.',
      onClick: openCompany,
    },
    {
      icon: '⚙️',
      title: 'Super Admin',
      description: 'Full system access and administration capabilities.',
      onClick: openAdmin,
    },
  ];

  // Compute visible apps from roles
  const getAllowedTitles = React.useCallback((roleNames: string[]): Set<string> => {
    const allowed = new Set<string>();
    const normalized = roleNames.map((r) => r.trim().toLowerCase());
    if (normalized.includes('admin')) {
      apps.forEach((a) => allowed.add(a.title));
      return allowed;
    }
    if (normalized.includes('employee')) {
      allowed.add('Onboarding');
      allowed.add('Employee Portal');
    }
    if (normalized.includes('manager')) {
      // Managers are also employees
      allowed.add('Onboarding');
      allowed.add('Employee Portal');
      allowed.add('Manager Portal');
    }
    if (normalized.includes('company')) {
      allowed.add('Clients');
    }
    return allowed;
  }, [apps]);

  const visibleApps = React.useMemo(() => {
    if (roles === null) return [] as typeof apps;
    const titles = getAllowedTitles(roles);
    return apps.filter((a) => titles.has(a.title));
  }, [apps, roles, getAllowedTitles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container-app h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground grid place-items-center font-semibold text-sm">
              H
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold">Hub</span>
              <span className="text-xs text-muted-foreground">Your Workspace Portal</span>
            </div>
          </div>
          <div ref={menuRef} className="relative flex items-center gap-4">
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-gray-600 hover:bg-gray-100 transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-cyan-500 text-white grid place-items-center text-sm font-semibold hover:brightness-110 transition"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {avatarInitial}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-56 rounded-xl bg-white shadow-lg border overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 text-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <Cog className="w-4 h-4 text-purple-600" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 text-gray-700 border-t"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                  }}
                >
                  <LogOut className="w-4 h-4 text-sky-700" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container-app py-10 space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">
            Welcome back, {displayName}! <span className="align-middle">👋</span>
          </h1>
          <p className="text-muted-foreground">Access your workspace applications below</p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {roles === null && (
            <div className="col-span-full text-sm text-muted-foreground">Loading your apps...</div>
          )}
          {rolesError && (
            <div className="col-span-full text-sm text-red-600">{rolesError}</div>
          )}
          {visibleApps.map((app, index) => (
            <article
              key={index}
              className="group emp-card p-6 flex flex-col justify-between transition duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <span className="text-lg">{app.icon}</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">{app.title}</h2>
                  <p className="text-sm text-muted-foreground">{app.description}</p>
                </div>
              </div>
              <button
                className="mt-6 emp-btn-inline inline-flex items-center justify-between w-full"
                onClick={app.onClick}
              >
                <span>Open App</span>
                <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
