import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, ClipboardList, Percent, Star, Activity } from "lucide-react";
import { supabase } from "@/modules/auth/supabaseClient";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type TeamEmployee = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

type WeeklyKpiRow = {
  id: string;
  employee_id: string;
  week_start_date: string;
  final_points_awarded: number;
  created_at: string;
  updated_at: string;
};

function toLocalISODate(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekMondayISO(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setHours(0, 0, 0, 0);
  const diffToMonday = (day + 6) % 7;
  dt.setDate(dt.getDate() - diffToMonday);
  return toLocalISODate(dt);
}

function displayName(e?: TeamEmployee | null) {
  if (!e) return "";
  const nm = `${e.first_name || ""} ${e.last_name || ""}`.trim();
  return nm || e.email || e.user_id;
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function TeamMetrics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<TeamEmployee[]>([]);
  const [kpiRows, setKpiRows] = useState<WeeklyKpiRow[]>([]);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});

  const weekStart = useMemo(() => startOfWeekMondayISO(new Date()), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: auth } = await supabase.auth.getUser();
        const managerId = auth.user?.id;
        if (!managerId) {
          if (mounted) {
            setEmployees([]);
            setKpiRows([]);
            setRoleCounts({});
          }
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

        const team = ((prof as any).data || []) as TeamEmployee[];

        const kpi = await supabase
          .schema(SCHEMA)
          .from("Weekly_KPI")
          .select("id, employee_id, week_start_date, final_points_awarded, created_at, updated_at")
          .eq("manager_id", managerId)
          .eq("week_start_date", weekStart)
          .order("updated_at", { ascending: false });
        if (kpi.error) throw kpi.error;

        const roles: Record<string, number> = {};
        if (ids.length) {
          const pr = await supabase
            .schema(SCHEMA)
            .from("ProfileRoles")
            .select("idProfile, idRol")
            .in("idProfile", team.map((t) => t.user_id).filter(Boolean));
          if (pr.error) throw pr.error;

          const roleIds = Array.from(new Set((pr.data || []).map((r: any) => r.idRol).filter(Boolean)));
          const rolesRes = roleIds.length
            ? await supabase
                .schema(SCHEMA)
                .from("Roles")
                .select("id, Role")
                .in("id", roleIds)
            : { data: [], error: null };
          if ((rolesRes as any).error) throw (rolesRes as any).error;

          const roleNameById = new Map<number, string>();
          ((rolesRes as any).data || []).forEach((r: any) => {
            roleNameById.set(r.id, r.Role);
          });

          (pr.data || []).forEach((r: any) => {
            const nm = roleNameById.get(r.idRol) || "Unknown";
            roles[nm] = (roles[nm] || 0) + 1;
          });

          if (!Object.keys(roles).length) {
            roles["Unassigned"] = ids.length;
          }
        }

        if (!mounted) return;
        setEmployees(team);
        setKpiRows((kpi.data || []) as WeeklyKpiRow[]);
        setRoleCounts(roles);
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || "Failed to load metrics");
          setEmployees([]);
          setKpiRows([]);
          setRoleCounts({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [weekStart]);

  const teamSize = employees.length;
  const submissions = kpiRows.length;
  const responseRate = teamSize > 0 ? Math.round((submissions / teamSize) * 100) : 0;
  const avgScore = submissions > 0 ? kpiRows.reduce((s, r) => s + (Number(r.final_points_awarded) || 0), 0) / submissions : 0;

  const distribution = useMemo(() => {
    const entries = Object.entries(roleCounts);
    const total = Math.max(1, entries.reduce((s, [, c]) => s + c, 0));
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ role, count, pct: Math.round((count / total) * 100) }));
  }, [roleCounts]);

  const employeeById = useMemo(() => {
    const m = new Map<string, TeamEmployee>();
    employees.forEach((e) => m.set(e.user_id, e));
    return m;
  }, [employees]);

  const activityRows = useMemo(() => {
    return [...kpiRows]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 6)
      .map((r) => {
        const when = r.updated_at || r.created_at;
        const emp = employeeById.get(r.employee_id);
        return {
          id: r.id,
          title: `KPI saved — ${displayName(emp)}`,
          when,
          points: r.final_points_awarded,
        };
      });
  }, [kpiRows, employeeById]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Metrics</h1>
        <p className="text-muted-foreground">Overview of your team performance for the week starting {weekStart}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Employees" value={teamSize} deltaLabel="on your team" icon={<Users className="h-5 w-5 text-sky-600" />} />
        <MetricCard title="KPI Submissions" value={submissions} deltaLabel={`this week (${weekStart})`} icon={<ClipboardList className="h-5 w-5 text-emerald-600" />} />
        <MetricCard title="Response Rate" value={`${responseRate}%`} deltaLabel="team completed" icon={<Percent className="h-5 w-5 text-purple-600" />} />
        <MetricCard title="Avg KPI Score" value={avgScore ? avgScore.toFixed(1) : "0.0"} deltaLabel="out of 30" icon={<Star className="h-5 w-5 text-orange-600" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Employee Distribution</CardTitle>
            <div className="text-sm text-muted-foreground">By role</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {distribution.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data.</div>
            ) : (
              distribution.map((row) => (
                <div key={row.role} className="grid grid-cols-[140px,1fr,48px] gap-4 items-center">
                  <div className="text-sm text-muted-foreground truncate">{row.role}</div>
                  <Progress value={row.pct} className="h-2 bg-slate-100" />
                  <div className="text-sm text-muted-foreground text-right">{row.pct}%</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <div className="text-sm text-muted-foreground">Latest updates</div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              activityRows.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">Final points: {a.points} / 30</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(a.when)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  deltaLabel,
  icon,
}: {
  title: string;
  value: string | number;
  deltaLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="emp-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{deltaLabel}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-50 border flex items-center justify-center">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
