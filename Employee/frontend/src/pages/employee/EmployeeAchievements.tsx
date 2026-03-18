import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Star, Award, Target, Zap, Crown, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AchievementNode {
  id: string;
  x: number;
  y: number;
  achievement: any;
  progress: any;
  connections: string[];
}

export default function EmployeeAchievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedNode, setSelectedNode] = useState<AchievementNode | null>(null);
  const [nodes, setNodes] = useState<AchievementNode[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();
  }, []);

  useEffect(() => {
    if (achievements.length > 0) {
      generateSkillTree();
    }
  }, [achievements, userProgress]);

  const fetchAchievements = async () => {
    // Fetch all achievements
    const { data: achievementsData, error: achError } = await supabase
      .from("achievements")
      .select("*")
      .order("points", { ascending: false });

    if (achError) {
      console.error("Error loading achievements:", achError);
      toast({ title: "Error loading achievements", variant: "destructive" });
      return;
    }

    setAchievements(achievementsData || []);

    // Fetch user progress if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserProgress([]);
      setTotalPoints(0);
      return;
    }

    const { data: progressData, error: progError } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id);

    if (progError) {
      console.error("Error loading progress:", progError);
      toast({ title: "Error loading progress", variant: "destructive" });
      return;
    }

    setUserProgress(progressData || []);

    // Calculate total points from unlocked achievements
    const points = (progressData || [])
      .filter((p: any) => p.unlocked)
      .reduce((sum: number, p: any) => {
        const ach = (achievementsData || []).find((a: any) => a.id === p.achievement_id);
        return sum + (ach?.points || 0);
      }, 0);
    setTotalPoints(points);
  };

  const getProgressForAchievement = (achievementId: string) => {
    return userProgress.find((p) => p.achievement_id === achievementId);
  };

  const getIconForCategory = (category: string) => {
    const icons: Record<string, any> = {
      learning: Star,
      performance: Trophy,
      collaboration: Award,
      innovation: Zap,
      leadership: Crown,
      milestone: Target,
    };
    return icons[category] || Trophy;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      learning: "bg-blue-500",
      performance: "bg-yellow-500",
      collaboration: "bg-green-500",
      innovation: "bg-purple-500",
      leadership: "bg-red-500",
      milestone: "bg-indigo-500",
    };
    return colors[category] || "bg-gray-500";
  };

  const isNodeVisible = (achievement: any) => {
    const progress = getProgressForAchievement(achievement.id);
    
    // Show if unlocked
    if (progress?.unlocked) return true;
    
    // Show if no prerequisite (starter achievements)
    if (!achievement.prerequisite_id) return true;
    
    // Show if prerequisite is unlocked (immediate next nodes)
    const prerequisiteProgress = userProgress.find(
      (p) => p.achievement_id === achievement.prerequisite_id
    );
    if (prerequisiteProgress?.unlocked) return true;
    
    return false;
  };

  const generateSkillTree = () => {
    // Filter visible achievements
    const visibleAchievements = achievements.filter(isNodeVisible);
    
    // Create a tree layout with nodes arranged in layers
    const centerX = 400;
    const centerY = 500;
    const layerRadius = [0, 120, 200, 280, 360];
    
    const treeNodes: AchievementNode[] = [];
    
    visibleAchievements.forEach((achievement, index) => {
      const progress = getProgressForAchievement(achievement.id);
      const layer = Math.floor(index / 6) + 1;
      const posInLayer = index % 6;
      const angleStep = (Math.PI * 2) / Math.max(6, visibleAchievements.length / layer);
      const angle = angleStep * posInLayer - Math.PI / 2;
      
      const radius = layerRadius[Math.min(layer, layerRadius.length - 1)];
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Connect to prerequisite if it exists
      const connections = achievement.prerequisite_id ? [achievement.prerequisite_id] : [];
      
      treeNodes.push({
        id: achievement.id,
        x,
        y,
        achievement,
        progress,
        connections
      });
    });
    
    setNodes(treeNodes);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Skill Tree</h2>
        <p className="text-muted-foreground">Unlock achievements as you progress</p>
      </div>

      {/* Skill Tree Visualization */}
      <Card className="emp-card">
        <CardContent className="p-0 relative overflow-auto">
          <div className="relative w-full h-[800px] bg-gradient-to-b from-muted/20 to-background">
            <svg className="absolute inset-0 w-full h-full" style={{ minWidth: '800px', minHeight: '800px' }}>
              {/* Draw connection lines */}
              {nodes.map((node) =>
                node.connections.map((targetId) => {
                  const targetNode = nodes.find((n) => n.id === targetId);
                  if (!targetNode) return null;
                  
                  const isUnlocked = node.progress?.unlocked || false;
                  
                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2"
                      strokeDasharray={isUnlocked ? "0" : "5,5"}
                      opacity={isUnlocked ? "0.6" : "0.3"}
                    />
                  );
                })
              )}
            </svg>

            {/* Render nodes */}
            {nodes.map((node) => {
              const isUnlocked = node.progress?.unlocked || false;
              const currentProgress = node.progress?.progress || 0;
              const progressPercent = (currentProgress / node.achievement.required_count) * 100;
              const Icon = getIconForCategory(node.achievement.category);

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                >
                  <div
                    className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      isUnlocked
                        ? "bg-primary border-primary shadow-lg scale-110 hover:scale-125"
                        : "bg-muted/50 border-dashed border-muted-foreground/30 hover:scale-110"
                    }`}
                  >
                    {isUnlocked ? (
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    ) : (
                      <Lock className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                  
                  {/* Progress indicator */}
                  {!isUnlocked && currentProgress > 0 && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Tooltip on hover */}
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-xs whitespace-nowrap border">
                      <div className="font-semibold">{node.achievement.title}</div>
                      <div className="text-muted-foreground">
                        {currentProgress} / {node.achievement.required_count}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Center player info */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center border-4 border-background shadow-xl">
                <Trophy className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalPoints}</div>
                <div className="text-sm text-muted-foreground font-semibold">Achievement Points</div>
              </div>
            </div>

            {/* Level indicator top right */}
            <div className="absolute top-4 right-4 bg-card border-2 border-primary/20 rounded-lg px-4 py-2 shadow-lg">
              <div className="text-xs text-muted-foreground">Unlocked</div>
              <div className="text-xl font-bold text-primary">
                {userProgress.filter(p => p.unlocked).length} / {achievements.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedNode && (
                <>
                  <div className={`p-2 rounded-lg ${getCategoryColor(selectedNode.achievement.category)}`}>
                    {(() => {
                      const Icon = getIconForCategory(selectedNode.achievement.category);
                      return <Icon className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  {selectedNode.achievement.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedNode.achievement.description}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">
                    {selectedNode.progress?.progress || 0} / {selectedNode.achievement.required_count}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${((selectedNode.progress?.progress || 0) / selectedNode.achievement.required_count) * 100}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant="outline" className="text-primary">
                  +{selectedNode.achievement.points} points
                </Badge>
                <span className="text-sm text-muted-foreground capitalize">
                  {selectedNode.achievement.category}
                </span>
              </div>

              {selectedNode.progress?.unlocked && (
                <Badge className="w-full justify-center bg-primary">
                  ✓ Unlocked!
                </Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {achievements.length === 0 && (
        <Card className="emp-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            No achievements available yet. Check back soon!
          </CardContent>
        </Card>
      )}
    </div>
  );
}
