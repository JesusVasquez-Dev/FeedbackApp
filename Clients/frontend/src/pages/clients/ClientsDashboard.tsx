import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, AlertCircle, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";
const ENABLE_LEGACY_SURVEY_WIDGETS = false;

interface RecentResponse {
  id: string;
  survey_title: string;
  user_name: string;
  response_value: number;
  submitted_at: string;
}

interface EmployeePerformance {
  user_id: string;
  user_name: string;
  avg_score: number;
  response_count: number;
}

interface ClientsDashboardProps {
  onNavigate?: (page: string) => void;
}

export default function ClientsDashboard({ onNavigate }: ClientsDashboardProps) {
  const [recentResponses, setRecentResponses] = useState<RecentResponse[]>([]);
  const [topPerformers, setTopPerformers] = useState<EmployeePerformance[]>([]);
  const [needsAttention, setNeedsAttention] = useState<EmployeePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!ENABLE_LEGACY_SURVEY_WIDGETS) {
        setRecentResponses([]);
        setTopPerformers([]);
        setNeedsAttention([]);
        return;
      }
      // Fetch recent survey responses
      const { data: responses } = await supabase
        .schema(SCHEMA)
        .from('survey_responses')
        .select(`
          id,
          survey_id,
          response_value,
          submitted_at,
          user_id,
          profiles (first_name, last_name)
        `)
        .order('submitted_at', { ascending: false })
        .limit(5);

      const surveyTitleById = new Map<string, string>();
      if (responses && responses.length) {
        const surveyIds = Array.from(new Set((responses as any[]).map((r) => r.survey_id).filter(Boolean)));
        if (surveyIds.length) {
          const sres = await supabase
            .schema(SCHEMA)
            .from('surveys')
            .select('id, title')
            .in('id', surveyIds);
          if (!sres.error && sres.data) {
            (sres.data as any[]).forEach((s) => {
              if (s?.id) surveyTitleById.set(String(s.id), String(s.title || 'Unknown Survey'));
            });
          }
        }
      }

      if (responses) {
        setRecentResponses(responses.map((r: any) => ({
          id: r.id,
          survey_title: surveyTitleById.get(String(r.survey_id)) || 'Unknown Survey',
          user_name: `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim() || 'Unknown User',
          response_value: r.response_value || 0,
          submitted_at: r.submitted_at
        })));
      }

      // Fetch employee performance data
      const { data: performanceData } = await supabase
        .schema(SCHEMA)
        .from('survey_responses')
        .select(`
          user_id,
          response_value,
          profiles (first_name, last_name)
        `);

      if (performanceData) {
        // Calculate average scores per employee
        const performanceMap = new Map<string, { scores: number[], name: string }>();
        
        performanceData.forEach((item: any) => {
          if (!performanceMap.has(item.user_id)) {
            performanceMap.set(item.user_id, {
              scores: [],
              name: `${item.profiles?.first_name || ''} ${item.profiles?.last_name || ''}`.trim() || 'Unknown User'
            });
          }
          if (item.response_value) {
            performanceMap.get(item.user_id)!.scores.push(item.response_value);
          }
        });

        const performance: EmployeePerformance[] = Array.from(performanceMap.entries()).map(([userId, data]) => ({
          user_id: userId,
          user_name: data.name,
          avg_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
          response_count: data.scores.length
        }));

        // Top performers (score >= 4)
        setTopPerformers(
          performance
            .filter(p => p.avg_score >= 4)
            .sort((a, b) => b.avg_score - a.avg_score)
            .slice(0, 5)
        );

        // Needs attention (score < 3)
        setNeedsAttention(
          performance
            .filter(p => p.avg_score < 3)
            .sort((a, b) => a.avg_score - b.avg_score)
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const quarterMilestones = [
    { date: "Jan 1", title: "Q1 Kickoff", completed: true },
    { date: "Jan 15", title: "Employee Survey Wave 1", completed: true },
    { date: "Feb 1", title: "Mid-Quarter Review", completed: true },
    { date: "Feb 15", title: "Survey Wave 2", completed: false },
    { date: "Mar 1", title: "Performance Check-ins", completed: false },
    { date: "Mar 31", title: "Q1 Wrap-up", completed: false },
  ];

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clients Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of employee engagement and performance
        </p>
      </div>

      {/* Pending KPI Surveys Alert */}
      <Card className="emp-card border-orange-500/20 bg-orange-500/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Pending KPI Surveys
              </CardTitle>
              <CardDescription className="mt-2">
                Complete this week's employee performance pulse
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
              90 seconds
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>6 employees</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Due: This week</span>
              </div>
            </div>
            <Button onClick={() => onNavigate?.("kpi-surveys")} className="emp-btn-inline">
              Start KPI Survey
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Survey Responses */}
      <Card className="emp-card">
        <CardHeader>
          <CardTitle>Recent Survey Responses</CardTitle>
          <CardDescription>Latest feedback from employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent responses</p>
            ) : (
              recentResponses.map((response) => (
                <div key={response.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                      {getInitials(response.user_name)}
                    </div>
                    <div>
                      <p className="font-medium">{response.user_name}</p>
                      <p className="text-sm text-muted-foreground">{response.survey_title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${getScoreColor(response.response_value)}`}>
                      {response.response_value}/5
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(response.submitted_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="emp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Performers
            </CardTitle>
            <CardDescription>Employees with high engagement scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available</p>
              ) : (
                topPerformers.map((employee, index) => (
                  <div key={employee.user_id} className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center rounded-full">
                      {index + 1}
                    </Badge>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                      {getInitials(employee.user_name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{employee.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.response_count} responses
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {employee.avg_score.toFixed(1)}
                      </p>
                      <Progress value={employee.avg_score * 20} className="w-16 h-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="emp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Needs Attention
            </CardTitle>
            <CardDescription>Employees with lower engagement scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {needsAttention.length === 0 ? (
                <p className="text-sm text-muted-foreground">All employees are engaged!</p>
              ) : (
                needsAttention.map((employee) => (
                  <div key={employee.user_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                      {getInitials(employee.user_name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{employee.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.response_count} responses
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {employee.avg_score.toFixed(1)}
                      </p>
                      <Progress value={employee.avg_score * 20} className="w-16 h-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Q1 Timeline */}
      <Card className="emp-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Q1 2025 Timeline
          </CardTitle>
          <CardDescription>Key milestones and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {quarterMilestones.map((milestone, index) => (
                <div key={index} className="relative flex items-start gap-4 pl-8">
                  <div
                    className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                      milestone.completed
                        ? "bg-primary border-primary"
                        : "bg-background border-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${milestone.completed ? "" : "text-muted-foreground"}`}>
                        {milestone.title}
                      </p>
                      {milestone.completed && (
                        <Badge variant="secondary" className="ml-2">
                          Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{milestone.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
