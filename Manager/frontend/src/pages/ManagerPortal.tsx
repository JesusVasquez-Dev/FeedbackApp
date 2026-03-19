import { useEffect, useState } from "react";
import ManagerSidebar from "@/pages/manager/ManagerSidebar";
import SurveysManager from "@/pages/manager/SurveysManager";
import CompanySurveysManager from "./manager/CompanySurveysManager";
import FeedbackManager from "@/pages/manager/FeedbackManager";
import CompanyFeedbackManager from "./manager/CompanyFeedbackManager";
import RequestsManager from "@/pages/manager/RequestsManager";
import EmployeeManagement from "@/pages/manager/EmployeeManagement";
import WeeklyKPIPulse from "@/pages/manager/WeeklyKPIPulse";
import TeamMetrics from "@/pages/manager/TeamMetrics";
import EngagementDashboard from "@/pages/manager/EngagementDashboard";
import ManagerTimeTracker from "@/pages/manager/ManagerTimeTracker";
import { Bell, LogOut, ArrowLeftCircle } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { supabase } from "@/modules/auth/supabaseClient";
import { getProfile } from "@/modules/api/me";

type ManagerSection =
  | "employees"
  | "kpi-surveys"
  | "requests"
  | "time-tracker"
  | "metrics"
  | "engagement"
  | "surveys-employee-create"
  | "surveys-employee-results"
  | "surveys-company-create"
  | "surveys-company-results"
  | "feedback-employee"
  | "feedback-company";

function ManagerContent({ section }: { section: ManagerSection }) {
  const titles: Record<ManagerSection, string> = {
    employees: "My Team",
    "kpi-surveys": "Employee KPI Surveys",
    requests: "Employee Requests",
    "time-tracker": "Time Tracker",
    metrics: "Team Metrics",
    engagement: "Engagement & Remote Work",
    "surveys-employee-create": "Employee: Create Survey",
    "surveys-employee-results": "Employee: Survey Results",
    "surveys-company-create": "Client: Create Survey",
    "surveys-company-results": "Client: Survey Results",
    "feedback-employee": "Employee Feedback",
    "feedback-company": "Client Escalations",
  };

  if (section === 'employees') {
    return (
      <div className="space-y-4">
        <EmployeeManagement />
      </div>
    );
  }

  if (section === 'kpi-surveys') {
    return (
      <div className="space-y-4">
        <WeeklyKPIPulse />
      </div>
    );
  }

  if (section === 'surveys-employee-create') {
    return (
      <div className="space-y-4">
        <SurveysManager view="create" />
      </div>
    );
  }

  if (section === 'surveys-employee-results') {
    return (
      <div className="space-y-4">
        <SurveysManager view="results" />
      </div>
    );
  }

  if (section === 'surveys-company-create') {
    return (
      <div className="space-y-4">
        <CompanySurveysManager view="create" />
      </div>
    );
  }

  if (section === 'surveys-company-results') {
    return (
      <div className="space-y-4">
        <CompanySurveysManager view="results" />
      </div>
    );
  }

  if (section === 'feedback-employee') {
    return (
      <div className="space-y-4">
        <FeedbackManager />
      </div>
    );
  }

  if (section === 'feedback-company') {
    return (
      <div className="space-y-4">
        <CompanyFeedbackManager />
      </div>
    );
  }

  if (section === 'requests') {
    return (
      <div className="space-y-4">
        <RequestsManager />
      </div>
    );
  }

  if (section === 'time-tracker') {
    return (
      <div className="space-y-4">
        <ManagerTimeTracker />
      </div>
    );
  }

  if (section === 'metrics') {
    return (
      <div className="space-y-4">
        <TeamMetrics />
      </div>
    );
  }

  if (section === 'engagement') {
    return (
      <div className="space-y-4">
        <EngagementDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{titles[section]}</h1>
      <p className="text-sm text-muted-foreground">
        This is the {titles[section]} section for managers. You can later connect this view to
        detailed manager dashboards and tables.
      </p>
    </div>
  );
}

export default function ManagerPortal() {
  const [activeSection, setActiveSection] = useState<ManagerSection>("employees");
  const { user, signOut } = useAuth();
  const [authUser, setAuthUser] = useState<any>(null);
  const [displayInitial, setDisplayInitial] = useState<string>("M");
  const [profileName, setProfileName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const mainDashboardUrl = (() => {
    const raw = (import.meta as any).env?.VITE_MAIN_DASHBOARD_URL || 'http://localhost:5173/dashboard';
    try {
      const u = new URL(raw);
      if (!u.pathname || u.pathname === '/') u.pathname = '/dashboard';
      return u.toString();
    } catch {
      return raw;
    }
  })();
  const loginUrl = (import.meta as any).env?.VITE_LOGIN_URL || 'http://localhost:5173/login';
  const hideDashboardItem = String((import.meta as any).env?.VITE_HIDE_DASHBOARD_MENU || '').toLowerCase() === 'true';
  const goToMainDashboard = () => { window.location.href = mainDashboardUrl; };
  const handleSignOut = async () => { await signOut?.(); window.location.href = loginUrl; };

  useEffect(() => {
    let mounted = true;
    const resolveAuthUser = async () => {
      if (user?.id) {
        setAuthUser(user);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUser(data.user ?? null);
    };
    resolveAuthUser();
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      const effectiveUser = authUser || user;
      if (!effectiveUser?.id) return;
      try {
        const { profile } = await getProfile(effectiveUser.id, effectiveUser.email || undefined);
        if (!mounted) return;
        const composed = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
        const pn = (composed
          || profile?.full_name
          || profile?.fullName
          || profile?.display_name
          || profile?.name
          || profile?.username
          || "").toString().trim();
        if (pn) setProfileName(pn);
        const base = pn || ((effectiveUser as any)?.user_metadata?.full_name as string | undefined)
          || ((effectiveUser as any)?.user_metadata?.name as string | undefined)
          || (effectiveUser?.email || "M");
        const initial = String(base).trim().charAt(0).toUpperCase() || "M";
        setDisplayInitial(initial);
      } catch (e) {
        const effectiveUser = authUser || user;
        const base = ((effectiveUser as any)?.user_metadata?.full_name as string | undefined)
          || ((effectiveUser as any)?.user_metadata?.name as string | undefined)
          || (effectiveUser?.email || "M");
        const initial = String(base).trim().charAt(0).toUpperCase() || "M";
        setDisplayInitial(initial);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [user?.id, authUser?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar wrapper to mirror Employee sizes/behavior */}
      <div className="hidden md:block md:w-56 lg:w-64 shrink-0 sticky top-0 h-screen z-40 self-start">
        <ManagerSidebar
          activeSection={activeSection}
          onSectionChange={(section) => setActiveSection(section as ManagerSection)}
        />
      </div>
      {/* Main area with top navbar and scrollable content */}
      <div className="flex-1 flex flex-col">
          <div className="h-14 bg-white border-b flex items-center justify-end px-4 md:px-6 sticky top-0 z-30 relative">
            <Bell className="w-5 h-5 text-gray-600 mr-4" />
            <button onClick={() => setMenuOpen((v) => !v)} className="relative">
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-white grid place-items-center font-bold">
                {displayInitial}
              </div>
            </button>
            {menuOpen && (
              <div className="absolute right-4 top-12 w-56 bg-white rounded-xl shadow-lg border overflow-hidden">
                {!hideDashboardItem && (
                  <button onClick={() => { setMenuOpen(false); goToMainDashboard(); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700">
                    <ArrowLeftCircle className="w-4 h-4 text-sky-600" />
                    <span>Dashboard</span>
                  </button>
                )}
                <button onClick={handleSignOut} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700 border-t">
                  <LogOut className="w-4 h-4 text-sky-700" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
          <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
            <ManagerContent section={activeSection} />
          </main>
      </div>
    </div>
  );
}
