import { useEffect, useState } from "react";
import AdminSidebar from "@/pages/admin/AdminSidebar";
import ManagerList from "@/pages/admin/ManagerList";
import CreateUserForm from "@/pages/admin/CreateUserForm";
import KPICyclesTimeline from "@/pages/admin/KPICyclesTimeline";
import { Card } from "@/components/ui/card";
import { Bell, LogOut, ArrowLeftCircle } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { getProfile } from "@/modules/api/me";

type AdminSection = "users" | "create-user" | "managers" | "companies" | "surveys" | "metrics" | "kpi-cycles" | "system";

function AdminContent({ section }: { section: AdminSection }) {
  switch (section) {
    case "users":
      return (
        <Card className="emp-card p-6">
          <h2 className="text-2xl font-bold mb-4">User Management</h2>
          <p className="text-muted-foreground">View and manage all users in the system.</p>
        </Card>
      );
    case "create-user":
      return <CreateUserForm />;
    case "managers":
      return <ManagerList />;
    case "companies":
      return (
        <Card className="emp-card p-6">
          <h2 className="text-2xl font-bold mb-4">Company List</h2>
          <p className="text-muted-foreground">View and manage all registered companies.</p>
        </Card>
      );
    case "surveys":
      return (
        <Card className="emp-card p-6">
          <h2 className="text-2xl font-bold mb-4">Survey Management</h2>
          <p className="text-muted-foreground">Configure and monitor surveys across the organization.</p>
        </Card>
      );
    case "metrics":
      return (
        <Card className="emp-card p-6">
          <h2 className="text-2xl font-bold mb-4">Company Metrics</h2>
          <p className="text-muted-foreground">Review key performance indicators and analytics.</p>
        </Card>
      );
    case "kpi-cycles":
      return <KPICyclesTimeline />;
    case "system":
      return (
        <Card className="emp-card p-6">
          <h2 className="text-2xl font-bold mb-4">Settings</h2>
          <p className="text-muted-foreground">System-wide configuration and administration tools.</p>
        </Card>
      );
    default:
      return (
        <Card className="emp-card p-6">
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p className="text-muted-foreground">Select an item from the sidebar to begin managing the system.</p>
        </Card>
      );
  }
}

export default function AdminPortal() {
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const { user, signOut } = useAuth();
  const [displayInitial, setDisplayInitial] = useState<string>("A");
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
  const loginUrl = (() => {
    const raw = (import.meta as any).env?.VITE_LOGIN_URL || 'http://localhost:5173/login';
    try {
      const u = new URL(raw);
      if (!u.pathname || u.pathname === '/') u.pathname = '/login';
      return u.toString();
    } catch {
      return raw;
    }
  })();
  const hideDashboardItem = String((import.meta as any).env?.VITE_HIDE_DASHBOARD_MENU || '').toLowerCase() === 'true';
  const goToMainDashboard = () => { window.location.href = mainDashboardUrl; };
  const handleSignOut = async () => { await signOut?.(); window.location.href = loginUrl; };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!user?.id) return;
      try {
        const { profile } = await getProfile(user.id, user.email || undefined);
        if (!mounted) return;
        const composed = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
        const pn = (composed
          || profile?.full_name
          || profile?.fullName
          || profile?.display_name
          || profile?.name
          || profile?.username
          || "").toString().trim();
        const base = pn || ((user as any)?.user_metadata?.full_name as string | undefined)
          || ((user as any)?.user_metadata?.name as string | undefined)
          || (user?.email || "A");
        const initial = String(base).trim().charAt(0).toUpperCase() || "A";
        setDisplayInitial(initial);
      } catch {
        const base = ((user as any)?.user_metadata?.full_name as string | undefined)
          || ((user as any)?.user_metadata?.name as string | undefined)
          || (user?.email || "A");
        const initial = String(base).trim().charAt(0).toUpperCase() || "A";
        setDisplayInitial(initial);
      }
    };
    run();
    return () => { mounted = false; };
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar wrapper to mirror Employee sizes/behavior */}
      <div className="hidden md:block md:w-56 lg:w-64 shrink-0 sticky top-0 h-screen z-40 self-start">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={(section) => setActiveSection(section as AdminSection)}
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
          <AdminContent section={activeSection} />
        </main>
      </div>
    </div>
  );
}
