import { useEffect, useState } from "react";
import GamificationCard from "./GamificationCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Star, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeHomeProps {
  onNavigate?: (page: string) => void;
  onStartSurvey?: (surveyId: string) => void;
}

type PendingSurvey = {
  surveyId: string;
  title: string;
  description: string | null;
  createdAt: string | null;
};

export default function EmployeeHome({ onNavigate, onStartSurvey }: EmployeeHomeProps) {
  const [firstName, setFirstName] = useState<string>("");
  const [pendingSurvey, setPendingSurvey] = useState<PendingSurvey | null>(null);
  const [pendingSurveyLoading, setPendingSurveyLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        let name: string | null = null;
        // Try feedbackApp.profiles by user_id
        if (!name) {
          try {
            const { data } = await supabase
              .schema("feedbackApp")
              .from("profiles")
              .select("first_name")
              .eq("user_id", uid)
              .maybeSingle();
            if (data?.first_name) name = String(data.first_name).trim();
          } catch {}
        }
        // Try public.profiles by user_id
        if (!name) {
          try {
            const { data } = await supabase
              .from("profiles")
              .select("first_name")
              .eq("user_id", uid)
              .maybeSingle();
            if (data?.first_name) name = String(data.first_name).trim();
          } catch {}
        }
        // Fallback by email (case-insensitive) if still not found
        if (!name && auth.user?.email) {
          const email = auth.user.email;
          try {
            const { data } = await supabase
              .schema("feedbackApp")
              .from("profiles")
              .select("first_name")
              .ilike("email", `%${email}%`)
              .limit(1)
              .maybeSingle();
            if (data?.first_name) name = String(data.first_name).trim();
          } catch {}
          if (!name) {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("first_name")
                .ilike("email", `%${email}%`)
                .limit(1)
                .maybeSingle();
              if (data?.first_name) name = String(data.first_name).trim();
            } catch {}
          }
        }
        if (!cancelled && name) setFirstName(name);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data: ledger } = await supabase
          .schema(SCHEMA)
          .from("PointsLedger")
          .select("delta")
          .eq("user_id", uid);
        const balance = (ledger || []).reduce((sum: number, row: any) => sum + (row.delta || 0), 0);
        if (!cancelled) setTotalPoints(balance);
      } catch {
        if (!cancelled) setTotalPoints(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [SCHEMA]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPendingSurveyLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          if (!cancelled) setPendingSurvey(null);
          return;
        }

        const pendingRes = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveysAssignments")
          .select("survey_id, created_at, status")
          .eq("employee_id", uid)
          .in("status", ["pending", null as any] as any)
          .order("created_at", { ascending: false })
          .limit(1);
        if (pendingRes.error) throw pendingRes.error;

        const first = (pendingRes.data || [])[0] as any;
        if (!first?.survey_id) {
          if (!cancelled) setPendingSurvey(null);
          return;
        }

        const sres = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveys")
          .select("id, title, description")
          .eq("id", first.survey_id)
          .maybeSingle();
        if (sres.error) throw sres.error;

        if (!cancelled) {
          setPendingSurvey({
            surveyId: String(first.survey_id),
            title: String((sres.data as any)?.title || "Untitled Survey"),
            description: ((sres.data as any)?.description ?? null) as string | null,
            createdAt: (first.created_at ?? null) as string | null,
          });
        }
      } catch {
        if (!cancelled) setPendingSurvey(null);
      } finally {
        if (!cancelled) setPendingSurveyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [SCHEMA]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-4xl font-bold mb-2">Welcome Back{firstName ? `, ${firstName}` : ""}! 👋</h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Here's your progress and achievements
        </p>
      </div>

      {/* Pending Surveys */}
      {!pendingSurveyLoading && pendingSurvey && (
        <Card className="emp-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Pending Survey
                </CardTitle>
                <CardDescription className="mt-2">
                  {pendingSurvey.title}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Assigned</span>
                </div>
              </div>
              <Button className="emp-btn-inline" onClick={() => onStartSurvey ? onStartSurvey(pendingSurvey.surveyId) : onNavigate?.("surveys")}>
                Fill Out Survey
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gamification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GamificationCard
          title="Total Points"
          value={String(totalPoints)}
          icon={Star}
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
        />
        <GamificationCard
          title="Level"
          value="12"
          icon={TrendingUp}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <GamificationCard
          title="Achievements"
          value="24"
          icon={Trophy}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <GamificationCard
          title="Goals Completed"
          value="18/25"
          icon={Target}
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Your activity this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Tasks Completed</span>
                <span className="text-sm text-muted-foreground">12/15</span>
              </div>
              <Progress value={80} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Learning Hours</span>
                <span className="text-sm text-muted-foreground">8/10</span>
              </div>
              <Progress value={80} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Team Collaboration</span>
                <span className="text-sm text-muted-foreground">16/20</span>
              </div>
              <Progress value={80} />
            </div>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>Your latest accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "First Week Complete", icon: "🎯", date: "2 days ago" },
                { title: "Team Player", icon: "🤝", date: "5 days ago" },
                { title: "Quick Learner", icon: "⚡", date: "1 week ago" },
              ].map((achievement, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                  <div className="text-3xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <button className="emp-btn-inline w-full" onClick={() => onNavigate?.("requests")}>
              My Requests
            </button>
            <button className="emp-btn-inline w-full" onClick={() => onNavigate?.("feedback")}>
              Feedback
            </button>
            <button className="emp-btn-inline w-full" onClick={() => onNavigate?.("schedule")}>
              Schedule
            </button>
            <button className="emp-btn-inline w-full" onClick={() => onNavigate?.("surveys")}>
              Surveys
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
