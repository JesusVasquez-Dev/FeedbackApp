import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/modules/api/me";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type ProjectRow = {
  id: string;
  company_id: number;
  name: string;
  hourly_rate: number | null;
  active: boolean;
  created_at?: string;
};

type RequestRow = {
  id: string;
  company_id: number;
  requested_by: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

type EntryRow = {
  id: string;
  company_id: number;
  user_id: string;
  project_id: string | null;
  description: string | null;
  billable: boolean;
  start_time: string;
  end_time: string | null;
  duration_text?: string | null;
  duration_seconds?: number | null;
};

type ProfileRow = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

function downloadCsv(filename: string, rows: Array<Record<string, any>>) {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[\n\r,\"]/g.test(s)) return `"${s.replace(/\"/g, '""')}"`;
    return s;
  };

  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const lines = [headers.map(escape).join(",")];
  rows.forEach((r) => {
    lines.push(headers.map((h) => escape(r[h])).join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ManagerTimeTracker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectRate, setNewProjectRate] = useState<string>("");

  const [entriesFrom, setEntriesFrom] = useState<string>("");
  const [entriesTo, setEntriesTo] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [filterProjectId, setFilterProjectId] = useState<string>("");

  const projectNameById = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const userLabelById = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => {
      const nm = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.email || p.user_id;
      m.set(p.user_id, nm);
    });
    return m;
  }, [profiles]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id || null;
        if (!uid) {
          if (mounted) setError("You must be signed in");
          return;
        }
        if (mounted) setManagerId(uid);

        const { profile } = await getProfile(uid, auth.user?.email || undefined);
        const cid = (profile as any)?.CompanyID ?? (profile as any)?.company_id ?? null;
        const normalized = typeof cid === "number" ? cid : cid ? Number(cid) : null;
        if (!normalized) {
          if (mounted) setError("Missing CompanyID on your profile");
          return;
        }
        if (!mounted) return;
        setCompanyId(normalized);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to initialize");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadAll(cid: number) {
    setLoading(true);
    setError(null);
    try {
      const pr = await supabase
        .schema(SCHEMA)
        .from("TimeProjects")
        .select("id, company_id, name, hourly_rate, active, created_at")
        .eq("company_id", cid)
        .order("name", { ascending: true });
      if (pr.error) throw pr.error;
      setProjects((pr.data || []) as any);

      const rr = await supabase
        .schema(SCHEMA)
        .from("TimeProjectRequests")
        .select("id, company_id, requested_by, name, status, created_at, reviewed_by, reviewed_at")
        .eq("company_id", cid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (rr.error) throw rr.error;
      setRequests((rr.data || []) as any);

      let q = supabase
        .schema(SCHEMA)
        .from("TimeEntries")
        .select("id, company_id, user_id, project_id, description, billable, start_time, end_time, duration_text, duration_seconds")
        .eq("company_id", cid)
        .order("start_time", { ascending: false })
        .limit(500);

      if (entriesFrom) q = q.gte("start_time", new Date(`${entriesFrom}T00:00:00`).toISOString());
      if (entriesTo) q = q.lte("start_time", new Date(`${entriesTo}T23:59:59`).toISOString());
      if (filterUserId) q = q.eq("user_id", filterUserId);
      if (filterProjectId) q = q.eq("project_id", filterProjectId);

      const er = await q;
      if (er.error) throw er.error;
      const entryRows = (er.data || []) as any as EntryRow[];
      setEntries(entryRows);

      const userIds = Array.from(new Set(entryRows.map((e) => e.user_id).filter(Boolean)));
      if (userIds.length) {
        const prof = await supabase
          .schema(SCHEMA)
          .from("profiles")
          .select("user_id, first_name, last_name, email")
          .in("user_id", userIds);
        if (!prof.error) setProfiles((prof.data || []) as any);
      } else {
        setProfiles([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load time tracker data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!companyId) return;
    loadAll(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function createProject() {
    if (!companyId) return;
    const nm = newProjectName.trim();
    if (!nm) return;

    setLoading(true);
    setError(null);
    try {
      const hourly = newProjectRate.trim() ? Number(newProjectRate) : null;
      const ins = await supabase
        .schema(SCHEMA)
        .from("TimeProjects")
        .insert({ company_id: companyId, name: nm, hourly_rate: hourly, active: true })
        .select("id, company_id, name, hourly_rate, active, created_at")
        .single();
      if (ins.error) throw ins.error;
      setProjects((prev) => [ins.data as any, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProjectName("");
      setNewProjectRate("");
    } catch (e: any) {
      setError(e?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  async function updateProject(id: string, patch: Partial<ProjectRow>) {
    setLoading(true);
    setError(null);
    try {
      const upd = await supabase
        .schema(SCHEMA)
        .from("TimeProjects")
        .update(patch)
        .eq("id", id)
        .select("id, company_id, name, hourly_rate, active, created_at")
        .single();
      if (upd.error) throw upd.error;
      setProjects((prev) => prev.map((p) => (p.id === id ? (upd.data as any) : p)));
    } catch (e: any) {
      setError(e?.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  }

  async function reviewRequest(req: RequestRow, action: "approved" | "rejected") {
    if (!companyId || !managerId) return;

    setLoading(true);
    setError(null);
    try {
      if (action === "approved") {
        const existing = projects.find((p) => p.company_id === companyId && p.name.trim().toLowerCase() === req.name.trim().toLowerCase());
        if (!existing) {
          const created = await supabase
            .schema(SCHEMA)
            .from("TimeProjects")
            .insert({ company_id: companyId, name: req.name.trim(), hourly_rate: null, active: true, created_by: managerId })
            .select("id, company_id, name, hourly_rate, active, created_at")
            .single();
          if (created.error) throw created.error;
          setProjects((prev) => [created.data as any, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }

      const upd = await supabase
        .schema(SCHEMA)
        .from("TimeProjectRequests")
        .update({ status: action, reviewed_by: managerId, reviewed_at: new Date().toISOString() })
        .eq("id", req.id)
        .select("id, company_id, requested_by, name, status, created_at, reviewed_by, reviewed_at")
        .single();
      if (upd.error) throw upd.error;
      setRequests((prev) => prev.map((r) => (r.id === req.id ? (upd.data as any) : r)));
    } catch (e: any) {
      setError(e?.message || "Failed to update request");
    } finally {
      setLoading(false);
    }
  }

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);

  const exportRows = useMemo(() => {
    return entries.map((e) => ({
      id: e.id,
      employee: userLabelById.get(e.user_id) || e.user_id,
      project: e.project_id ? projectNameById.get(e.project_id) || e.project_id : "",
      description: e.description || "",
      billable: e.billable ? "true" : "false",
      start_time: e.start_time,
      end_time: e.end_time || "",
      duration: e.duration_text || (typeof e.duration_seconds === "number" ? String(e.duration_seconds) : ""),
    }));
  }, [entries, projectNameById, userLabelById]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Time Tracker</h1>
        <p className="text-muted-foreground mt-2">Manage projects, approve project requests, and review time entries</p>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-6">
        <Card className="emp-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Create and manage available projects</CardDescription>
              </div>
              <Button variant="outline" onClick={() => companyId && loadAll(companyId)} disabled={loading || !companyId}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 items-end">
              <div className="md:col-span-1">
                <Label>Name</Label>
                <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" />
              </div>
              <div className="md:col-span-1">
                <Label>Hourly rate</Label>
                <Input value={newProjectRate} onChange={(e) => setNewProjectRate(e.target.value)} placeholder="e.g. 75" />
              </div>
              <div className="md:col-span-1 flex gap-2">
                <Button onClick={createProject} disabled={loading || !companyId || !newProjectName.trim()}>
                  Add
                </Button>
              </div>
            </div>

            <div className="mt-4 border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Hourly rate</th>
                    <th className="text-left p-3 font-semibold">Active</th>
                    <th className="text-right p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="p-3">
                        <Input
                          value={p.name}
                          onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
                          onBlur={() => updateProject(p.id, { name: p.name.trim() || p.name })}
                          disabled={loading}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={p.hourly_rate === null || p.hourly_rate === undefined ? "" : String(p.hourly_rate)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, hourly_rate: raw.trim() ? Number(raw) : null } : x)));
                          }}
                          onBlur={() => updateProject(p.id, { hourly_rate: p.hourly_rate === null ? null : Number(p.hourly_rate) })}
                          disabled={loading}
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={Boolean(p.active)}
                          onChange={(e) => updateProject(p.id, { active: e.target.checked })}
                          disabled={loading}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="outline" onClick={() => updateProject(p.id, { active: false })} disabled={loading || !p.active}>
                          Deactivate
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && projects.length === 0 && (
                    <tr>
                      <td className="p-3 text-sm text-muted-foreground" colSpan={4}>
                        No projects yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Project Requests</CardTitle>
                <CardDescription>Approve or reject employee project requests</CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">Pending: {pendingRequests.length}</div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No pending requests.</div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((r) => (
                  <div key={r.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground">Requested: {new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => reviewRequest(r, "approved")} disabled={loading}>
                        Approve
                      </Button>
                      <Button variant="outline" onClick={() => reviewRequest(r, "rejected")} disabled={loading}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>Review time entries and export CSV</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadCsv(`time_entries_${new Date().toISOString().slice(0, 10)}.csv`, exportRows)}
                  disabled={loading || exportRows.length === 0}
                >
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => companyId && loadAll(companyId)} disabled={loading || !companyId}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4 items-end">
              <div>
                <Label>From</Label>
                <Input type="date" value={entriesFrom} onChange={(e) => setEntriesFrom(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={entriesTo} onChange={(e) => setEntriesTo(e.target.value)} />
              </div>
              <div>
                <Label>Employee</Label>
                <Select value={filterUserId} onValueChange={(v) => setFilterUserId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {profiles
                      .slice()
                      .sort((a, b) => (userLabelById.get(a.user_id) || "").localeCompare(userLabelById.get(b.user_id) || ""))
                      .map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {userLabelById.get(p.user_id) || p.user_id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Project</Label>
                  <Select value={filterProjectId} onValueChange={(v) => setFilterProjectId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEntriesFrom("");
                    setEntriesTo("");
                    setFilterUserId("");
                    setFilterProjectId("");
                    if (companyId) loadAll(companyId);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button onClick={() => companyId && loadAll(companyId)} disabled={loading || !companyId}>
                Apply filters
              </Button>
            </div>

            <div className="mt-4 border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold">Employee</th>
                    <th className="text-left p-3 font-semibold">Project</th>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold">Billable</th>
                    <th className="text-left p-3 font-semibold">Start</th>
                    <th className="text-left p-3 font-semibold">End</th>
                    <th className="text-left p-3 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/50">
                      <td className="p-3">{userLabelById.get(e.user_id) || e.user_id}</td>
                      <td className="p-3">{e.project_id ? projectNameById.get(e.project_id) || e.project_id : "—"}</td>
                      <td className="p-3">{e.description || "—"}</td>
                      <td className="p-3">{e.billable ? "Yes" : "No"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(e.start_time).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{e.end_time ? new Date(e.end_time).toLocaleString() : "Running"}</td>
                      <td className="p-3 font-mono">{e.end_time ? (e.duration_text || "") : "—"}</td>
                    </tr>
                  ))}
                  {!loading && entries.length === 0 && (
                    <tr>
                      <td className="p-3 text-sm text-muted-foreground" colSpan={7}>
                        No entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
