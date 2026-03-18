import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/modules/api/me";

const categories = [
  { value: "work-environment", label: "Work Environment" },
  { value: "team-collaboration", label: "Team Collaboration" },
  { value: "management", label: "Management" },
  { value: "tools-resources", label: "Tools & Resources" },
  { value: "other", label: "Other" },
];

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type Employee = { user_id: string; first_name?: string | null; last_name?: string | null; email?: string | null };

type FeedbackRow = {
  id: number;
  created_at: string | null;
  category: string | null;
  OverallRating: number | null;
  YourFeedback: string | null;
  employee_id: string;
  Status: string | null;
};

export default function ClientsFeedback() {
  const [category, setCategory] = useState("work-environment");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      value: e.user_id,
      label: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.email || e.user_id,
    }));
  }, [employees]);

  async function loadEmployees() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setEmployees([]);
      return;
    }

    let companyId: number | null = null;
    try {
      const { profile } = await getProfile(uid, auth.user?.email || undefined);
      const rawCompanyId =
        (profile as any)?.companyID ??
        (profile as any)?.CompanyID ??
        (profile as any)?.company_id ??
        (profile as any)?.companyId;
      const resolved = rawCompanyId == null ? null : Number(rawCompanyId);
      companyId = Number.isFinite(resolved as any) ? (resolved as number) : null;
    } catch {
      companyId = null;
    }

    if (companyId == null) {
      setEmployees([]);
      return;
    }

    const q1 = await supabase
      .schema(SCHEMA)
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .eq("CompanyID", companyId)
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true });

    if (!q1.error) {
      setEmployees((q1.data || []) as any);
      return;
    }

    const q2 = await supabase
      .schema(SCHEMA)
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .eq("company_id", companyId)
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true });

    if (q2.error) throw q2.error;
    setEmployees((q2.data || []) as any);
  }

  async function selectFeedbackRows(uid: string): Promise<FeedbackRow[]> {
    const r = await supabase
      .schema(SCHEMA)
      .from("ClientFeedback")
      .select("*")
      .eq("created_by", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (r.error) throw r.error;
    return (r.data || []) as FeedbackRow[];
  }

  async function insertFeedbackRow(uid: string, values: { employeeId: string; category: string; rating: number; feedback: string }) {
    const insWithCreatedBy = await supabase
      .schema(SCHEMA)
      .from("ClientFeedback")
      .insert({
        employee_id: values.employeeId,
        category: values.category,
        OverallRating: values.rating || null,
        YourFeedback: values.feedback,
        Status: "Under Review",
        created_by: uid,
      });

    if (!insWithCreatedBy.error) return;

    const msg = String((insWithCreatedBy.error as any)?.message || "");
    if (msg.toLowerCase().includes("created_by")) {
      const ins = await supabase
        .schema(SCHEMA)
        .from("ClientFeedback")
        .insert({
          employee_id: values.employeeId,
          category: values.category,
          OverallRating: values.rating || null,
          YourFeedback: values.feedback,
          Status: "Under Review",
        });
      if (!ins.error) return;
    }

    throw insWithCreatedBy.error;
  }

  async function loadRows() {
    setLoadError(null);
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoadError("Not signed in (no Supabase session). Please open Clients from the Hub/Login app.");
        setRows([]);
        return;
      }
      const data = await selectFeedbackRows(uid);
      setRows(data);
    } catch (e: any) {
      const msg = e?.message ?? (typeof e === "object" ? JSON.stringify(e) : String(e));
      setLoadError(msg || "Failed to load feedback");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await loadEmployees();
        await loadRows();
      } catch (e: any) {
        const msg = e?.message ?? (typeof e === "object" ? JSON.stringify(e) : String(e));
        toast({ title: "Failed to load", description: msg, variant: "destructive" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast({
        title: "Employee required",
        description: "Please select an employee before submitting",
        variant: "destructive",
      });
      return;
    }

    if (!feedback.trim()) {
      toast({
        title: "Details required",
        description: "Please provide escalation details before submitting",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");

      await insertFeedbackRow(uid, { employeeId: selectedEmployeeId, category, rating, feedback });
      await loadRows();

      toast({ title: "Escalation submitted!", description: "Thank you for reporting this issue" });
      setCategory("work-environment");
      setRating(0);
      setFeedback("");
      setSelectedEmployeeId("");
    } catch (e: any) {
      const msg = e?.message ?? (typeof e === "object" ? JSON.stringify(e) : String(e));
      toast({ title: "Failed to submit", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const employeeName = (id: string) => {
    const found = employeeOptions.find((e) => e.value === id);
    return found?.label || id;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Escalations</h1>
        <p className="text-muted-foreground text-lg">Report and track employee escalations</p>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Submit Escalation</CardTitle>
          <CardDescription>Submit an escalation for a specific employee</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Employee</Label>
            <select
              className="w-full h-10 border rounded-md px-3 text-sm"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">Select employee</option>
              {employeeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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

          <div className="space-y-3">
            <Label>Overall Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                  <Star className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="feedback">Escalation Details</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe the issue, context, and any relevant details..."
              className="min-h-[150px]"
            />
          </div>

          <button onClick={handleSubmit} className="emp-btn" disabled={submitting}>
            <span className="inline-flex items-center">
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting…" : "Submit Escalation"}
            </span>
          </button>
        </CardContent>
      </Card>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Recent Escalations</CardTitle>
          <CardDescription>Escalations you have submitted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rows.map((r) => {
              const status = r.Status || "Under Review";
              const isAddressed = status.toLowerCase() === "addressed";
              return (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium">{employeeName(r.employee_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""} • {r.category || "General"}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${isAddressed ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}>
                    {status}
                  </div>
                </div>
              );
            })}
            {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">No escalations submitted yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
