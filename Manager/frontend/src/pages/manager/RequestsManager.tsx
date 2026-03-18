import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequestRow {
  id: string;
  created_at: string;
  RequestType: string;
  Title: string;
  Description: string | null;
  StartDate: string | null;
  EndDate: string | null;
  idProfile: string;
  Status?: "pending" | "approved" | "rejected";
  DescriptionManager?: string | null;
}

export default function RequestsManager() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"approved" | "rejected">("approved");
  const [managerNote, setManagerNote] = useState("");
  const [activeRequest, setActiveRequest] = useState<RequestRow | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]); // profiles.user_id for employees managed by me
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { toast } = useToast();
  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      // 1) who am I?
      const { data: userResp } = await supabase.auth.getUser();
      const managerUid = userResp?.user?.id;
      if (!managerUid) {
        toast({ title: "You must be signed in", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 2) fetch my team (employee_manager_relations where manager_id = my uid)
      const { data: relRows, error: relErr } = await supabase
        .schema(SCHEMA)
        .from("employee_manager_relations")
        .select("employee_id")
        .eq("manager_id", managerUid)
        .eq("is_active", true);
      if (relErr) {
        toast({ title: "Error loading team", description: relErr.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set((relRows || []).map((r: any) => r.employee_id).filter(Boolean)));
      setTeamIds(ids);

      if (ids.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // 3) fetch requests for my team
      const { data, error } = await supabase
        .schema(SCHEMA)
        .from("EmployeeRequests")
        .select('id, created_at, "RequestType", "Title", "Description", "StartDate", "EndDate", "idProfile", "Status", "DescriptionManager"')
        .in("idProfile", ids)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error loading requests", description: error.message, variant: "destructive" });
      } else {
        setRequests((data || []) as unknown as RequestRow[]);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const pending = requests.filter(r => (r.Status ?? "pending") === "pending");
  const approved = requests.filter(r => r.Status === "approved");
  const rejected = requests.filter(r => r.Status === "rejected");

  const activeList = tab === "pending" ? pending : tab === "approved" ? approved : rejected;
  const filteredList = activeList.filter(r => {
    // text match against title, type, description, manager note
    const q = search.trim().toLowerCase();
    const textOk = q === "" || [r.Title, r.RequestType, r.Description ?? "", r.DescriptionManager ?? ""].some(v => String(v).toLowerCase().includes(q));
    // date range over created_at
    const created = new Date(r.created_at);
    const fromOk = fromDate ? created >= new Date(fromDate) : true;
    const toOk = toDate ? created <= new Date(toDate + "T23:59:59") : true;
    return textOk && fromOk && toOk;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Employee Requests</h2>
        <p className="text-muted-foreground">Review and manage employee requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card onClick={() => setTab("pending")} className={`emp-card ${tab === "pending" ? "bg-blue-50 border-blue-200" : ""} cursor-pointer`}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{pending.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card onClick={() => setTab("approved")} className={`emp-card ${tab === "approved" ? "bg-blue-50 border-blue-200" : ""} cursor-pointer`}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{approved.length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card onClick={() => setTab("rejected")} className={`emp-card ${tab === "rejected" ? "bg-blue-50 border-blue-200" : ""} cursor-pointer`}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{rejected.length}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex rounded-md overflow-hidden bg-muted/50">
        <Button variant={tab === "pending" ? "default" : "ghost"} className="flex-1 rounded-none" onClick={() => setTab("pending")}>Pending ({pending.length})</Button>
        <Button variant={tab === "approved" ? "default" : "ghost"} className="flex-1 rounded-none" onClick={() => setTab("approved")}>Approved ({approved.length})</Button>
        <Button variant={tab === "rejected" ? "default" : "ghost"} className="flex-1 rounded-none" onClick={() => setTab("rejected")}>Rejected ({rejected.length})</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <Label>Search</Label>
          <Input placeholder="Search by title, type, description..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button variant="ghost" onClick={() => { setSearch(""); setFromDate(""); setToDate(""); }}>Reset</Button>
        </div>
      </div>

      {loading ? (
        <Card className="emp-card"><CardContent className="p-6"><p className="text-muted-foreground">Loading...</p></CardContent></Card>
      ) : filteredList.length === 0 ? (
        <Card className="emp-card"><CardContent className="p-6"><p className="text-center text-muted-foreground">No requests in this category</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredList.map((r) => (
            <Card key={r.id} className="emp-card hover:shadow-lg transition-shadow">
              <CardHeader className="bg-white rounded-t-md">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{r.Title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 mb-[5px] text-sm text-muted-foreground">
                      <Badge variant="outline">{r.RequestType}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground mr-2">{new Date(r.created_at).toLocaleString()}</div>
                    {r.Status === "pending" && (
                      <>
                        <Button size="sm" className="emp-btn-inline" onClick={() => { setActiveRequest(r); setActionType("approved"); setManagerNote(""); setModalOpen(true); }}>Approve</Button>
                        <Button size="sm" className="emp-btn-inline" onClick={() => { setActiveRequest(r); setActionType("rejected"); setManagerNote(""); setModalOpen(true); }}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.Description && (
                  <p className="text-sm text-muted-foreground">{r.Description}</p>
                )}
                {r.DescriptionManager && (
                  <p className="text-xs text-muted-foreground">Manager note: {r.DescriptionManager}</p>
                )}
                {r.StartDate && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(r.StartDate).toLocaleDateString()}
                    </span>
                    {r.EndDate && (
                      <>
                        <span>→</span>
                        <span>{new Date(r.EndDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{actionType === "approved" ? "Approve Request" : "Reject Request"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Manager comment (optional)</Label>
              <Textarea value={managerNote} onChange={(e) => setManagerNote(e.target.value)} rows={3} placeholder="Add a note for the employee" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="emp-btn-inline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!activeRequest) return;
                // Guard: ensure the active request belongs to my team
                if (!teamIds.includes(activeRequest.idProfile)) {
                  toast({ title: "Not authorized to update this request", variant: "destructive" });
                  return;
                }
                const { error } = await supabase
                  .schema(SCHEMA)
                  .from("EmployeeRequests")
                  .update({ "Status": actionType, "DescriptionManager": managerNote || null })
                  .eq("id", activeRequest.id);
                if (error) {
                  toast({ title: "Error updating request", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: `Request ${actionType}` });
                  const { data } = await supabase
                    .schema(SCHEMA)
                    .from("EmployeeRequests")
                    .select('id, created_at, "RequestType", "Title", "Description", "StartDate", "EndDate", "idProfile", "Status", "DescriptionManager"')
                    .in("idProfile", teamIds)
                    .order("created_at", { ascending: false });
                  setRequests((data || []) as unknown as RequestRow[]);
                  setModalOpen(false);
                }
              }} className="emp-btn-inline">
                {actionType === "approved" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
