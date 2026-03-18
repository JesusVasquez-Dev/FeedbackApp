import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Video, MessageSquare, Coffee, AlertTriangle, TrendingUp, Heart } from "lucide-react";

export default function RemoteEngagement() {
  const engagementMetrics = [
    {
      title: "Virtual Meetings",
      value: "23",
      change: "+12%",
      trend: "up",
      icon: Video,
      description: "Team video calls this week"
    },
    {
      title: "Response Time",
      value: "2.3h",
      change: "-15%",
      trend: "up",
      icon: MessageSquare,
      description: "Average response time"
    },
    {
      title: "Connection Score",
      value: "8.4/10",
      change: "+0.6",
      trend: "up",
      icon: Heart,
      description: "Team connection rating"
    },
    {
      title: "Isolation Risk",
      value: "Low",
      change: "Stable",
      trend: "neutral",
      icon: AlertTriangle,
      description: "Team isolation indicator"
    }
  ];

  const remoteWellness = [
    { name: "Work-Life Balance", score: 82, status: "good" },
    { name: "Communication Quality", score: 88, status: "excellent" },
    { name: "Team Cohesion", score: 75, status: "good" },
    { name: "Tech Setup Satisfaction", score: 91, status: "excellent" },
    { name: "Feeling of Inclusion", score: 68, status: "needs-attention" }
  ];

  const recentActivities = [
    {
      id: "1",
      type: "virtual-coffee",
      member: "Sarah Chen",
      action: "Scheduled virtual coffee chat",
      time: "2 hours ago",
      icon: Coffee
    },
    {
      id: "2",
      type: "check-in",
      member: "Ahmed Hassan",
      action: "Completed weekly check-in",
      time: "5 hours ago",
      icon: MessageSquare
    },
    {
      id: "3",
      type: "meeting",
      member: "Team Alpha",
      action: "Team sync completed (45 min)",
      time: "1 day ago",
      icon: Video
    }
  ];

  const getScoreColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "needs-attention":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "needs-attention":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Remote Engagement</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and improve engagement for distributed teams
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {engagementMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="emp-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {metric.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metric.value}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={metric.trend === "up" ? "default" : "secondary"} className="text-xs">
                    {metric.change}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Remote Wellness Indicators</CardTitle>
            <CardDescription>Key metrics for remote team health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {remoteWellness.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className={`text-sm font-semibold ${getScoreColor(item.status)}`}>
                    {item.score}%
                  </span>
                </div>
                <Progress value={item.score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest engagement activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.member}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Engagement Insights</CardTitle>
          <CardDescription>AI-powered recommendations for your distributed team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recommendations */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recommendations
            </h3>
            <div className="flex gap-3 p-4 border rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Schedule more team bonding activities</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Feeling of inclusion scores are lower than optimal. Consider organizing virtual social events.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4 border rounded-lg">
              <Heart className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Great communication trends</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your team's response times have improved by 15%. Keep up the good work!
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4 border rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Check in with quiet team members</p>
                <p className="text-sm text-muted-foreground mt-1">
                  3 team members haven't participated in group discussions this week.
                </p>
              </div>
            </div>
          </section>

          {/* Risk Areas */}
          <section className="border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Risk Areas
            </h3>
            <div className="text-sm text-muted-foreground">
              Risk analysis and areas requiring attention.
            </div>
          </section>

          {/* Recent Wins */}
          <section className="border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recent Wins
            </h3>
            <div className="text-sm text-muted-foreground">
              Recent positive achievements and milestones.
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
