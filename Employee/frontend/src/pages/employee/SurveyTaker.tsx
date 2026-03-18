import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/modules/auth/supabaseClient";

interface SurveyTakerProps {
  surveyId: string | null;
  onBack: () => void;
}
const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";
type Q = { id: string; question_text: string };

export default function SurveyTaker({ surveyId, onBack }: SurveyTakerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    (async () => {
      if (!surveyId) return;
      try {
        setLoading(true);
        const res = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveysQuestions")
          .select("id, question_text")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });
        if (res.error) throw res.error;
        setQuestions((res.data || []) as Q[]);
      } catch (e: any) {
        toast({ title: "Failed to load survey", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  const question = questions[current];

  async function handleSubmitAll() {
    try {
      if (!surveyId) throw new Error("Missing survey id");
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");

      // 1) Create response row
      const insResp = await supabase
        .schema(SCHEMA)
        .from("EmployeeSurveyResponses")
        .insert({ survey_id: surveyId, employee_id: uid })
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
        const insAns = await supabase.schema(SCHEMA).from("EmployeeSurveyAnswers").insert(rows);
        if (insAns.error) throw insAns.error;
      }

      // 3) Mark assignment as completed
      const upd = await supabase
        .schema(SCHEMA)
        .from("EmployeeSurveysAssignments")
        .update({ status: "completed" })
        .eq("survey_id", surveyId)
        .eq("employee_id", uid);
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Surveys
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Survey</span>
            <span>
              {questions.length ? current + 1 : 0} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
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

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBackNav} disabled={current === 0 || loading} className="emp-btn-inline">
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
