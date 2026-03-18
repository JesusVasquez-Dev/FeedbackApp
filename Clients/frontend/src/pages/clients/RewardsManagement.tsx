import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, Edit, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function RewardsManagement() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<"rewards" | "redemptions">("rewards");
  const [employees, setEmployees] = useState<any[]>([]);
  const { toast } = useToast();
  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";
  const EMPTY_FORM = {
    Title: "",
    Description: "",
    PointCost: 0,
    Category: "",
    StockQuantity: 1 as number | null,
    Visibility: true,
    AudienceType: "all" as "all" | "specific",
    TargetProfile: null as string | null,
  };

  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: userResp } = await supabase.auth.getUser();
    const managerUid = userResp?.user?.id;
    if (managerUid) {
      const { data: relRows, error: relErr } = await supabase
        .schema(SCHEMA)
        .from("employee_manager_relations")
        .select("employee_id")
        .eq("manager_id", managerUid)
        .eq("is_active", true);
      if (!relErr) {
        const ids = Array.from(new Set((relRows || []).map((r: any) => r.employee_id).filter(Boolean)));
        if (ids.length > 0) {
          const { data: teamProfiles } = await supabase
            .schema(SCHEMA)
            .from("profiles")
            .select("user_id, first_name, last_name")
            .in("user_id", ids);
          setEmployees(teamProfiles || []);
        } else {
          setEmployees([]);
        }
      } else {
        setEmployees([]);
      }
    }
    // Fetch rewards from RewardsManagement (PascalCase columns)
    const { data: rewardsData, error: rewardsError } = await supabase
      .schema(SCHEMA)
      .from("RewardsManagement")
      .select("id, created_at, Title, Description, PointCost, StockQuantity, Category, Visibility, AudienceType, TargetProfile")
      .order("created_at", { ascending: false });

    if (rewardsError) {
      toast({ title: "Error fetching rewards", variant: "destructive" });
    } else {
      setRewards(rewardsData || []);
    }

    // Fetch redemptions
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .schema(SCHEMA)
      .from("reward_redemptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (redemptionsError) {
      toast({ title: "Error fetching redemptions", variant: "destructive" });
    } else {
      setRedemptions(redemptionsData || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Compute visibility: visible if unlimited (null) or > 0; hidden if 0
    const computedVisibility = formData.StockQuantity === null || formData.StockQuantity > 0;
    const payload = { ...formData, Visibility: computedVisibility };

    if (editingReward) {
      const { error } = await supabase
        .schema(SCHEMA)
        .from("RewardsManagement")
        .update(payload)
        .eq("id", editingReward.id);

      if (error) {
        toast({ title: "Error updating reward", variant: "destructive" });
      } else {
        toast({ title: "Reward updated successfully!" });
      }
    } else {
      const { error } = await supabase.schema(SCHEMA).from("RewardsManagement").insert(payload);

      if (error) {
        toast({ title: "Error creating reward", variant: "destructive" });
      } else {
        toast({ title: "Reward created successfully!" });
      }
    }

    setIsOpen(false);
    setEditingReward(null);
    setFormData({
      ...EMPTY_FORM,
    });
    fetchData();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reward?")) return;

    const { error } = await supabase.schema(SCHEMA).from("RewardsManagement").delete().eq("id", id);

    if (error) {
      toast({ title: "Error deleting reward", variant: "destructive" });
    } else {
      toast({ title: "Reward deleted successfully!" });
      fetchData();
    }
  };

  const handleUpdateRedemptionStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .schema(SCHEMA)
      .from("reward_redemptions")
      .update({ 
        status,
        delivered_at: status === "delivered" ? new Date().toISOString() : null
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating redemption", variant: "destructive" });
    } else {
      toast({ title: "Redemption updated!" });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      approved: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      delivered: "bg-green-500/20 text-green-700 dark:text-green-300",
      cancelled: "bg-red-500/20 text-red-700 dark:text-red-300",
    };
    return <Badge className={variants[status] || ""}>{status}</Badge>;
  };

  const openEditDialog = (reward: any) => {
    setEditingReward(reward);
    setFormData({
      Title: reward.Title,
      Description: reward.Description || "",
      PointCost: reward.PointCost,
      Category: reward.Category || "",
      StockQuantity: reward.StockQuantity,
      Visibility: !!reward.Visibility,
      AudienceType: (reward.AudienceType as any) || "all",
      TargetProfile: reward.TargetProfile || null,
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Rewards Management</h2>
          <p className="text-muted-foreground">Manage rewards and track redemptions</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={subTab === "rewards" ? "default" : "outline"}
            onClick={() => setSubTab("rewards")}
            className="emp-btn-inline"
          >
            Rewards ({rewards.length})
          </Button>
          <Button
            size="sm"
            variant={subTab === "redemptions" ? "default" : "outline"}
            onClick={() => setSubTab("redemptions")}
            className="emp-btn-inline"
          >
            Redemptions ({redemptions.length})
          </Button>
        </div>
        <Button onClick={() => { setEditingReward(null); setFormData({ ...EMPTY_FORM }); setIsOpen(true); }} className="emp-btn-inline">
          New Reward
        </Button>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setEditingReward(null); setFormData({ ...EMPTY_FORM }); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingReward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  required
                  value={formData.Title}
                  onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
                  placeholder="e.g., $50 Amazon Gift Card"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Details about the reward..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Points Cost</Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    value={formData.PointCost}
                    onChange={(e) => setFormData({ ...formData, PointCost: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Stock Quantity (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.StockQuantity ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, StockQuantity: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Audience</Label>
                  <select
                    className="w-full h-10 border rounded-md px-3 text-sm"
                    value={formData.AudienceType}
                    onChange={(e) => setFormData({ ...formData, AudienceType: e.target.value as any, TargetProfile: e.target.value === "all" ? null : formData.TargetProfile })}
                  >
                    <option value="all">All employees</option>
                    <option value="specific">Specific employee</option>
                  </select>
                </div>
                {formData.AudienceType === "specific" && (
                  <div>
                    <Label>Employee</Label>
                    <select
                      className="w-full h-10 border rounded-md px-3 text-sm"
                      value={formData.TargetProfile ?? ""}
                      onChange={(e) => setFormData({ ...formData, TargetProfile: e.target.value || null })}
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.user_id} value={emp.user_id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <Label>Category (optional)</Label>
                <Input
                  value={formData.Category}
                  onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
                  placeholder="e.g., Gift Cards, Merchandise"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="reward-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={formData.Visibility}
                  onChange={(e) => setFormData({ ...formData, Visibility: e.target.checked })}
                />
                <Label htmlFor="reward-active">Active (visible to employees)</Label>
              </div>

              <Button type="submit" disabled={loading} className="emp-btn w-full">
                {loading ? "Saving..." : editingReward ? "Update Reward" : "Create Reward"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subTab === "rewards" && (
        <section className="mt-6 space-y-4">
          <h3 className="text-xl font-semibold">Rewards ({rewards.length})</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className={`emp-card ${!reward.Visibility ? "opacity-50" : ""}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(reward)} className="emp-btn-inline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(reward.id)} className="emp-btn-inline">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{reward.Title}</CardTitle>
                  {reward.Description && <p className="text-sm text-muted-foreground">{reward.Description}</p>}
                  <div className="mt-2">
                    <Badge variant="outline">{reward.AudienceType === "specific" ? "Specific" : "All employees"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-yellow-500">{reward.PointCost} points</Badge>
                      {reward.StockQuantity !== null && (
                        <Badge variant="outline">
                          <Package className="w-3 h-3 mr-1" />
                          {reward.StockQuantity} left
                        </Badge>
                      )}
                    </div>
                    {!reward.Visibility && <Badge variant="outline">Inactive</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {subTab === "redemptions" && (
        <section className="mt-10 space-y-4">
          <h3 className="text-xl font-semibold">Redemptions ({redemptions.length})</h3>
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <Card key={redemption.id} className="emp-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium">{redemption.rewards.title}</p>
                        {getStatusBadge(redemption.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Employee: {redemption.profiles?.first_name} {redemption.profiles?.last_name}
                        </p>
                        <p>Points: {redemption.points_spent}</p>
                        <p>Date: {new Date(redemption.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    {redemption.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRedemptionStatus(redemption.id, "approved")}
                          className="emp-btn-inline"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRedemptionStatus(redemption.id, "cancelled")}
                          className="emp-btn-inline"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {redemption.status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateRedemptionStatus(redemption.id, "delivered")}
                        className="emp-btn-inline"
                      >
                        Mark as Delivered
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
