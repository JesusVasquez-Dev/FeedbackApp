import { useEffect, useState } from "react";
import { Bell, LogOut, ArrowLeftCircle } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { getProfile } from "@/modules/api/me";
import ClientsSidebar from "@/pages/clients/ClientsSidebar";
import ClientsDashboard from "@/pages/clients/ClientsDashboard";
import ClientsMetrics from "@/pages/clients/ClientsMetrics";
import ResourcesManagement from "@/pages/clients/ResourcesManagement";
import StaffingManagement from "@/pages/clients/StaffingManagement";
import RequestsManagement from "@/pages/clients/RequestsManagement";
import ClientsAssistantWidget from "@/pages/clients/ClientsAssistantWidget";
import ClientsFeedback from "@/pages/clients/ClientsFeedback";
import ClientsSurveys from "./clients/ClientsSurveys";
import ClientsSurveyTaker from "./clients/ClientsSurveyTaker";
import ClientsSurveyResults from "./clients/ClientsSurveyResults";

type ClientsSection =
  | "dashboard"
  | "resources"
  | "staffing"
  | "surveys"
  | "feedback"
  | "requests"
  | "metrics";

// onNavigate uses string because ClientsDashboard expects (page: string) => void
function ClientsContent({ section, onNavigate }: { section: ClientsSection; onNavigate: (page: string) => void }) {
  switch (section) {
    case "dashboard":
      return <ClientsDashboard onNavigate={onNavigate} />;
    case "resources":
      return <ResourcesManagement />;
    case "staffing":
      return <StaffingManagement />;
    case "surveys":
      return (
        <ClientsSurveys
          onStartSurvey={(surveyId: string) => onNavigate(`survey-take:${surveyId}`)}
          onViewResults={(surveyId: string) => onNavigate(`survey-results:${surveyId}`)}
        />
      );

    case "feedback":
      return <ClientsFeedback />;
    case "requests":
      return <RequestsManagement />;
    case "metrics":
      return <ClientsMetrics />;
    default:
      return <ClientsDashboard onNavigate={onNavigate} />;
  }
}

export default function ClientsPortal() {
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const { user, signOut } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);

  const mainDashboardUrl = (() => {
    const raw = (import.meta as any).env?.VITE_MAIN_DASHBOARD_URL || "http://localhost:5173/dashboard";
    try {
      const u = new URL(raw);
      if (!u.pathname || u.pathname === "/") u.pathname = "/dashboard";
      return u.toString();
    } catch {
      return raw;
    }
  })();
  const loginUrl = (() => {
    const raw = (import.meta as any).env?.VITE_LOGIN_URL || "http://localhost:5173/login";
    try {
      const u = new URL(raw);
      if (!u.pathname || u.pathname === "/") u.pathname = "/login";
      return u.toString();
    } catch {
      return raw;
    }
  })();
  const hideDashboardItem = String((import.meta as any).env?.VITE_HIDE_DASHBOARD_MENU || "").toLowerCase() === "true";
  const goToMainDashboard = () => { window.location.href = mainDashboardUrl; };
  const handleSignOut = async () => { await signOut?.(); window.location.href = loginUrl; };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.id) {
          const { profile } = await getProfile(user.id, user.email || undefined);
          if (mounted && profile) {
            const full = profile.full_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
            if (full) setProfileName(full);
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [user?.id, user?.email]);

  const rawName =
    (profileName ||
      ((user as any)?.user_metadata?.full_name as string | undefined) ||
      ((user as any)?.user_metadata?.name as string | undefined) ||
      (user?.email || "")) ??
    "";

  const friendlyName = (() => {
    const base = String(rawName || "").trim();
    if (!base) return "";
    if (base.includes("@")) {
      const local = base.split("@")[0];
      const parts = local.split(/[._-]+/g).filter(Boolean);
      return parts.length ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : local;
    }
    return base;
  })();

  const displayInitials = (() => {
    const n = (friendlyName || rawName || "C").trim();
    if (!n) return "C";
    const parts = n.split(/\s+/g).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
    return initials || "C";
  })();

  const displayInitial = (displayInitials || "C").charAt(0).toUpperCase() || "C";

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar wrapper to mirror Employee sizes/behavior */}
      <div className="hidden md:block md:w-56 lg:w-64 shrink-0 sticky top-0 h-screen z-40 self-start">
        <ClientsSidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
          }}
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
              <button onClick={handleSignOut} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700">
                <LogOut className="w-4 h-4 text-sky-700" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {!user && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Not signed in (no Supabase session). Please open Clients from the Hub/Login app so it can pass your session.
            </div>
          )}
          {(() => {
            const raw = String(activeSection);
            if (raw.startsWith('survey-take:')) {
              const sid = raw.split(':')[1] || null;
              return (
                <ClientsSurveyTaker
                  surveyId={sid}
                  onBack={() => {
                    setActiveSection('surveys');
                  }}
                />
              );
            }
            if (raw.startsWith('survey-results:')) {
              const sid = raw.split(':')[1] || null;
              return (
                <ClientsSurveyResults
                  surveyId={sid}
                  onBack={() => {
                    setActiveSection('surveys');
                  }}
                />
              );
            }
            return (
              <ClientsContent
                section={activeSection as ClientsSection}
                onNavigate={(page) => {
                  if (typeof page === 'string' && page.startsWith('survey-take:')) {
                    setActiveSection(page);
                    return;
                  }
                  if (typeof page === 'string' && page.startsWith('survey-results:')) {
                    setActiveSection(page);
                    return;
                  }
                  setActiveSection(page);
                }}
              />
            );
          })()}
        </main>
      </div>

      <ClientsAssistantWidget />
    </div>
  );
}