import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getProfile } from "@/modules/api/me";
import { useAuth } from "@/modules/auth/AuthContext";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type Project = {
  id: string;
  name: string;
  hourly_rate: number | null;
  active: boolean;
};

type TimeEntry = {
  id: string;
  project_id: string | null;
  description: string | null;
  billable: boolean;
  start_time: string;
  end_time: string | null;
  duration_text?: string | null;
  duration_seconds?: number | null;
};

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toTimeOnly(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toDateKey(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatHMS(totalSeconds: number) {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function dateLabel(dateKey: string) {
  const todayKey = toDateKey(new Date().toISOString());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterdayKey = toDateKey(y.toISOString());
  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";
  return dateKey;
}

export default function EmployeeTimeTracker({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [history, setHistory] = useState<TimeEntry[]>([]);
  const [tab, setTab] = useState<"timer" | "history">("timer");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ description: string; projectId: string; billable: boolean; startLocal: string; endLocal: string }>({
    description: "",
    projectId: "",
    billable: false,
    startLocal: "",
    endLocal: "",
  });

  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [billable, setBillable] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requesting, setRequesting] = useState(false);

  const lastSavedRef = useRef<{ id: string; description: string; projectId: string; billable: boolean } | null>(null);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const tickRef = useRef<number | null>(null);

  const elapsedMs = useMemo(() => {
    if (!running?.start_time) return 0;
    const start = new Date(running.start_time).getTime();
    const end = running.end_time ? new Date(running.end_time).getTime() : nowMs;
    return Math.max(0, end - start);
  }, [running?.start_time, running?.end_time, nowMs]);

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [elapsedMs]);

  useEffect(() => {
    if (!open) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }

    if (!tickRef.current) {
      tickRef.current = window.setInterval(() => setNowMs(Date.now()), 500);
    }

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!open) return;
      if (!user?.id) return;

      setLoading(true);
      try {
        const { profile } = await getProfile(user.id, user.email || undefined);
        const cid = (profile as any)?.CompanyID ?? (profile as any)?.company_id ?? null;
        if (!mounted) return;
        setCompanyId(typeof cid === "number" ? cid : cid ? Number(cid) : null);

        if (cid) {
          const pr = await supabase
            .schema(SCHEMA)
            .from("TimeProjects")
            .select("id, name, hourly_rate, active")
            .eq("company_id", cid)
            .eq("active", true)
            .order("name", { ascending: true });
          if (!pr.error) setProjects((pr.data || []) as any);
        }

        if (cid) {
          const rr = await supabase
            .schema(SCHEMA)
            .from("TimeEntries")
            .select("id, project_id, description, billable, start_time, end_time, duration_text, duration_seconds")
            .eq("company_id", cid)
            .eq("user_id", user.id)
            .is("end_time", null)
            .order("start_time", { ascending: false })
            .limit(1);
          if (!rr.error) {
            const entry = (rr.data || [])[0] as any;
            setRunning(entry ? (entry as TimeEntry) : null);
            if (entry) {
              setDescription(entry.description || "");
              setProjectId(entry.project_id || "");
              setBillable(Boolean(entry.billable));
            }
          }
        }

        if (cid) {
          const hist = await supabase
            .schema(SCHEMA)
            .from("TimeEntries")
            .select("id, project_id, description, billable, start_time, end_time, duration_text, duration_seconds")
            .eq("company_id", cid)
            .eq("user_id", user.id)
            .order("start_time", { ascending: false })
            .limit(15);
          if (!hist.error) {
            setHistory((hist.data || []) as any);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [open, user?.id, user?.email]);

  const start = async () => {
    if (!user?.id) return;
    if (!companyId) return;
    if (running) return;

    setLoading(true);
    try {
      const ins = await supabase
        .schema(SCHEMA)
        .from("TimeEntries")
        .insert({
          company_id: companyId,
          user_id: user.id,
          project_id: projectId || null,
          description: description.trim() || null,
          billable,
          start_time: new Date().toISOString(),
          end_time: null,
        })
        .select("id, project_id, description, billable, start_time, end_time")
        .single();

      if (!ins.error && ins.data) {
        setRunning(ins.data as any);
        lastSavedRef.current = { id: (ins.data as any).id, description, projectId, billable };
      }
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    if (!running?.id) return;

    setLoading(true);
    try {
      const upd = await supabase
        .schema(SCHEMA)
        .from("TimeEntries")
        .update({ end_time: new Date().toISOString(), description: description.trim() || null, project_id: projectId || null, billable })
        .eq("id", running.id)
        .select("id, project_id, description, billable, start_time, end_time")
        .single();

      if (!upd.error && upd.data) {
        setRunning(null);
        setDescription("");
        setProjectId("");
        setBillable(false);
        setTab("timer");
        setEditingId(null);
        setEditing({ description: "", projectId: "", billable: false, startLocal: "", endLocal: "" });
        lastSavedRef.current = null;

        if (companyId && user?.id) {
          const hist = await supabase
            .schema(SCHEMA)
            .from("TimeEntries")
            .select("id, project_id, description, billable, start_time, end_time, duration_text, duration_seconds")
            .eq("company_id", companyId)
            .eq("user_id", user.id)
            .order("start_time", { ascending: false })
            .limit(15);
          if (!hist.error) setHistory((hist.data || []) as any);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const beginEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditing({
      description: entry.description || "",
      projectId: entry.project_id || "",
      billable: Boolean(entry.billable),
      startLocal: toDatetimeLocal(entry.start_time),
      endLocal: toDatetimeLocal(entry.end_time),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const startIso = fromDatetimeLocal(editing.startLocal);
    const endIso = editing.endLocal ? fromDatetimeLocal(editing.endLocal) : null;
    if (!startIso) return;

    setLoading(true);
    try {
      const upd = await supabase
        .schema(SCHEMA)
        .from("TimeEntries")
        .update({
          description: editing.description.trim() || null,
          project_id: editing.projectId || null,
          billable: editing.billable,
          start_time: startIso,
          end_time: endIso,
        })
        .eq("id", editingId)
        .select("id, project_id, description, billable, start_time, end_time, duration_text, duration_seconds")
        .single();

      if (!upd.error && upd.data) {
        setHistory((prev) => prev.map((h) => (h.id === editingId ? (upd.data as any) : h)));
        setEditingId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const requestProject = async () => {
    if (!user?.id) return;
    if (!companyId) return;
    const nm = requestName.trim();
    if (!nm) return;

    setRequesting(true);
    try {
      await supabase
        .schema(SCHEMA)
        .from("TimeProjectRequests")
        .insert({ company_id: companyId, requested_by: user.id, name: nm, status: "pending" });
      setRequestName("");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Time Tracker</DialogTitle>
        </DialogHeader>

        <div className="inline-flex gap-1 rounded-md bg-gray-100 p-1">
          <Button
            variant={tab === "timer" ? "default" : "outline"}
            className={
              tab === "timer"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200 font-semibold"
                : "border-transparent bg-transparent text-gray-600 hover:bg-gray-200"
            }
            onClick={() => setTab("timer")}
            disabled={loading}
          >
            Timer
          </Button>
          <Button
            variant={tab === "history" ? "default" : "outline"}
            className={
              tab === "history"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200 font-semibold"
                : "border-transparent bg-transparent text-gray-600 hover:bg-gray-200"
            }
            onClick={() => setTab("history")}
            disabled={loading}
          >
            History
          </Button>
        </div>

        {tab === "timer" ? (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you working on?" disabled={loading || !!running} />
            </div>

            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={(v) => setProjectId(v)}>
                <SelectTrigger disabled={loading || !!running}>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" label="No project">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} label={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="tt-billable"
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                disabled={loading || !!running}
                className="h-4 w-4"
              />
              <Label htmlFor="tt-billable">Billable</Label>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="text-sm text-gray-600">Timer</div>
              <div className="font-mono text-lg">{running ? elapsedLabel : "00:00:00"}</div>
            </div>

            <div className="grid gap-2">
              <Label>Request a new project</Label>
              <div className="flex gap-2">
                <Input value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Project name" />
                <Button variant="outline" onClick={requestProject} disabled={requesting || !requestName.trim()}>
                  Request
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">Manager approval required</div>
            </div>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">No entries yet</div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const items = history.slice(0, 15);
                  const byDay: Record<string, TimeEntry[]> = {};
                  for (const h of items) {
                    const day = toDateKey(h.start_time);
                    (byDay[day] ||= []).push(h);
                  }

                  const days = Object.keys(byDay).sort((a, b) => (a < b ? 1 : -1));

                  return days.map((dayKey) => {
                    const dayEntries = byDay[dayKey];
                    const dayTotalSeconds = dayEntries.reduce((acc, h) => acc + (h.duration_seconds || 0), 0);

                    const byDesc: Record<string, TimeEntry[]> = {};
                    for (const h of dayEntries) {
                      const k = (h.description || "(No description)").trim() || "(No description)";
                      (byDesc[k] ||= []).push(h);
                    }
                    const descKeys = Object.keys(byDesc).sort((a, b) => a.localeCompare(b));

                    return (
                      <div key={dayKey} className="space-y-2">
                        <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                          <div className="text-sm font-medium text-gray-900">{dateLabel(dayKey)}</div>
                          <div className="text-sm text-gray-600">Total: {formatHMS(dayTotalSeconds)}</div>
                        </div>

                        <div className="space-y-2">
                          {descKeys.map((descKey) => {
                            const group = byDesc[descKey];
                            const groupKey = `${dayKey}||${descKey}`;
                            const isExpanded = Boolean(expandedGroups[groupKey]);
                            const groupTotalSeconds = group.reduce((acc, h) => acc + (h.duration_seconds || 0), 0);

                            if (group.length === 1) {
                              const h = group[0];
                              const pname = h.project_id ? (projects.find((p) => p.id === h.project_id)?.name || "Project") : "No project";
                              const isEdit = editingId === h.id;
                              return (
                                <div key={h.id} className="rounded-md border p-3">
                                  {!isEdit ? (
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{h.description || "(No description)"}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {pname} {h.billable ? "• Billable" : ""}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {h.end_time ? (h.duration_text || formatHMS(h.duration_seconds || 0)) : "Running"}
                                        </div>
                                      </div>
                                      <Button variant="outline" onClick={() => beginEdit(h)} disabled={loading}>
                                        Edit
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                          <div className="grid gap-2">
                            <Label>Description</Label>
                            <Input value={editing.description} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Project</Label>
                            <Select value={editing.projectId} onValueChange={(v) => setEditing((p) => ({ ...p, projectId: v }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="" label="No project">No project</SelectItem>
                                {projects.map((p) => (
                                  <SelectItem key={p.id} value={p.id} label={p.name}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              id={`tt-billable-${h.id}`}
                              type="checkbox"
                              checked={editing.billable}
                              onChange={(e) => setEditing((p) => ({ ...p, billable: e.target.checked }))}
                              className="h-4 w-4"
                            />
                            <Label htmlFor={`tt-billable-${h.id}`}>Billable</Label>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="grid gap-2">
                              <Label>Start</Label>
                              <input
                                type="datetime-local"
                                value={editing.startLocal}
                                onChange={(e) => setEditing((p) => ({ ...p, startLocal: e.target.value }))}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>End</Label>
                              <input
                                type="datetime-local"
                                value={editing.endLocal}
                                onChange={(e) => setEditing((p) => ({ ...p, endLocal: e.target.value }))}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingId(null)} disabled={loading}>
                              Cancel
                            </Button>
                            <Button onClick={saveEdit} disabled={loading}>
                              Save
                            </Button>
                          </div>
                        </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div key={groupKey} className="rounded-md border">
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50"
                                  onClick={() =>
                                    setExpandedGroups((p) => ({
                                      ...p,
                                      [groupKey]: !Boolean(p[groupKey]),
                                    }))
                                  }
                                  disabled={loading}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="h-7 w-7 rounded bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-semibold">
                                        {group.length}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{descKey}</div>
                                        <div className="text-xs text-muted-foreground">Total: {formatHMS(groupTotalSeconds)}</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-600">{isExpanded ? "Hide" : "Show"}</div>
                                  </div>
                                </button>

                                {isExpanded ? (
                                  <div className="border-t">
                                    {group.map((h) => {
                                      const pname = h.project_id ? (projects.find((p) => p.id === h.project_id)?.name || "Project") : "No project";
                                      const isEdit = editingId === h.id;
                                      return (
                                        <div key={h.id} className="px-3 py-2">
                                          {!isEdit ? (
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                <div className="text-xs text-muted-foreground">
                                                  {pname} {h.billable ? "• Billable" : ""}
                                                </div>
                                                <div className="text-sm text-gray-900">
                                                  {h.end_time ? (h.duration_text || formatHMS(h.duration_seconds || 0)) : "Running"}
                                                </div>
                                              </div>
                                              <Button variant="outline" onClick={() => beginEdit(h)} disabled={loading}>
                                                Edit
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              <div className="grid gap-2">
                                                <Label>Description</Label>
                                                <Input value={editing.description} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
                                              </div>
                                              <div className="grid gap-2">
                                                <Label>Project</Label>
                                                <Select value={editing.projectId} onValueChange={(v) => setEditing((p) => ({ ...p, projectId: v }))}>
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Select a project" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="" label="No project">No project</SelectItem>
                                                    {projects.map((p) => (
                                                      <SelectItem key={p.id} value={p.id} label={p.name}>
                                                        {p.name}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <input
                                                  id={`tt-billable-${h.id}`}
                                                  type="checkbox"
                                                  checked={editing.billable}
                                                  onChange={(e) => setEditing((p) => ({ ...p, billable: e.target.checked }))}
                                                  className="h-4 w-4"
                                                />
                                                <Label htmlFor={`tt-billable-${h.id}`}>Billable</Label>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="grid gap-2">
                                                  <Label>Start</Label>
                                                  <input
                                                    type="datetime-local"
                                                    value={editing.startLocal}
                                                    onChange={(e) => setEditing((p) => ({ ...p, startLocal: e.target.value }))}
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                                  />
                                                </div>
                                                <div className="grid gap-2">
                                                  <Label>End</Label>
                                                  <input
                                                    type="datetime-local"
                                                    value={editing.endLocal}
                                                    onChange={(e) => setEditing((p) => ({ ...p, endLocal: e.target.value }))}
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                                  />
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" onClick={() => setEditingId(null)} disabled={loading}>
                                                  Cancel
                                                </Button>
                                                <Button onClick={saveEdit} disabled={loading}>
                                                  Save
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Close
          </Button>
          {tab === "timer" && (!running ? (
            <Button onClick={start} disabled={loading || !user?.id || !companyId}>
              Start
            </Button>
          ) : (
            <Button onClick={stop} disabled={loading}>
              Stop
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
