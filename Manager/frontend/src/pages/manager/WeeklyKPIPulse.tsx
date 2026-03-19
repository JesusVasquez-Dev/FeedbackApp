import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, History } from "lucide-react";
import { supabase } from "@/modules/auth/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { computeKpiScore, KPIAnswerValues, PerformanceRating } from "@/modules/kpi/scoring";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type TeamEmployee = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type WeeklyKpiRow = {
  id: string;
  week_start_date: string;
  performance_rating: string;
  raw_points: number;
  final_points_awarded: number;
  manager_override_points: number | null;
  additional_feedback: string | null;
  created_at: string;
};

function toLocalISODate(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalISODate(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) return new Date(iso);
  return new Date(y, m - 1, d);
}

function startOfWeekISO(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setHours(0, 0, 0, 0);
  const diffToMonday = (day + 6) % 7;
  dt.setDate(dt.getDate() - diffToMonday);
  return toLocalISODate(dt);
}

function displayName(e: TeamEmployee) {
  const nm = `${e.first_name || ""} ${e.last_name || ""}`.trim();
  return nm || e.email || e.user_id;
}

export default function WeeklyKPIPulse() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<TeamEmployee[]>([]);
  const [index, setIndex] = useState(0);

  const [answersByUserId, setAnswersByUserId] = useState<Record<string, KPIAnswerValues>>({});

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<WeeklyKpiRow[]>([]);

  const weekStartDate = useMemo(() => startOfWeekISO(new Date()), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const { data: auth } = await supabase.auth.getUser();
        const managerId = auth.user?.id;
        if (!managerId) {
          if (mounted) setEmployees([]);
          return;
        }

        const rel = await supabase
          .schema(SCHEMA)
          .from("employee_manager_relations")
          .select("employee_id")
          .eq("manager_id", managerId)
          .eq("is_active", true);
        if (rel.error) throw rel.error;
        const ids = Array.from(new Set((rel.data || []).map((r: any) => r.employee_id).filter(Boolean)));

        const prof = ids.length
          ? await supabase
              .schema(SCHEMA)
              .from("profiles")
              .select("user_id, first_name, last_name, email")
              .in("user_id", ids)
              .order("first_name", { ascending: true })
              .order("last_name", { ascending: true })
          : { data: [], error: null };
        if ((prof as any).error) throw (prof as any).error;
        if (!mounted) return;
        setEmployees(((prof as any).data || []) as TeamEmployee[]);
      } catch (e: any) {
        if (mounted) {
          setLoadError(e?.message || "Failed to load team");
          setEmployees([]);
        }
        toast({ title: "Failed to load team", description: e?.message || "", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const current = employees[index];
  const currentAnswers = (current && answersByUserId[current.user_id]) || {
    performance_rating: null,
    communication: 0,
    reliability: 0,
    quality: 0,
    initiative: 0,
    collaboration: 0,
    additional_feedback: "",
    manager_override_points: null,
  };

  const computed = computeKpiScore(currentAnswers);

  function updateCurrent(patch: Partial<KPIAnswerValues>) {
    if (!current) return;
    setAnswersByUserId((prev) => ({
      ...prev,
      [current.user_id]: {
        ...currentAnswers,
        ...patch,
      },
    }));
  }

  async function openHistory() {
    if (!current) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const managerId = auth.user?.id;
      if (!managerId) return;

      const res = await supabase
        .schema(SCHEMA)
        .from("Weekly_KPI")
        .select("id, week_start_date, performance_rating, raw_points, final_points_awarded, manager_override_points, additional_feedback, created_at")
        .eq("employee_id", current.user_id)
        .order("week_start_date", { ascending: false })
        .limit(10);
      if (res.error) throw res.error;
      setHistoryRows((res.data || []) as WeeklyKpiRow[]);
    } catch (e: any) {
      toast({ title: "Failed to load history", description: e?.message || "", variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  }

  async function submitCurrent() {
    if (!current) return;
    if (!currentAnswers.performance_rating) {
      toast({ title: "Select a performance rating", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const managerId = auth.user?.id;
      if (!managerId) throw new Error("Not authenticated");

      const score = computeKpiScore(currentAnswers);

      const existing = await supabase
        .schema(SCHEMA)
        .from("Weekly_KPI")
        .select("id, final_points_awarded, points_awarded")
        .eq("employee_id", current.user_id)
        .eq("week_start_date", weekStartDate)
        .maybeSingle();

      if (existing.error) throw existing.error;

      const prevFinal = existing.data?.final_points_awarded ?? 0;
      const prevAwarded = Boolean((existing.data as any)?.points_awarded);

      const up = await supabase
        .schema(SCHEMA)
        .from("Weekly_KPI")
        .upsert(
          {
            id: existing.data?.id,
            manager_id: managerId,
            employee_id: current.user_id,
            week_start_date: weekStartDate,
            performance_rating: currentAnswers.performance_rating,
            additional_feedback: currentAnswers.additional_feedback || null,
            raw_points: score.rawPoints,
            final_points_awarded: score.finalPoints,
            manager_override_points: currentAnswers.manager_override_points ?? null,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "employee_id,week_start_date" }
        )
        .select("id, final_points_awarded, points_awarded")
        .single();

      if (up.error) throw up.error;
      const weeklyId = up.data.id as string;

      const del = await supabase
        .schema(SCHEMA)
        .from("KPI_Responses")
        .delete()
        .eq("weekly_kpi_id", weeklyId);
      if (del.error) throw del.error;

      const responses = score.perQuestion.map((q) => ({
        weekly_kpi_id: weeklyId,
        question_key: q.key,
        value: q.value,
        max_value: q.maxValue,
        weight: q.weight,
        computed_points: q.computedPoints,
      }));

      const ins = await supabase.schema(SCHEMA).from("KPI_Responses").insert(responses);
      if (ins.error) throw ins.error;

      const nextFinal = up.data.final_points_awarded as number;
      const alreadyAwarded = Boolean((up.data as any)?.points_awarded) || prevAwarded;

      if (alreadyAwarded) {
        const delta = (nextFinal || 0) - (prevFinal || 0);
        if (delta !== 0) {
          const led = await supabase
            .schema(SCHEMA)
            .from("PointsLedger")
            .insert({ user_id: current.user_id, delta, reason: "Weekly KPI Pulse", source: "weekly_kpi" } as any);
          if (led.error) throw led.error;
        }
      } else {
        if ((nextFinal || 0) > 0) {
          const led = await supabase
            .schema(SCHEMA)
            .from("PointsLedger")
            .insert({ user_id: current.user_id, delta: nextFinal, reason: "Weekly KPI Pulse", source: "weekly_kpi" } as any);
          if (led.error) throw led.error;
        }
        const mark = await supabase
          .schema(SCHEMA)
          .from("Weekly_KPI")
          .update({ points_awarded: true, points_awarded_at: new Date().toISOString() } as any)
          .eq("id", weeklyId);
        if (mark.error) throw mark.error;
      }

      toast({ title: "Saved", description: `${displayName(current)}: ${nextFinal} points` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    await submitCurrent();
    if (index < employees.length - 1) setIndex((v) => v + 1);
  }

  function prev() {
    if (index > 0) setIndex((v) => v - 1);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (loadError) {
    return <div className="text-sm text-red-600">{loadError}</div>;
  }

  if (!current) {
    return <div className="text-sm text-muted-foreground">No employees found.</div>;
  }

  const progress = Math.round(((index + 1) / Math.max(1, employees.length)) * 100);

  const ratingCards: Array<{ key: PerformanceRating; label: string; emoji: string }> = [
    { key: "needs_support", label: "Needs Support", emoji: "😟" },
    { key: "on_track", label: "On Track", emoji: "😐" },
    { key: "excelling", label: "Excelling", emoji: "🌟" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Weekly KPI Pulse</h1>
          <p className="text-muted-foreground">Week starting {parseLocalISODate(weekStartDate).toLocaleDateString()}</p>
        </div>
        <Badge variant="outline">Employee {index + 1} of {employees.length}</Badge>
      </div>

      <div className="rounded-xl border border-sky-200 bg-white p-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-600 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">{displayName(current)}</CardTitle>
                <Button variant="outline" size="sm" onClick={openHistory}>
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
              </div>
              <CardDescription className="mt-1">{current.email || ""}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">How is this employee performing?</h3>
            <div className="flex flex-col md:flex-row gap-4">
              {ratingCards.map((r) => {
                const active = currentAnswers.performance_rating === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => updateCurrent({ performance_rating: r.key })}
                    className={`flex-1 rounded-xl border p-4 flex flex-col items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-sky-300 ${active ? "bg-sky-50 border-sky-400 ring-2 ring-sky-200" : "bg-white hover:bg-slate-50"}`}
                  >
                    <div className="text-4xl">{r.emoji}</div>
                    <div className="text-sm font-medium">{r.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <SliderQuestion
              label="Communication Skills"
              value={currentAnswers.communication}
              max={5}
              onChange={(v) => updateCurrent({ communication: v })}
            />
            <SliderQuestion
              label="Task Completion & Reliability"
              value={currentAnswers.reliability}
              max={5}
              onChange={(v) => updateCurrent({ reliability: v })}
            />
            <SliderQuestion
              label="Quality of Work"
              value={currentAnswers.quality}
              max={5}
              onChange={(v) => updateCurrent({ quality: v })}
            />
            <SliderQuestion
              label="Proactiveness & Initiative"
              value={currentAnswers.initiative}
              max={3}
              onChange={(v) => updateCurrent({ initiative: v })}
            />
            <SliderQuestion
              label="Collaboration & Teamwork"
              value={currentAnswers.collaboration}
              max={3}
              onChange={(v) => updateCurrent({ collaboration: v })}
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Additional Feedback (Optional)</h3>
            <Textarea
              value={currentAnswers.additional_feedback || ""}
              onChange={(e) => updateCurrent({ additional_feedback: e.target.value })}
              placeholder="Share any specific observations or notes..."
              className="min-h-24"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <div className="text-sm font-medium">Manager Bonus (0–5)</div>
              <div className="text-xs text-muted-foreground">Optional extra points added on top of the automatic score (max 25).</div>
            </div>
            <Input
              type="number"
              min={0}
              max={5}
              value={currentAnswers.manager_override_points ?? ""}
              onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
              }}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  updateCurrent({ manager_override_points: null });
                  return;
                }

                const raw = Number(v);
                if (!Number.isFinite(raw)) return;
                const clamped = Math.max(0, Math.min(5, raw));
                updateCurrent({ manager_override_points: clamped });
              }}
              placeholder="e.g. 5"
            />
          </div>

          <div className="flex items-end justify-end">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Final points</div>
              <div className="text-2xl font-semibold">{computed.finalPoints} / 30</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          className="min-w-[140px] border-sky-600 text-sky-700 hover:bg-sky-600 hover:text-white"
          onClick={prev}
          disabled={index === 0 || saving}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          size="lg"
          className="min-w-[160px] bg-sky-600 text-white hover:bg-yellow-400 hover:text-sky-900"
          onClick={next}
          disabled={saving}
        >
          {index === employees.length - 1 ? "Save" : "Save & Next"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>History — {displayName(current)}</DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : historyRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No history found.</div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {historyRows.map((r) => (
                <Card key={r.id} className="emp-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">Week of {parseLocalISODate(r.week_start_date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">Raw: {Number(r.raw_points || 0).toFixed(2)} • Final: {r.final_points_awarded}</div>
                        {r.manager_override_points !== null && (
                          <div className="text-xs text-muted-foreground">Bonus: {r.manager_override_points}</div>
                        )}
                        {r.additional_feedback && (
                          <div className="mt-2 text-sm whitespace-pre-wrap">{r.additional_feedback}</div>
                        )}
                      </div>
                      <Badge variant="outline">{r.performance_rating}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SliderQuestion({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">
          <span className="text-primary font-semibold">{value}</span>/{max}
        </div>
      </div>
      <Slider value={value} onValueChange={(v) => onChange(v[0] ?? 0)} min={0} max={max} step={1} />
    </div>
  );
}
