import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, CheckCircle, XCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function RequestsManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"approved" | "rejected">("approved");
  const [managerNote, setManagerNote] = useState("");
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const { toast } = useToast();
  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    // 1) current user is the manager
    const { data: userResp } = await supabase.auth.getUser();
    const managerUid = userResp?.user?.id;
    if (!managerUid) {
      toast({ title: "You must be signed in", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2) team relations by manager_id
    const { data: relRows, error: relErr } = await supabase
      .schema(SCHEMA)
      .from("employee_manager_relations")
      .select("employee_id")
      .eq("manager_id", managerUid)
      .eq("is_active", true);
    if (relErr) {
      toast({ title: "Error fetching team", variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = Array.from(new Set((relRows || []).map((r: any) => r.employee_id).filter(Boolean)));
    setTeamIds(ids);

    if (ids.length === 0) {
      setRequests([]);
      setLoading(false);
      toast({ title: "No team members found", description: "No active employee assignments were found for your account.", variant: "destructive" });
      return;
    }

    // 3) requests only for my team (feedbackApp."EmployeeRequests")
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from("EmployeeRequests")
      .select('id, created_at, "RequestType", "Title", "Description", "StartDate", "EndDate", "idProfile", "Status", "DescriptionManager"')
      .in("idProfile", ids)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching requests", variant: "destructive" });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (requestId: string, status: "approved" | "rejected") => {
    setActiveRequest(requests.find(r => r.id === requestId) || null);
    setActionType(status);
    setManagerNote("");
    setModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      approved: "bg-green-500/20 text-green-700 dark:text-green-300",
      rejected: "bg-red-500/20 text-red-700 dark:text-red-300",
    };
    return <Badge className={variants[status] || ""}>{status}</Badge>;
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: "Vacation",
      sick_day: "Sick Day",
      free_day: "Free Day",
      meeting: "Special Meeting",
      suggestion: "Suggestion",
      paperwork: "Paperwork",
    };
    return labels[type] || type;
  };

  const filterAndSearch = (list: any[]) => {
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      const textOk =
        q === "" ||
        [
          r.title,
          r.request_type,
          r.description ?? "",
          r.description_manager ?? "",
          `${r.profiles?.first_name ?? ""} ${r.profiles?.last_name ?? ""}`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const created = new Date(r.created_at);
      const fromOk = fromDate ? created >= new Date(fromDate) : true;
      const toOk = toDate ? created <= new Date(toDate + "T23:59:59") : true;
      return textOk && fromOk && toOk;
    });
  };

  const filterByStatus = (status: string) => {
    return requests.filter((r) => (r["Status"] ?? "pending") === status);
  };

  const renderRequests = (filteredRequests: any[]) => {
    if (filteredRequests.length === 0) {
      return (
        <Card className="emp-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No requests in this category
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="emp-card">
            <CardHeader className={`bg-white rounded-t-md`}>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{request["Title"]}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 mb-[5px] text-sm text-muted-foreground">
                    <Badge variant="outline">{getRequestTypeLabel(request["RequestType"])}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground mr-2">{new Date(request.created_at).toLocaleString()}</div>
                  {request["Status"] === "pending" && (
                    <>
                      <Button size="sm" className="emp-btn-inline" onClick={() => handleUpdateStatus(request.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" className="emp-btn-inline" onClick={() => handleUpdateStatus(request.id, "rejected")}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {request["Description"] && (
                <p className="text-sm text-muted-foreground">{request["Description"]}</p>
              )}
              {request["DescriptionManager"] && (
                <p className="text-xs text-muted-foreground">Manager note: {request["DescriptionManager"]}</p>
              )}
              {request["StartDate"] && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(request["StartDate"]).toLocaleDateString()}
                  </span>
                  {request["EndDate"] && (
                    <>
                      <span>→</span>
                      <span>{new Date(request["EndDate"]).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Employee Requests</h2>
        <p className="text-muted-foreground">Review and manage employee requests</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card onClick={() => setTab("pending")} className={`emp-card ${tab === "pending" ? "bg-blue-50 border-blue-200" : ""} cursor-pointer`}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{filterByStatus("pending").length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card onClick={() => setTab("approved")} className={`emp-card ${tab === "approved" ? "bg-blue-50 border-blue-200" : ""} cursor-pointer`}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{filterByStatus("approved").length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card onClick={() => setTab("rejected")} className={`emp-card ${tab === "rejected" ? "bg-blue-50 border-blue-200" : ""} cursor-pointer`}>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{filterByStatus("rejected").length}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs to match Manager view */}
      <div className="flex rounded-md overflow-hidden bg-muted/50">
        <Button variant={tab === "pending" ? "default" : "ghost"} className="flex-1 rounded-none" onClick={() => setTab("pending")}>
          Pending ({filterByStatus("pending").length})
        </Button>
        <Button variant={tab === "approved" ? "default" : "ghost"} className="flex-1 rounded-none" onClick={() => setTab("approved")}>
          Approved ({filterByStatus("approved").length})
        </Button>
        <Button variant={tab === "rejected" ? "default" : "ghost"} className="flex-1 rounded-none" onClick={() => setTab("rejected")}>
          Rejected ({filterByStatus("rejected").length})
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-2">
          <Label>Search</Label>
          <Input placeholder="Search by employee, title, type, description..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

      {/* Single list controlled by tab and filters */}
      {renderRequests(
        filterAndSearch(
          tab === "pending" ? filterByStatus("pending") : tab === "approved" ? filterByStatus("approved") : filterByStatus("rejected")
        )
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{actionType === "approved" ? "Approve Request" : "Reject Request"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Manager comment (optional)</Label>
              <Textarea value={managerNote} onChange={(e) => setManagerNote(e.target.value)} rows={3} placeholder="Add a note" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="emp-btn-inline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="emp-btn-inline" onClick={async () => {
                if (!activeRequest) return;
                setLoading(true);
                // Guard: only allow updates for my team requests (compare against idProfile)
                if (!teamIds.includes(activeRequest["idProfile"])) {
                  toast({ title: "Not authorized to update this request", variant: "destructive" });
                  setLoading(false);
                  return;
                }
                const { error } = await supabase
                  .schema(SCHEMA)
                  .from("EmployeeRequests")
                  .update({
                    Status: actionType,
                    DescriptionManager: managerNote || null,
                  })
                  .eq("id", activeRequest.id);
                if (error) {
                  toast({ title: "Error updating request", variant: "destructive" });
                } else {
                  toast({ title: `Request ${actionType}!` });
                  fetchRequests();
                  setModalOpen(false);
                }
                setLoading(false);
              }}>
                {actionType === "approved" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
