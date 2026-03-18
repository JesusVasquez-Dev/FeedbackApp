import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/modules/auth/supabaseClient";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type Assignment = {
  survey_id: string;
  employee_id: string;
  status: string | null;
  created_at?: string | null;
};

type Survey = {
  id: string;
  title: string | null;
  description: string | null;
};

type SurveyItem = Assignment & { survey: Survey };

interface EmployeeSurveysProps {
  onStartSurvey?: (surveyId: string) => void;
  onViewResults?: (surveyId: string) => void;
}

export default function EmployeeSurveys({ onStartSurvey, onViewResults }: EmployeeSurveysProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SurveyItem[]>([]);
  const [completed, setCompleted] = useState<SurveyItem[]>([]);
  const [completedTotal, setCompletedTotal] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) {
          setPending([]);
          setCompleted([]);
          return;
        }

        // 1) Fetch assignments for this user
        const [pendingRes, completedRes] = await Promise.all([
          supabase
            .schema(SCHEMA)
            .from("EmployeeSurveysAssignments")
            .select("survey_id, employee_id, status, created_at")
            .eq("employee_id", uid)
            .in("status", ["pending", null as any] as any)
            .order("created_at", { ascending: false }),
          supabase
            .schema(SCHEMA)
            .from("EmployeeSurveysAssignments")
            .select("survey_id, employee_id, status, created_at", { count: "exact" })
            .eq("employee_id", uid)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        if (pendingRes.error) throw pendingRes.error;
        if (completedRes.error) throw completedRes.error;

        const pendingAssign = (pendingRes.data || []) as Assignment[];
        const completedAssign = (completedRes.data || []) as Assignment[];
        setCompletedTotal(completedRes.count ?? completedAssign.length);

        // 2) Fetch surveys for both sets
        const surveyIds = Array.from(
          new Set([...pendingAssign, ...completedAssign].map((a) => a.survey_id).filter(Boolean))
        );
        let surveyMap = new Map<string, Survey>();
        if (surveyIds.length > 0) {
          const sres = await supabase
            .schema(SCHEMA)
            .from("EmployeeSurveys")
            .select("id, title, description")
            .in("id", surveyIds);
          if (sres.error) throw sres.error;
          (sres.data || []).forEach((s: any) => surveyMap.set(s.id, s as Survey));
        }

        setPending(
          pendingAssign
            .map((a) => ({ ...a, survey: surveyMap.get(a.survey_id) || { id: a.survey_id, title: "Untitled", description: null } }))
        );
        setCompleted(
          completedAssign
            .map((a) => ({ ...a, survey: surveyMap.get(a.survey_id) || { id: a.survey_id, title: "Untitled", description: null } }))
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load surveys");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingCount = pending.length;
  const completedCount = completedTotal;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Surveys</h1>
        <p className="text-muted-foreground text-lg">
          Share your thoughts and help us improve
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">Loading surveys…</div>
      )}

      {/* Pending Surveys */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-500" />
          Pending Surveys ({pendingCount})
        </h2>
        <div className="grid gap-4">
          {pending.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground">No pending surveys.</div>
          )}
          {pending.map((item) => (
            <Card key={item.survey_id} className="emp-card hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{item.survey.title || "Untitled Survey"}</CardTitle>
                    <CardDescription>{item.survey.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Assigned</div>
                  <button className="emp-btn-inline" onClick={() => onStartSurvey && onStartSurvey(item.survey_id)}>Start Survey</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Surveys */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          Completed Surveys ({completedCount})
        </h2>
        <div className="grid gap-4">
          {completed.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground">No completed surveys yet.</div>
          )}
          {completed.map((item) => (
            <Card key={item.survey_id} className="emp-card opacity-75">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{item.survey.title || "Untitled Survey"}</CardTitle>
                    <CardDescription>{item.survey.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {item.created_at ? `Completed on ${new Date(item.created_at).toLocaleDateString()}` : "Completed"}
                  </div>
                  <button className="emp-btn-inline" onClick={() => onViewResults && onViewResults(item.survey_id)}>View Results</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
