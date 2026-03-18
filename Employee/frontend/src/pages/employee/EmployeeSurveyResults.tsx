import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/modules/auth/supabaseClient";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

interface EmployeeSurveyResultsProps {
  surveyId: string | null;
  onBack: () => void;
}

type Question = { id: string; question_text: string };

type Answer = { question_id: string; answer_text: string | null };

export default function EmployeeSurveyResults({ surveyId, onBack }: EmployeeSurveyResultsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Survey Results");
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

        // Load survey title
        const s = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveys")
          .select("title")
          .eq("id", surveyId)
          .single();
        if (s.error) throw s.error;
        setTitle(s.data?.title || "Survey Results");

        // Find this employee's response id
        const resp = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveyResponses")
          .select("id")
          .eq("survey_id", surveyId)
          .eq("employee_id", uid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const responseId = resp.data?.id as string | undefined;

        // Load all questions
        const qRes = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveysQuestions")
          .select("id, question_text")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });
        if (qRes.error) throw qRes.error;
        const questions = (qRes.data || []) as Question[];

        let answers: Answer[] = [];
        if (responseId) {
          const aRes = await supabase
            .schema(SCHEMA)
            .from("EmployeeSurveyAnswers")
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
          <p className="text-muted-foreground">Your responses</p>
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
