import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/modules/api/me";

interface ClientsSurveyTakerProps {
  surveyId: string | null;
  onBack: () => void;
}

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type Q = { id: string; question_text: string };

type SurveyMeta = { id: string; employee_id: string | null; company_id: number | null };

export default function ClientsSurveyTaker({ surveyId, onBack }: ClientsSurveyTakerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;

  const [meta, setMeta] = useState<SurveyMeta | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        setError(null);

        const s = await supabase
          .schema(SCHEMA)
          .from("ClientSurveys")
          .select("id, employee_id, company_id")
          .eq("id", surveyId)
          .single();
        if (s.error) throw s.error;
        if (cancelled) return;
        setMeta(s.data as any);

        const qres = await supabase
          .schema(SCHEMA)
          .from("ClientSurveysQuestions")
          .select("id, question_text")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });
        if (qres.error) throw qres.error;
        if (cancelled) return;
        setQuestions((qres.data || []) as Q[]);
        setCurrent(0);
        setAnswers({});
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        if (cancelled) return;
        setError(msg);
        toast({ title: "Failed to load survey", description: msg, variant: "destructive" });
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally depend only on surveyId. `toast` is unstable in some setups and can cause re-fetch loops.
  }, [surveyId]);

  const question = questions[current];

  async function handleSubmitAll() {
    try {
      if (!surveyId) throw new Error("Missing survey id");
      setSaving(true);

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

      const employeeId = meta?.employee_id;
      if (!employeeId) throw new Error("Missing employee id for this survey");

      // 1) Create response row
      const insResp = await supabase
        .schema(SCHEMA)
        .from("ClientSurveyResponses")
        .insert({ survey_id: surveyId, company_id: companyId, employee_id: employeeId, company_user_id: uid })
        .select("id")
        .single();
      if (insResp.error) throw insResp.error;
      const responseId = insResp.data.id as string;

      // 2) Insert answers
      const rows = questions.map((q) => ({
        response_id: responseId,
        question_id: q.id,
        answer_text: answers[q.id] ?? null,
      }));
      if (rows.length > 0) {
        const insAns = await supabase.schema(SCHEMA).from("ClientSurveyAnswers").insert(rows);
        if (insAns.error) throw insAns.error;
      }

      // 3) Mark assignment completed for this employee + company
      const upd = await supabase
        .schema(SCHEMA)
        .from("ClientSurveysAssignments")
        .update({ status: "completed" })
        .eq("survey_id", surveyId)
        .eq("company_id", companyId)
        .eq("employee_id", employeeId);
      if (upd.error) throw upd.error;

      toast({ title: "Survey submitted!", description: "Thank you for your feedback" });
      onBack();
    } catch (e: any) {
      toast({ title: "Failed to submit", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (!question) return;
    const val = (answers[question.id] ?? "").trim();
    if (!val) {
      toast({ title: "Please answer the question", description: "Provide an answer to continue", variant: "destructive" });
      return;
    }
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else handleSubmitAll();
  }

  function handleBackNav() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Surveys
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Survey</span>
            <span>
              {questions.length ? current + 1 : 0} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="emp-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">
              {loading ? "Loading…" : question?.question_text || "No questions"}
            </CardTitle>
            <CardDescription className="text-center">Answer briefly in your own words</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!loading && question && (
              <textarea
                className="w-full border rounded-md p-3 min-h-[120px]"
                placeholder="Type your answer here"
                value={answers[question.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBackNav}
            disabled={current === 0 || loading}
            className="emp-btn-inline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading || saving} className="emp-btn-inline">
            {current === questions.length - 1 ? (saving ? "Submitting…" : "Submit") : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
