import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, ShoppingBag, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function EmployeeRewards() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch available rewards from RewardsManagement (Visibility true and audience matches)
    const { data: rewardsData, error: rewardsError } = await supabase
      .schema(SCHEMA)
      .from("RewardsManagement")
      .select('id, "Title", "Description", "PointCost", "StockQuantity", "Visibility", "AudienceType", "TargetProfile"')
      .eq("Visibility", true)
      .or(`AudienceType.eq.all,TargetProfile.eq.${user.id}`)
      .order("PointCost", { ascending: true });

    if (rewardsError) {
      toast({ title: "Error loading rewards", variant: "destructive" });
    } else {
      setRewards(rewardsData || []);
    }

    // Fetch user redemptions
    const { data: redemptionsData, error: redemptionsError } = await supabase
      .schema(SCHEMA)
      .from("reward_redemptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (redemptionsError) {
      toast({ title: "Error loading redemptions", variant: "destructive" });
    } else {
      setRedemptions(redemptionsData || []);
    }

    // Calculate total points from PointsLedger (sum of delta)
    const { data: ledger } = await supabase
      .schema(SCHEMA)
      .from("PointsLedger")
      .select("delta")
      .eq("user_id", user.id);

    const balance = (ledger || []).reduce((sum: number, row: any) => sum + (row.delta || 0), 0);
    setTotalPoints(balance);
  };

  const handleRedeem = async () => {
    if (!selectedReward) return;
    if (totalPoints < selectedReward.PointCost) {
      toast({ title: "Not enough points!", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1) create redemption
    const { error: redeemErr } = await supabase
      .schema(SCHEMA)
      .from("reward_redemptions")
      .insert({
        user_id: user.id,
        reward_id: selectedReward.id,
        points_spent: selectedReward.PointCost,
        status: "claimed",
      });

    // 2) deduct points immediately
    const { error: ledgerErr } = await supabase
      .schema(SCHEMA)
      .from("PointsLedger")
      .insert({ user_id: user.id, delta: -selectedReward.PointCost, reason: "Reward redemption", source: "rewards" });

    // 3) decrement stock if finite
    let stockErr = null as any;
    if (selectedReward.StockQuantity !== null) {
      const { error: updErr } = await supabase
        .schema(SCHEMA)
        .from("RewardsManagement")
        .update({ StockQuantity: Math.max(0, (selectedReward.StockQuantity || 0) - 1) })
        .eq("id", selectedReward.id);
      stockErr = updErr;
    }

    if (redeemErr || ledgerErr || stockErr) {
      const code = (redeemErr || ledgerErr || stockErr)?.code;
      if (code === "23505") {
        toast({ title: "Already claimed", description: "You have already claimed this reward.", variant: "destructive" });
      } else if (code === "23514") {
        toast({ title: "Out of stock", description: "This reward just ran out of stock.", variant: "destructive" });
      } else {
        toast({ title: "Error redeeming reward", variant: "destructive" });
      }
    } else {
      toast({ title: "Reward redeemed successfully!", description: "It will be processed by your company" });
      fetchData();
    }
    setLoading(false);
    setSelectedReward(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      claimed: "bg-green-500/20 text-green-700 dark:text-green-300",
      // legacy mappings for compatibility
      pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      approved: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      delivered: "bg-green-500/20 text-green-700 dark:text-green-300",
      cancelled: "bg-red-500/20 text-red-700 dark:text-red-300",
    };
    return <Badge className={variants[status] || "bg-gray-200 text-gray-700"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Rewards Store</h2>
          <p className="text-muted-foreground">Redeem your points for rewards</p>
        </div>
        <Card className="emp-card border-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Available Points</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Rewards */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Available Rewards</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards
            .filter((r) => !redemptions.some((x) => x.reward_id === r.id && x.status !== "cancelled"))
            .map((reward) => {
            const canAfford = totalPoints >= reward.PointCost;
            const outOfStock = reward.StockQuantity !== null && reward.StockQuantity === 0;
            return (
              <Card
                key={reward.id}
                className={`emp-card transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${!canAfford ? "opacity-50" : ""}`}
                onClick={() => setSelectedReward(reward)}
                role="button"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    {reward.StockQuantity !== null && (
                      <Badge variant="outline">{reward.StockQuantity} left</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{reward.Title}</CardTitle>
                  {reward.Description && (
                    <p className="text-sm text-muted-foreground">{reward.Description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      {reward.PointCost} points
                    </Badge>
                    <button
                      className="emp-btn-inline"
                      onClick={(e) => { e.stopPropagation(); setSelectedReward(reward); }}
                      title={!canAfford ? "Not enough points" : undefined}
                    >
                      Redeem
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Global Redeem Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={(open) => { if (!open) setSelectedReward(null); }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to redeem <strong>{selectedReward?.Title}</strong> for {""}
              <strong>{selectedReward?.PointCost} points</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              You will have {totalPoints - (selectedReward?.PointCost || 0)} points remaining.
            </p>
            {selectedReward && totalPoints < (selectedReward.PointCost || 0) && (
              <p className="text-sm text-red-600">You don't have enough points to redeem this reward.</p>
            )}
            {selectedReward && selectedReward.StockQuantity !== null && selectedReward.StockQuantity === 0 && (
              <p className="text-sm text-red-600">This reward is out of stock.</p>
            )}
          </div>
          <DialogFooter>
            <button className="emp-btn-inline" onClick={() => setSelectedReward(null)}>
              Cancel
            </button>
            <button
              className="emp-btn-inline"
              onClick={handleRedeem}
              disabled={
                loading ||
                !selectedReward ||
                totalPoints < (selectedReward?.PointCost || 0) ||
                (selectedReward?.StockQuantity !== null && selectedReward?.StockQuantity === 0)
              }
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rewards.length === 0 && (
        <Card className="emp-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No rewards available yet. Check back soon!
          </CardContent>
        </Card>
      )}

      {/* My Redemptions */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          My Redemptions
        </h3>
        {redemptions.length === 0 ? (
          <Card className="emp-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              No redemptions yet. Start redeeming rewards!
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {redemptions.map((redemption) => {
              const reward = rewards.find((r) => r.id === redemption.reward_id);
              return (
                <Card key={redemption.id} className="emp-card transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{redemption.points_spent} points</Badge>
                        {getStatusBadge(redemption.status)}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{reward?.Title || "Reward"}</CardTitle>
                    {reward?.Description && (
                      <p className="text-sm text-muted-foreground">{reward.Description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(redemption.created_at).toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        {reward?.PointCost ?? redemption.points_spent} points
                      </Badge>
                      <button className="emp-btn-inline" disabled>
                        Claimed
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
