import { Home, Trophy, BookOpen, Calendar, Settings, LogOut, ClipboardList, MessageSquare, FileCheck, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getProfile } from "@/modules/api/me";

interface EmployeeSidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "surveys", label: "Surveys", icon: ClipboardList },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "requests", label: "My Requests", icon: FileCheck },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "learning", label: "Learning", icon: BookOpen },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function EmployeeSidebar({ activePage, onPageChange }: EmployeeSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");

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

  const displayName = (() => {
    const meta = (user as any)?.user_metadata || {};
    const metaName = meta.full_name || meta.name || meta.display_name || (meta.first_name && meta.last_name ? `${meta.first_name ?? ""} ${meta.last_name ?? ""}`.trim() : "");
    const name = profileName || metaName;
    if (name) return name;
    const email = user?.email || "";
    if (email) return email.split("@")[0];
    return "User";
  })();

  const initials = displayName?.trim()?.charAt(0)?.toUpperCase() || "U";
  const avatarUrl = (user as any)?.user_metadata?.avatar_url as string | undefined;

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/employee");
  };

  return (
    <aside className="w-full h-full emp-sidemenu p-0 flex flex-col">
      <div className="mb-4 p-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-md object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-md bg-cyan-500 flex items-center justify-center text-white font-bold">
              {initials}
            </div>
          )}
          <h2 className="text-xl font-bold leading-tight" style={{ color: "var(--emp-hover-name)" }}>{displayName}</h2>
        </div>
        <p className="text-sm text-white/70 leading-tight mt-1">Your Workspace Portal</p>
      </div>

      <nav className="flex-1 space-y-0">
        {menuItems.filter((i) => i.id !== "learning").map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`emp-item w-full flex items-center gap-3 px-4 py-3 transition-all ${
                isActive ? "emp-active" : ""
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="emp-item flex items-center gap-3 px-4 py-3 transition-all mt-4"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sign Out</span>
      </button>
    </aside>
  );
}
