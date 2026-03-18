import { Users, FileText, BarChart3, Heart, ClipboardCheck, Target, MessageSquare, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useEffect, useState } from "react";
import { getProfile } from "@/modules/api/me";
import { supabase } from "@/modules/auth/supabaseClient";

interface ManagerSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { id: "employees", label: "My Team", icon: Users },
  { id: "kpi-surveys", label: "Employee KPI", icon: Target },
  { id: "requests", label: "Employee Requests", icon: ClipboardCheck },
  { id: "time-tracker", label: "Time Tracker", icon: Clock },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "engagement", label: "Engagement", icon: Heart },
];

export default function ManagerSidebar({ activeSection, onSectionChange }: ManagerSidebarProps) {
  const { user } = useAuth();
  const [authUser, setAuthUser] = useState<any>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [surveysOpen, setSurveysOpen] = useState<boolean>(() => {
    return (
      activeSection === 'surveys-employee-create'
      || activeSection === 'surveys-employee-results'
      || activeSection === 'surveys-company-create'
      || activeSection === 'surveys-company-results'
    );
  });
  const [feedbackOpen, setFeedbackOpen] = useState<boolean>(() => {
    return activeSection === 'feedback-employee' || activeSection === 'feedback-company';
  });
  const rawName = ((authUser || user) as any)?.user_metadata?.full_name as string | undefined
    || ((authUser || user) as any)?.user_metadata?.name as string | undefined
    || ((authUser || user)?.email || "");

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
    return () => {
      mounted = false;
    };
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
      } catch (e) {
        // Ignore and fall back to metadata/email formatting
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [user?.id, authUser?.id]);

  useEffect(() => {
    if (
      activeSection === 'surveys-employee-create'
      || activeSection === 'surveys-employee-results'
      || activeSection === 'surveys-company-create'
      || activeSection === 'surveys-company-results'
    ) {
      setSurveysOpen(false);
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'feedback-employee' || activeSection === 'feedback-company') {
      setFeedbackOpen(false);
    }
  }, [activeSection]);
  // Prefer profile name; if only email, turn local-part into readable name. Ignore placeholder 'Test'.
  const friendlyName = (() => {
    let effective = (profileName || "").trim();
    if (effective && (/^test$/i.test(effective) || effective.length < 3)) {
      effective = "";
    }
    const base = effective || rawName;
    if (!base) return "";
    if (base.includes("@")) {
      const local = base.split("@")[0];
      const parts = local.split(/[._-]+/g).filter(Boolean);
      if (parts.length) {
        return parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      }
      return local;
    }
    return base;
  })();
  const displayInitial = (friendlyName || rawName || "M").trim().charAt(0).toUpperCase() || "M";
  return (
    <aside className="w-64 h-screen p-0 emp-sidemenu flex flex-col">
      <div className="mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-cyan-500 flex items-center justify-center text-white font-bold">{displayInitial}</div>
          <h2 className="text-xl font-bold leading-tight" style={{ color: "var(--emp-hover-name)" }}>{friendlyName || 'User'}</h2>
        </div>
        <p className="text-sm text-white/70 leading-tight mt-1">Your Workspace Portal</p>
      </div>
      <nav className="space-y-0 flex-1 min-h-0 overflow-y-auto pb-4">
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

        <div>
          <button
            onClick={() => setFeedbackOpen((v) => !v)}
            className={`emp-item w-full flex items-center gap-3 px-4 py-3 transition-all ${
              activeSection === 'feedback-employee' || activeSection === 'feedback-company' ? 'emp-active' : ''
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium flex-1 text-left">Feedback/Escalation</span>
            {feedbackOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {feedbackOpen && (
            <div className="pl-8">
              <button
                onClick={() => {
                  onSectionChange('feedback-employee');
                  setFeedbackOpen(false);
                }}
                className={`emp-item w-full flex items-center gap-3 px-4 py-2 transition-all ${activeSection === 'feedback-employee' ? 'emp-active' : ''}`}
              >
                <span className="text-sm font-medium">Employee Feedback</span>
              </button>
              <button
                onClick={() => {
                  onSectionChange('feedback-company');
                  setFeedbackOpen(false);
                }}
                className={`emp-item w-full flex items-center gap-3 px-4 py-2 transition-all ${activeSection === 'feedback-company' ? 'emp-active' : ''}`}
              >
                <span className="text-sm font-medium">Client Escalations</span>
              </button>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setSurveysOpen((v) => !v)}
            className={`emp-item w-full flex items-center gap-3 px-4 py-3 transition-all ${
              activeSection === 'surveys-employee-create'
              || activeSection === 'surveys-employee-results'
              || activeSection === 'surveys-company-create'
              || activeSection === 'surveys-company-results'
                ? 'emp-active'
                : ''
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="font-medium flex-1 text-left">Performance Reviews</span>
            {surveysOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {surveysOpen && (
            <div className="pl-8">
              <button
                onClick={() => {
                  onSectionChange('surveys-employee-create');
                  setSurveysOpen(false);
                }}
                className={`emp-item w-full flex items-center gap-3 px-4 py-2 transition-all ${activeSection === 'surveys-employee-create' ? 'emp-active' : ''}`}
              >
                <span className="text-sm font-medium">Employee: Create</span>
              </button>
              <button
                onClick={() => {
                  onSectionChange('surveys-employee-results');
                  setSurveysOpen(false);
                }}
                className={`emp-item w-full flex items-center gap-3 px-4 py-2 transition-all ${activeSection === 'surveys-employee-results' ? 'emp-active' : ''}`}
              >
                <span className="text-sm font-medium">Employee: Results</span>
              </button>
              <button
                onClick={() => {
                  onSectionChange('surveys-company-create');
                  setSurveysOpen(false);
                }}
                className={`emp-item w-full flex items-center gap-3 px-4 py-2 transition-all ${activeSection === 'surveys-company-create' ? 'emp-active' : ''}`}
              >
                <span className="text-sm font-medium">Client: Create</span>
              </button>
              <button
                onClick={() => {
                  onSectionChange('surveys-company-results');
                  setSurveysOpen(false);
                }}
                className={`emp-item w-full flex items-center gap-3 px-4 py-2 transition-all ${activeSection === 'surveys-company-results' ? 'emp-active' : ''}`}
              >
                <span className="text-sm font-medium">Client: Results</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
