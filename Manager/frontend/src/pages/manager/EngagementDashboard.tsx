import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, Heart, AlertTriangle, TrendingUp, ShieldAlert, Sparkles } from "lucide-react";

type InsightTab = "recommendations" | "risk" | "wins";

export default function EngagementDashboard() {
  const [tab, setTab] = useState<InsightTab>("recommendations");

  const wellness = useMemo(
    () =>
      [
        { label: "Work-Life Balance", value: 82 },
        { label: "Communication Quality", value: 88 },
        { label: "Team Cohesion", value: 75 },
        { label: "Tech Setup Satisfaction", value: 91 },
        { label: "Feeling of Inclusion", value: 68 },
      ] as Array<{ label: string; value: number }>,
    []
  );

  const activities = useMemo(
    () =>
      [
        { title: "Scheduled virtual coffee chat", who: "Sarah Chen", when: "2 hours ago" },
        { title: "Completed weekly check-in", who: "Ahmed Hassan", when: "5 hours ago" },
        { title: "Team sync completed (45 min)", who: "Team Alpha", when: "1 day ago" },
        { title: "New 1:1 scheduled", who: "Maria Gomez", when: "2 days ago" },
      ] as Array<{ title: string; who: string; when: string }>,
    []
  );

  const insights = useMemo(() => {
    const base = {
      recommendations: [
        {
          icon: <TrendingUp className="h-4 w-4 text-sky-700" />,
          title: "Schedule more team bonding activities",
          body: "Feeling of inclusion scores are lower than optimal. Consider organizing virtual social events.",
        },
        {
          icon: <Heart className="h-4 w-4 text-emerald-700" />,
          title: "Great communication trends",
          body: "Your team’s response times have improved this month. Keep the momentum.",
        },
      ],
      risk: [
        {
          icon: <ShieldAlert className="h-4 w-4 text-amber-700" />,
          title: "Check in with quieter team members",
          body: "A few team members have had limited participation in group discussions this week.",
        },
        {
          icon: <AlertTriangle className="h-4 w-4 text-red-700" />,
          title: "Watch for isolation signals",
          body: "Encourage optional lightweight touchpoints (coffee chats, async wins channel) to keep connection healthy.",
        },
      ],
      wins: [
        {
          icon: <Sparkles className="h-4 w-4 text-purple-700" />,
          title: "Strong remote setup satisfaction",
          body: "Tech setup satisfaction is trending high, which reduces friction and improves productivity.",
        },
        {
          icon: <Heart className="h-4 w-4 text-emerald-700" />,
          title: "Work-life balance improving",
          body: "Work-life balance is trending up. Continue protecting focus time and meeting boundaries.",
        },
      ],
    } as const;

    return base;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Remote Engagement</h1>
        <p className="text-muted-foreground">Monitor and improve engagement for distributed teams</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Virtual Meetings" value="23" sub="Team video calls this week" trend={"+12%"} icon={<Video className="h-5 w-5 text-sky-600" />} />
        <StatCard title="Response Time" value="2.3h" sub="Average response time" trend={"-15%"} icon={<Clock className="h-5 w-5 text-emerald-600" />} />
        <StatCard title="Connection Score" value="8.4/10" sub="Team connection rating" trend={"+0.6"} icon={<Heart className="h-5 w-5 text-purple-600" />} />
        <StatCard
          title="Isolation Risk"
          value="Low"
          sub="Team isolation indicator"
          badgeLabel="Stable"
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Remote Wellness Indicators</CardTitle>
            <div className="text-sm text-muted-foreground">Key metrics for remote team health</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {wellness.map((w) => (
              <div key={w.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{w.label}</div>
                  <div className="text-sm text-muted-foreground">{w.value}%</div>
                </div>
                <Progress value={w.value} className="h-2 bg-slate-100" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <div className="text-sm text-muted-foreground">Latest engagement activities</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.map((a, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 grid place-items-center">
                    <Video className="h-4 w-4 text-sky-700" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{a.who}</div>
                    <div className="text-xs text-muted-foreground">{a.title}</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{a.when}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Engagement Insights</CardTitle>
          <div className="text-sm text-muted-foreground">AI-powered recommendations for your distributed team</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-lg border bg-white p-1">
            <TabButton active={tab === "recommendations"} onClick={() => setTab("recommendations")}>Recommendations</TabButton>
            <TabButton active={tab === "risk"} onClick={() => setTab("risk")}>Risk Areas</TabButton>
            <TabButton active={tab === "wins"} onClick={() => setTab("wins")}>Recent Wins</TabButton>
          </div>

          <div className="space-y-3">
            {(tab === "recommendations" ? insights.recommendations : tab === "risk" ? insights.risk : insights.wins).map((i, idx) => (
              <div key={idx} className="rounded-xl border bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-slate-50 border grid place-items-center">{i.icon}</div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{i.title}</div>
                    <div className="text-xs text-muted-foreground">{i.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  trend,
  badgeLabel,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  trend?: string;
  badgeLabel?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="emp-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="flex items-center gap-2">
              {trend ? (
                <Badge variant="outline" className="text-xs">
                  {trend}
                </Badge>
              ) : badgeLabel ? (
                <Badge variant="outline" className="text-xs">
                  {badgeLabel}
                </Badge>
              ) : null}
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-50 border flex items-center justify-center">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-slate-100 text-slate-900" : "text-muted-foreground hover:bg-slate-50 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}
