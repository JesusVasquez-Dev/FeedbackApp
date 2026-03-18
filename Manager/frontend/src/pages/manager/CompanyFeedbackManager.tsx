import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/modules/auth/supabaseClient";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type TeamMember = { user_id: string; first_name?: string | null; last_name?: string | null; email?: string | null };

type FeedbackRow = {
  id: number;
  created_at: string | null;
  category: string | null;
  OverallRating: number | null;
  YourFeedback: string | null;
  employee_id: string;
  Status: string | null;
};

export default function CompanyFeedbackManager() {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const teamMap = useMemo(() => {
    const m = new Map<string, string>();
    team.forEach((t) => {
      const nm = `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.email || t.user_id;
      m.set(t.user_id, nm);
    });
    return m;
  }, [team]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const c = (r.category || "").trim();
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: auth } = await supabase.auth.getUser();
        const managerId = auth.user?.id;
        if (!managerId) return;

        const rel = await supabase
          .schema(SCHEMA)
          .from("employee_manager_relations")
          .select("employee_id")
          .eq("manager_id", managerId)
          .eq("is_active", true);
        if (rel.error) throw rel.error;

        const ids = Array.from(new Set((rel.data || []).map((r: any) => r.employee_id).filter(Boolean)));
        if (ids.length === 0) {
          setTeam([]);
          setRows([]);
          return;
        }

        const prof = await supabase
          .schema(SCHEMA)
          .from("profiles")
          .select("user_id, first_name, last_name, email")
          .in("user_id", ids)
          .order("first_name", { ascending: true })
          .order("last_name", { ascending: true });
        if (prof.error) throw prof.error;
        const teamRows = (prof.data || []) as TeamMember[];
        setTeam(teamRows);

        const teamIds = teamRows.map((t) => t.user_id).filter(Boolean);
        const fb = await supabase
          .schema(SCHEMA)
          .from("ClientFeedback")
          .select("id, created_at, category, OverallRating, YourFeedback, employee_id, Status")
          .in("employee_id", teamIds)
          .order("created_at", { ascending: false })
          .limit(200);
        if (fb.error) throw fb.error;
        setRows((fb.data || []) as FeedbackRow[]);
      } catch (e: any) {
        setError(e?.message || "Failed to load client escalations");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const from = filterFromDate ? new Date(`${filterFromDate}T00:00:00`).getTime() : null;
    const to = filterToDate ? new Date(`${filterToDate}T23:59:59`).getTime() : null;
    return rows.filter((r) => {
      if (filterEmployeeId && r.employee_id !== filterEmployeeId) return false;
      if (statusFilter && (r.Status || "").toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter && (r.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (from === null && to === null) return true;
      if (!r.created_at) return false;
      const t = new Date(r.created_at).getTime();
      if (Number.isNaN(t)) return false;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }, [rows, filterEmployeeId, statusFilter, categoryFilter, filterFromDate, filterToDate]);

  async function updateStatus(id: number, next: string) {
    try {
      setSavingId(id);
      const upd = await supabase
        .schema(SCHEMA)
        .from("ClientFeedback")
        .update({ Status: next })
        .eq("id", id)
        .select("id, Status")
        .single();
      if (upd.error) throw upd.error;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, Status: next } : r)));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Client Escalations</h2>
        <p className="text-sm text-muted-foreground">Escalations submitted by client users for your employees.</p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm block">Employee</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
            >
              <option value="">All</option>
              {team.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {teamMap.get(t.user_id)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm block">Status</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Under Review">Under Review</option>
              <option value="Addressed">Addressed</option>
            </select>
          </div>
          <div>
            <label className="text-sm block">Category</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm block">From</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              type="date"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm block">To</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              type="date"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="emp-card p-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium">{teamMap.get(r.employee_id) || r.employee_id}</div>
                <div className="text-sm text-muted-foreground">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ""} • {r.category || "General"}
                </div>
                {r.YourFeedback && <div className="mt-2 whitespace-pre-wrap text-sm">{r.YourFeedback}</div>}
              </div>
              <div className="min-w-[210px] text-right">
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <select
                  className="border rounded-md px-2 py-1 text-sm"
                  value={r.Status || "Under Review"}
                  onChange={(e) => updateStatus(r.id, e.target.value)}
                  disabled={savingId === r.id}
                >
                  <option>Under Review</option>
                  <option>Addressed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No escalations found.</div>
        )}
      </div>
    </div>
  );
}
