import { Users, FileText, BarChart3, Building2, UserPlus, Target, Settings, UserCog } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useEffect, useState } from "react";
import { getProfile } from "@/modules/api/me";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "users", label: "Users List", icon: Users },
  { id: "create-user", label: "Create User", icon: UserPlus },
  { id: "managers", label: "Manager List", icon: UserCog },
  { id: "companies", label: "Company List", icon: Building2 },
  { id: "surveys", label: "Surveys Setup", icon: FileText },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "kpi-cycles", label: "KPI and Cycles", icon: Target },
  { id: "system", label: "Settings", icon: Settings },
];

export default function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");
  const rawName = ((user as any)?.user_metadata?.full_name as string | undefined)
    || ((user as any)?.user_metadata?.name as string | undefined)
    || (user?.email || "");
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
        if (pn && !/^test$/i.test(pn)) setProfileName(pn);
      } catch { /* ignore */ }
    };
    run();
    return () => { mounted = false; };
  }, [user?.id]);
  const friendlyName = (() => {
    let base = (profileName || rawName || "").trim();
    if (!base) return "";
    if (/^test$/i.test(base) || base.length < 3) base = "";
    if (!base) return "";
    if (base.includes("@")) {
      const local = base.split("@")[0];
      const parts = local.split(/[._-]+/g).filter(Boolean);
      if (parts.length) return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      return local;
    }
    return base;
  })();
  const initial = (friendlyName || rawName || "A").trim().charAt(0).toUpperCase() || "A";
  return (
    <aside className="w-64 h-screen p-0 emp-sidemenu">
      <div className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-cyan-500 flex items-center justify-center text-white font-bold">{initial}</div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: "var(--emp-hover-name)" }}>{friendlyName || 'User'}</h2>
        </div>
        <p className="text-sm text-white/70 leading-tight mt-1">Your Workspace Portal</p>
      </div>
      <nav className="space-y-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`emp-item w-full flex items-center gap-3 px-4 py-3 transition-all ${isActive ? 'emp-active' : ''}`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
