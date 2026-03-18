import { useEffect, useState } from "react";
import EmployeeSidebar from "@/pages/employee/EmployeeSidebar";
import EmployeeHome from "@/pages/employee/EmployeeHome";
import EmployeeSurveys from "@/pages/employee/EmployeeSurveys";
import EmployeeFeedback from "@/pages/employee/EmployeeFeedback";
import EmployeeRequests from "@/pages/employee/EmployeeRequests";
import EmployeeAchievements from "@/pages/employee/EmployeeAchievements";
import EmployeeRewards from "@/pages/employee/EmployeeRewards";
import EmployeeSchedule from "@/pages/employee/EmployeeSchedule";
import SurveyTaker from "@/pages/employee/SurveyTaker";
import EmployeeSurveyResults from "@/pages/employee/EmployeeSurveyResults";
import Chatbot from "@/pages/employee/Chatbot";
import EmployeeSettings from "@/pages/employee/EmployeeSettings";
import EmployeeTimeTracker from "@/pages/employee/EmployeeTimeTracker";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Menu, Settings as Cog, LogOut, ArrowLeftCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/modules/auth/AuthContext";
import { getProfile } from "@/modules/api/me";

export default function EmployeePortal() {
  const [activePage, setActivePage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const [timeTrackerOpen, setTimeTrackerOpen] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const avatarUrl = (user as any)?.user_metadata?.avatar_url as string | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const mainDashboardUrl = (import.meta as any).env?.VITE_MAIN_DASHBOARD_URL || 'http://localhost:5173/dashboard';
  const hideDashboardItem = String((import.meta as any).env?.VITE_HIDE_DASHBOARD_MENU || '').toLowerCase() === 'true';
  const goToMainDashboard = () => { window.location.href = mainDashboardUrl; };
  const handleSignOut = async () => { await signOut(); window.location.reload(); };

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

  const displayInitial = (() => {
    const name = profileName || (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.email || "U";
    return String(name).trim().charAt(0).toUpperCase() || "U";
  })();

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setMobileMenuOpen(false); // Close mobile menu after selection
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">Employee Portal</h2>
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <EmployeeSidebar activePage={activePage} onPageChange={handlePageChange} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-56 lg:w-64 shrink-0 sticky top-0 h-screen z-40 self-start">
        <EmployeeSidebar activePage={activePage} onPageChange={setActivePage} />
      </div>

      {/* Main Content with top navbar */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 bg-white border-b flex items-center justify-end px-4 md:px-6 sticky top-0 z-30 relative">
          <button
            onClick={() => setTimeTrackerOpen(true)}
            className="mr-4 text-gray-600 hover:text-gray-900"
            aria-label="Open time tracker"
            type="button"
          >
            <Clock className="w-5 h-5" />
          </button>
          <Bell className="w-5 h-5 text-gray-600 mr-4" />
          <button onClick={() => setMenuOpen((v) => !v)} className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cyan-500 text-white grid place-items-center font-bold">
                {displayInitial}
              </div>
            )}
          </button>
          {menuOpen && (
            <div className="absolute right-4 top-12 w-56 bg-white rounded-xl shadow-lg border overflow-hidden">
              <button onClick={() => { setActivePage('settings'); setMenuOpen(false); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700">
                <Cog className="w-4 h-4 text-purple-600" />
                <span>Settings</span>
              </button>
              {!hideDashboardItem && (
                <button onClick={() => { setMenuOpen(false); goToMainDashboard(); }} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-gray-700 border-t">
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
        <EmployeeTimeTracker open={timeTrackerOpen} onOpenChange={setTimeTrackerOpen} />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {activePage === "home" && (
          <EmployeeHome
            onNavigate={setActivePage}
            onStartSurvey={(surveyId: string) => {
              setSelectedSurveyId(surveyId);
              setActivePage("survey-take");
            }}
          />
        )}
        {activePage === "settings" && <EmployeeSettings />}
        {activePage === "surveys" && (
          <EmployeeSurveys
            onStartSurvey={(surveyId: string) => {
              setSelectedSurveyId(surveyId);
              setActivePage("survey-take");
            }}
            onViewResults={(surveyId: string) => {
              setSelectedSurveyId(surveyId);
              setActivePage("survey-results");
            }}
          />
        )}
        {activePage === "feedback" && <EmployeeFeedback />}
        {activePage === "requests" && <EmployeeRequests />}
        {activePage === "achievements" && <EmployeeAchievements />}
        {activePage === "rewards" && <EmployeeRewards />}
        {activePage === "schedule" && (
          <EmployeeSchedule onOpenRequests={() => setActivePage("requests")} />
        )}
        {activePage === "survey-take" && (
          <SurveyTaker
            surveyId={selectedSurveyId}
            onBack={() => {
              setActivePage("surveys");
              setSelectedSurveyId(null);
            }}
          />
        )}
        {activePage === "survey-results" && (
          <EmployeeSurveyResults
            surveyId={selectedSurveyId}
            onBack={() => {
              setActivePage("surveys");
              setSelectedSurveyId(null);
            }}
          />
        )}
        </main>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
