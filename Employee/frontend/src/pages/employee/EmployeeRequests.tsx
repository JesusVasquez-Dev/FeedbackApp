import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, FileText, MessageSquare, Palmtree, UserPlus, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLocalDate(s: string): Date {
  const ymd = /^\d{4}-\d{2}-\d{2}$/;
  if (ymd.test(s)) {
    const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

const requestTypes = [
  { value: "vacation", label: "Vacation Request", icon: Palmtree, color: "bg-blue-500" },
  { value: "sick_day", label: "Sick Day", icon: Heart, color: "bg-red-500" },
  { value: "free_day", label: "Free Day", icon: Calendar, color: "bg-green-500" },
  { value: "meeting", label: "Special Meeting", icon: UserPlus, color: "bg-purple-500" },
  { value: "suggestion", label: "Suggestion Box", icon: MessageSquare, color: "bg-yellow-500" },
  { value: "paperwork", label: "Paperwork Request", icon: FileText, color: "bg-gray-500" },
];

export default function EmployeeRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { toast } = useToast();
  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";
  const [profileId, setProfileId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    request_type: "",
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    const init = async () => {
      setLoadingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be signed in to create requests", variant: "destructive" });
        setLoadingProfile(false);
        return;
      }

      // Fetch or create profile ID for current user
      const { data: profile, error: profileError } = await supabase
        .schema(SCHEMA)
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        toast({ title: "Error loading profile", description: profileError.message, variant: "destructive" });
        setLoadingProfile(false);
        return;
      }

      let resolvedProfileId: string | null = (profile as any)?.user_id ?? null;
      if (!resolvedProfileId) {
        const { data: created, error: createErr } = await supabase
          .schema(SCHEMA)
          .from("profiles")
          .insert({ user_id: user.id })
          .select("user_id")
          .single();
        if (createErr || !(created as any)?.user_id) {
          toast({ title: "Profile not found for current user", description: createErr?.message, variant: "destructive" });
          setLoadingProfile(false);
          return;
        }
        resolvedProfileId = (created as any).user_id as string;
      }

      setProfileId(resolvedProfileId);
      if (resolvedProfileId) {
        await fetchRequests(resolvedProfileId);
      }
      setLoadingProfile(false);
    };
    init();
  }, []);

  const fetchRequests = async (pid?: string) => {
    const activePid = pid || profileId;
    if (!activePid) return;

    // Use quoted identifiers for mixed/pascal case table/columns
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from('EmployeeRequests')
      .select('id, created_at, "RequestType", "Title", "Description", "StartDate", "EndDate", "idProfile", "Status", "DescriptionManager"')
      .eq('idProfile', activePid)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching requests", description: error.message, variant: "destructive" });
    } else {
      const normalized = (data || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        request_type: r["RequestType"],
        title: r["Title"],
        description: r["Description"],
        start_date: r["StartDate"],
        end_date: r["EndDate"],
        id_profile: r["idProfile"],
        status: r["Status"],
        manager_note: r["DescriptionManager"],
      }));
      setRequests(normalized);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!profileId) {
      toast({ title: "Missing profile ID", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Basic client-side validation
    if (!formData.request_type) {
      toast({ title: "Please select a request type", variant: "destructive" });
      setLoading(false);
      return;
    }
    if (["vacation", "sick_day", "free_day"].includes(formData.request_type)) {
      if (!formData.start_date) {
        toast({ title: "Please choose a start date", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    const payload: any = {
      "idProfile": profileId,
      "RequestType": formData.request_type,
      "Title": formData.title,
      "Description": formData.description || null,
      "Status": "pending",
      "DescriptionManager": null,
      "StartDate": null,
      "EndDate": null,
    };
    if (["vacation", "sick_day", "free_day"].includes(formData.request_type)) {
      payload["StartDate"] = formData.start_date || null;
      payload["EndDate"] = formData.end_date || null;
    }

    const { error } = await supabase
      .schema(SCHEMA)
      .from('EmployeeRequests')
      .insert(payload);

    if (error) {
      toast({ title: "Error creating request", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request submitted successfully!" });
      setIsOpen(false);
      setFormData({
        request_type: "",
        title: "",
        description: "",
        start_date: "",
        end_date: "",
      });
      fetchRequests();
    }
    setLoading(false);
  };

  const getTypeInfo = (type: string) => {
    return requestTypes.find((t) => t.value === type) || requestTypes[0];
  };

  const needsDateRange = ["vacation", "sick_day", "free_day"].includes(formData.request_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Requests</h2>
          <p className="text-muted-foreground">Submit and track your requests</p>
        </div>
        <button onClick={() => setIsOpen(true)} disabled={loadingProfile || !profileId} className="emp-btn-inline disabled:opacity-50 disabled:cursor-not-allowed">
          New Request
        </button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle>Create New Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Request Type</Label>
                <Select value={formData.request_type} onValueChange={(value) => setFormData({ ...formData, request_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for your request"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={4}
                />
              </div>

              {needsDateRange && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading || loadingProfile || !profileId} className="emp-btn">
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card className="emp-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No requests yet. Create your first request!</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => {
            const typeInfo = getTypeInfo(request.request_type);
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={request.id} className="emp-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${typeInfo.color}`}>
                        <TypeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{typeInfo.label}</p>
                      </div>
                    </div>
                    <div>
                      {request.status && (
                        <Badge className={
                          request.status === 'approved' ? 'bg-green-100 text-green-700' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {(request.description || request.manager_note || request.start_date) && (
                  <CardContent>
                    {request.description && (
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                    )}
                    {request.manager_note && (
                      <p className="text-xs text-muted-foreground mt-2">Manager note: {request.manager_note}</p>
                    )}
                    {request.start_date && (
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatKey(parseLocalDate(request.start_date))}
                        </span>
                        {request.end_date && (
                          <>
                            <span>→</span>
                            <span>{formatKey(parseLocalDate(request.end_date))}</span>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
