import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

type Request = {
  id: string;
  title: string | null;
  request_type: string | null;
  start_date?: string | null; // legacy
  end_date?: string | null;   // legacy
  StartDate?: string | null;  // PascalCase
  EndDate?: string | null;    // PascalCase
  status?: string | null;
  description?: string | null;
};

type Assignment = {
  survey_id: string;
  employee_id: string;
  status: string | null;
  created_at: string | null;
};

type Survey = { id: string; title: string | null };

type DayEvent = {
  dateKey: string; // yyyy-mm-dd
  type: "request" | "survey";
  label: string;
  id?: string;
  meta?: any;
};

function formatKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Parse a date string safely in local time. If it's YYYY-MM-DD, build from parts (no TZ shift).
function parseLocalDate(s: string): Date {
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (ymd.test(s)) {
    const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

interface EmployeeScheduleProps {
  onOpenRequests?: (requestId?: string) => void;
}

export default function EmployeeSchedule({ onOpenRequests }: EmployeeScheduleProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setEvents([]); return; }

      // Requests with date ranges (table uses PascalCase + idProfile)
      const reqRes = await supabase
        .schema(SCHEMA)
        .from("EmployeeRequests")
        .select('id, "Title", "RequestType", "StartDate", "EndDate", "Status", "Description", "idProfile"')
        .eq("idProfile", uid)
        .eq("Status", "approved");

      // Survey assignments (use created_at as the date marker)
      const assignRes = await supabase
        .schema(SCHEMA)
        .from("EmployeeSurveysAssignments")
        .select("survey_id, employee_id, status, created_at")
        .eq("employee_id", uid);

      const surveysMap = new Map<string, Survey>();
      // Try to fetch survey titles for assignments in one go
      const surveyIds = Array.from(new Set((assignRes.data || []).map((a: any) => a.survey_id).filter(Boolean)));
      if (surveyIds.length) {
        const sres = await supabase
          .schema(SCHEMA)
          .from("EmployeeSurveys")
          .select("id, title")
          .in("id", surveyIds);
        (sres.data || []).forEach((s: any) => surveysMap.set(s.id, { id: s.id, title: s.title }));
      }

      const ev: DayEvent[] = [];
      // Expand request date ranges into day events
      (reqRes.data || []).forEach((r: Request | any) => {
        const startStr = r.StartDate ?? r.start_date;
        const endStr = r.EndDate ?? r.end_date ?? startStr ?? null;
        if (!startStr) return;
        const start = parseLocalDate(startStr);
        const end = endStr ? parseLocalDate(endStr) : parseLocalDate(startStr);
        for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
          ev.push({
            dateKey: formatKey(d),
            type: "request",
            label: r.Title || r.title || r.RequestType || r.request_type || "Request",
            id: r.id,
            meta: r,
          });
        }
      });
      // Map survey assignments to their created_at day
      (assignRes.data || []).forEach((a: Assignment) => {
        if (!a.created_at) return;
        const key = formatKey(new Date(a.created_at));
        const stitle = surveysMap.get(a.survey_id)?.title || "Survey";
        ev.push({ dateKey: key, type: "survey", label: stitle, id: a.survey_id, meta: { status: a.status } });
      });

      setEvents(ev);
    })();
  }, []);

  const monthMatrix = useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(y, m, 1);
    const startDay = first.getDay(); // 0=Sun
    const start = addDays(first, -startDay);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    return cells;
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const e of events) {
      if (!map.has(e.dateKey)) map.set(e.dateKey, []);
      map.get(e.dateKey)!.push(e);
    }
    return map;
  }, [events]);

  const monthLabel = month.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Schedule</h2>
          <p className="text-muted-foreground">See requests and surveys on your calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="emp-btn-inline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Prev</button>
          <div className="min-w-[160px] text-center font-medium">{monthLabel}</div>
          <button className="emp-btn-inline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button>
          <button className="emp-btn-inline" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
        </div>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-sm mb-2 text-muted-foreground">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthMatrix.map((d) => {
              const key = formatKey(d);
              const inMonth = d.getMonth() === month.getMonth();
              const dayEvents = eventsByDay.get(key) || [];
              const hasReq = dayEvents.some((e) => e.type === "request");
              const hasSurv = dayEvents.some((e) => e.type === "survey");
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`h-24 rounded-lg border p-2 text-left transition-colors ${inMonth ? "bg-white" : "bg-muted"} hover:bg-secondary/30`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${inMonth ? "" : "opacity-50"}`}>{d.getDate()}</span>
                    <div className="flex gap-1">
                      {hasReq && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      {hasSurv && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                    </div>
                  </div>
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e, idx) => (
                      <div key={idx} className="truncate text-xs">
                        <Badge className={`${e.type === "request" ? "bg-blue-500" : "bg-purple-500"} text-white mr-1`}>{e.type}</Badge>
                        {e.label}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedKey && (
        <Card className="emp-card">
          <CardHeader>
            <CardTitle className="text-base">Events on {selectedKey}</CardTitle>
          </CardHeader>
          <CardContent>
            {(eventsByDay.get(selectedKey) || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No events this day.</div>
            ) : (
              <div className="space-y-2">
                {(eventsByDay.get(selectedKey) || []).map((e, i) => {
                  if (e.type === "request") {
                    const r = e.meta as Request;
                    return (
                      <div key={i} className="text-sm p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            <Badge className="bg-blue-500 text-white mr-2">request</Badge>
                            {e.label}
                          </div>
                          {r?.status && <span className="text-xs bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded">{r.status}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(r?.StartDate || r?.start_date) && formatKey(parseLocalDate((r?.StartDate || r?.start_date) as string))} { (r?.EndDate || r?.end_date) ? `→ ${formatKey(parseLocalDate((r?.EndDate || r?.end_date) as string))}` : ""}
                        </div>
                        {r?.description && (
                          <div className="text-xs mt-2">{r.description}</div>
                        )}
                        <div className="mt-2">
                          <button className="emp-btn-inline" onClick={() => onOpenRequests?.(r?.id)}>Open in My Requests</button>
                        </div>
                      </div>
                    );
                  } else {
                    const s = e.meta as { status?: string | null };
                    return (
                      <div key={i} className="text-sm p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            <Badge className="bg-purple-500 text-white mr-2">survey</Badge>
                            {e.label}
                          </div>
                          {s?.status && <span className="text-xs bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded">{s.status}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Assigned</div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
            <div className="mt-4">
              <button className="emp-btn-inline" onClick={() => setSelectedKey(null)}>Close</button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
