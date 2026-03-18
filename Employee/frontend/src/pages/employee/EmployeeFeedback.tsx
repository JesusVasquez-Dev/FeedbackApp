import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Star, Send } from "lucide-react";
import { supabase } from "@/modules/auth/supabaseClient";

const categories = [
  { value: "work-environment", label: "Work Environment" },
  { value: "team-collaboration", label: "Team Collaboration" },
  { value: "management", label: "Management" },
  { value: "tools-resources", label: "Tools & Resources" },
  { value: "other", label: "Other" },
];

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type FeedbackRow = {
  id: number;
  created_at: string | null;
  category: string | null;
  OverallRating: number | null;
  YourFeedback: string | null;
  idProfile: string;
  Status: string | null;
};

export default function EmployeeFeedback() {
  const [category, setCategory] = useState("work-environment");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Surveys-style: use unquoted table name in feedbackApp and select('*')
  async function selectFeedbackRows(uid: string): Promise<FeedbackRow[]> {
    const r = await supabase
      .schema(SCHEMA)
      .from('EmployeeFeedback')
      .select('*')
      .eq('idProfile', uid)
      .order('created_at', { ascending: false })
      .limit(10);
    if (r.error) throw r.error;
    return (r.data || []) as FeedbackRow[];
  }

  async function insertFeedbackRow(uid: string, values: { category: string; rating: number; feedback: string }) {
    const ins = await supabase
      .schema(SCHEMA)
      .from('EmployeeFeedback')
      .insert({
        category: values.category,
        OverallRating: values.rating || null,
        YourFeedback: values.feedback,
        idProfile: uid,
        Status: 'Under Review',
      });
    if (ins.error) throw ins.error;
  }

  async function loadRows() {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setRows([]); return; }
      const data = await selectFeedbackRows(uid);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Please provide your feedback before submitting",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmitting(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      await insertFeedbackRow(uid, { category, rating, feedback });
      // Refresh list from server to ensure consistency
      await loadRows();
      toast({ title: "Feedback submitted!", description: "Thank you for helping us improve" });
      setCategory("work-environment");
      setRating(0);
      setFeedback("");
    } catch (e: any) {
      const msg = e?.message ?? (typeof e === 'object' ? JSON.stringify(e) : String(e));
      toast({ title: "Failed to submit", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Feedback</h1>
        <p className="text-muted-foreground text-lg">
          Your voice matters - share your thoughts with us
        </p>
      </div>

      {/* Feedback Form */}
      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>
            Help us create a better workplace by sharing your honest feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label>Feedback Category</Label>
            <RadioGroup value={category} onValueChange={setCategory}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <div key={cat.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={cat.value} id={cat.value} />
                    <Label htmlFor={cat.value} className="cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label>Overall Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-3">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts, suggestions, or concerns..."
              className="min-h-[150px]"
            />
          </div>

          {/* Submit Button */}
          <button onClick={handleSubmit} className="emp-btn" disabled={submitting}>
            <span className="inline-flex items-center">
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting…" : "Submit Feedback"}
            </span>
          </button>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Your Recent Feedback</CardTitle>
          <CardDescription>Feedback you've submitted in the past</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.map((r) => {
              const status = r.Status || "Under Review";
              const isAddressed = status.toLowerCase() === "addressed";
              return (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{r.category || "General"}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${isAddressed ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}>
                    {status}
                  </div>
                </div>
              );
            })}
            {!loading && rows.length === 0 && (
              <div className="text-sm text-muted-foreground">No feedback submitted yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
