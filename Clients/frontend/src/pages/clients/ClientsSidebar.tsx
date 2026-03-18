import { BarChart3, LayoutDashboard, Activity, UserCog, ClipboardCheck, MessageSquare, FileText } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useEffect, useState } from "react";
import { getProfile } from "@/modules/api/me";

interface ClientsSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "surveys", label: "Performance Reviews", icon: FileText },
  { id: "feedback", label: "Escalations", icon: MessageSquare },
  { id: "requests", label: "Employee Requests", icon: ClipboardCheck },
  { id: "resources", label: "Resources", icon: Activity },
  { id: "staffing", label: "Team", icon: UserCog },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
];

export default function ClientsSidebar({ activeSection, onSectionChange }: ClientsSidebarProps) {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");

  const rawName =
    ((user as any)?.user_metadata?.full_name as string | undefined) ||
    ((user as any)?.user_metadata?.name as string | undefined) ||
    (user?.email || "");

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
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.email]);

  const friendlyName = (() => {
    const base = (profileName || rawName).trim();
    if (!base) return "";
    if (base.includes("@")) {
      const local = base.split("@")[0];
      const parts = local.split(/[._-]+/g).filter(Boolean);
      return parts.length ? parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : local;
    }
    return base;
  })();

  const initial = (() => {
    const n = (friendlyName || rawName || "C").trim();
    if (!n) return "C";
    const parts = n.split(/\s+/g).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
    return initials || "C";
  })();

  const displayInitial = (initial || "C").charAt(0).toUpperCase() || "C";

  return (
    <aside className="w-64 h-screen p-0 emp-sidemenu">
      <div className="mb-4 p-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-cyan-500 flex items-center justify-center text-white font-bold">{displayInitial}</div>
            <h2 className="text-xl font-bold leading-tight" style={{ color: "var(--emp-hover-name)" }}>
              {friendlyName || "User"}
            </h2>
          </div>
          <p className="text-sm text-white/70 leading-tight mt-1">Your Workspace Portal</p>
        </div>
      </div>

      <nav className="space-y-0">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`emp-item w-full flex items-center gap-3 px-4 py-3 transition-all ${
                activeSection === item.id ? "emp-active" : ""
              }`}
              aria-current={activeSection === item.id ? "page" : undefined}
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