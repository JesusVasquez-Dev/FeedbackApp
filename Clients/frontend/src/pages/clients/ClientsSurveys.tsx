import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/modules/api/me";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type Assignment = {
  survey_id: string;
  company_id: number;
  employee_id: string;
  status: string | null;
  created_at?: string | null;
};

type Survey = {
  id: string;
  title: string | null;
  description: string | null;
  employee_id: string | null;
};

type EmployeeProfile = { user_id: string; first_name?: string | null; last_name?: string | null; email?: string | null };

type SurveyItem = Assignment & { survey: Survey; employeeName: string };

interface ClientsSurveysProps {
  onStartSurvey?: (surveyId: string) => void;
  onViewResults?: (surveyId: string) => void;
}

export default function ClientsSurveys({ onStartSurvey, onViewResults }: ClientsSurveysProps) {
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

        const { profile } = await getProfile(uid, auth.user?.email || undefined);
        const rawCompanyId =
          (profile as any)?.companyID ??
          (profile as any)?.CompanyID ??
          (profile as any)?.company_id ??
          (profile as any)?.companyId;
        const resolved = rawCompanyId == null ? null : Number(rawCompanyId);
        const companyId = Number.isFinite(resolved as any) ? (resolved as number) : null;
        if (companyId == null) {
          setPending([]);
          setCompleted([]);
          return;
        }

        const [pendingRes, completedRes] = await Promise.all([
          supabase
            .schema(SCHEMA)
            .from("ClientSurveysAssignments")
            .select("survey_id, company_id, employee_id, status, created_at")
            .eq("company_id", companyId)
            .in("status", ["pending", null as any] as any)
            .order("created_at", { ascending: false }),
          supabase
            .schema(SCHEMA)
            .from("ClientSurveysAssignments")
            .select("survey_id, company_id, employee_id, status, created_at", { count: "exact" })
            .eq("company_id", companyId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        if (pendingRes.error) throw pendingRes.error;
        if (completedRes.error) throw completedRes.error;

        const pendingAssign = (pendingRes.data || []) as Assignment[];
        const completedAssign = (completedRes.data || []) as Assignment[];
        setCompletedTotal(completedRes.count ?? completedAssign.length);

        const surveyIds = Array.from(
          new Set([...pendingAssign, ...completedAssign].map((a) => a.survey_id).filter(Boolean))
        );

        const surveyMap = new Map<string, Survey>();
        const employeeIds: string[] = [];
        if (surveyIds.length > 0) {
          const sres = await supabase
            .schema(SCHEMA)
            .from("ClientSurveys")
            .select("id, title, description, employee_id")
            .in("id", surveyIds);
          if (sres.error) throw sres.error;
          (sres.data || []).forEach((s: any) => {
            surveyMap.set(s.id, s as Survey);
            if (s.employee_id) employeeIds.push(s.employee_id);
          });
        }

        const empMap = new Map<string, EmployeeProfile>();
        if (employeeIds.length > 0) {
          const pres = await supabase
            .schema(SCHEMA)
            .from("profiles")
            .select("user_id, first_name, last_name, email")
            .in("user_id", Array.from(new Set(employeeIds)));
          if (pres.error) throw pres.error;
          (pres.data || []).forEach((p: any) => empMap.set(p.user_id, p as EmployeeProfile));
        }

        const makeItem = (a: Assignment): SurveyItem => {
          const survey = surveyMap.get(a.survey_id) || {
            id: a.survey_id,
            title: "Untitled",
            description: null,
            employee_id: null,
          };
          const ep = survey.employee_id ? empMap.get(survey.employee_id) : null;
          const employeeName = ep
            ? `${ep.first_name || ""} ${ep.last_name || ""}`.trim() || ep.email || ep.user_id
            : (survey.employee_id || "");

          return { ...a, survey, employeeName };
        };

        setPending(pendingAssign.map(makeItem));
        setCompleted(completedAssign.map(makeItem));
      } catch (e: any) {
        setError(e?.message || "Failed to load performance reviews");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingCount = pending.length;
  const completedCount = completedTotal;

  const completedHint = useMemo(() => {
    if (completedTotal <= completed.length) return null;
    return `Showing most recent ${completed.length} of ${completedTotal}`;
  }, [completedTotal, completed.length]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Performance Reviews</h1>
        <p className="text-muted-foreground text-lg">Complete and review employee performance evaluations</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading performance reviews…</div>}

      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-500" />
          Pending Reviews ({pendingCount})
        </h2>
        <div className="grid gap-4">
          {pending.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground">No pending reviews.</div>
          )}
          {pending.map((item) => (
            <Card key={item.survey_id} className="emp-card hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{item.survey.title || "Untitled Survey"}</CardTitle>
                    <CardDescription>{item.survey.description}</CardDescription>
                    {item.employeeName && (
                      <div className="text-sm text-muted-foreground mt-2">Employee: {item.employeeName}</div>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Assigned</div>
                  <button className="emp-btn-inline" onClick={() => onStartSurvey && onStartSurvey(item.survey_id)}>
                    Start Review
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          Completed Reviews ({completedCount})
        </h2>
        {completedHint && <div className="text-xs text-muted-foreground mb-2">{completedHint}</div>}
        <div className="grid gap-4">
          {completed.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground">No completed reviews yet.</div>
          )}
          {completed.map((item) => (
            <Card key={item.survey_id} className="emp-card opacity-75">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{item.survey.title || "Untitled Survey"}</CardTitle>
                    <CardDescription>{item.survey.description}</CardDescription>
                    {item.employeeName && (
                      <div className="text-sm text-muted-foreground mt-2">Employee: {item.employeeName}</div>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">Completed</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {item.created_at ? `Completed on ${new Date(item.created_at).toLocaleDateString()}` : "Completed"}
                  </div>
                  <button className="emp-btn-inline" onClick={() => onViewResults && onViewResults(item.survey_id)}>
                    View Results
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
