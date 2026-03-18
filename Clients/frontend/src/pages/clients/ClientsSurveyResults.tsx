import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/modules/api/me";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

interface ClientsSurveyResultsProps {
  surveyId: string | null;
  onBack: () => void;
}

type Question = { id: string; question_text: string };

type Answer = { question_id: string; answer_text: string | null };

type SurveyMeta = { id: string; title: string | null; employee_id: string | null };

type EmployeeProfile = { user_id: string; first_name?: string | null; last_name?: string | null; email?: string | null };

export default function ClientsSurveyResults({ surveyId, onBack }: ClientsSurveyResultsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Survey Results");
  const [subtitle, setSubtitle] = useState<string>("");
  const [qa, setQa] = useState<Array<{ q: Question; a: Answer | null }>>([]);

  useEffect(() => {
    (async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        setError(null);

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("Not authenticated");

        const { profile } = await getProfile(uid, auth.user?.email || undefined);
        const rawCompanyId =
          (profile as any)?.companyID ??
          (profile as any)?.CompanyID ??
          (profile as any)?.company_id ??
          (profile as any)?.companyId;
        const resolved = rawCompanyId == null ? null : Number(rawCompanyId);
        const companyId = Number.isFinite(resolved as any) ? (resolved as number) : null;
        if (companyId == null) throw new Error("Missing company id");

        const s = await supabase
          .schema(SCHEMA)
          .from("ClientSurveys")
          .select("id, title, employee_id")
          .eq("id", surveyId)
          .single();
        if (s.error) throw s.error;
        const meta = s.data as SurveyMeta;
        setTitle(meta?.title || "Survey Results");

        if (meta?.employee_id) {
          const pres = await supabase
            .schema(SCHEMA)
            .from("profiles")
            .select("user_id, first_name, last_name, email")
            .eq("user_id", meta.employee_id)
            .maybeSingle();
          if (!pres.error && pres.data) {
            const p = pres.data as any as EmployeeProfile;
            const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || p.user_id;
            setSubtitle(`Your responses (Employee: ${name})`);
          } else {
            setSubtitle("Your responses");
          }
        } else {
          setSubtitle("Your responses");
        }

        const resp = await supabase
          .schema(SCHEMA)
          .from("ClientSurveyResponses")
          .select("id")
          .eq("survey_id", surveyId)
          .eq("company_id", companyId)
          .eq("company_user_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const responseId = resp.data?.id as string | undefined;

        const qRes = await supabase
          .schema(SCHEMA)
          .from("ClientSurveysQuestions")
          .select("id, question_text")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });
        if (qRes.error) throw qRes.error;
        const questions = (qRes.data || []) as Question[];

        let answers: Answer[] = [];
        if (responseId) {
          const aRes = await supabase
            .schema(SCHEMA)
            .from("ClientSurveyAnswers")
            .select("question_id, answer_text")
            .eq("response_id", responseId);
          if (aRes.error) throw aRes.error;
          answers = (aRes.data || []) as Answer[];
        }

        const ansMap = new Map<string, Answer>();
        answers.forEach((a) => ansMap.set(a.question_id, a));
        setQa(questions.map((q) => ({ q, a: ansMap.get(q.id) || null })));
      } catch (e: any) {
        setError(e?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle || "Your responses"}</p>
        </div>
        <button className="emp-btn-inline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="grid gap-4">
        {qa.map(({ q, a }, idx) => (
          <Card key={q.id} className="emp-card">
            <CardHeader>
              <CardTitle className="text-base">{idx + 1}. {q.question_text}</CardTitle>
              <CardDescription>Your answer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{a?.answer_text ?? "—"}</div>
            </CardContent>
          </Card>
        ))}
        {!loading && qa.length === 0 && (
          <div className="text-sm text-muted-foreground">No answers found.</div>
        )}
      </div>
    </div>
  );
}
