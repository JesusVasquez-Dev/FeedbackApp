import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, ChevronRight } from "lucide-react";

interface KPIQuestion {
  id: string;
  question_text: string;
  week_number: number;
  quarter: string;
  year: number;
  active: boolean;
}

export default function KPICyclesTimeline() {
  const [kpiQuestions, setKpiQuestions] = useState<KPIQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    fetchKPIQuestions();
    calculateCurrentWeek();
  }, []);

  const calculateCurrentWeek = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - startOfYear.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNumber = Math.ceil(diff / oneWeek);
    
    // Calculate which week in the quarter (1-13)
    const currentQuarter = Math.floor((now.getMonth() / 3));
    const weekInQuarter = weekNumber - (currentQuarter * 13);
    setCurrentWeek(Math.max(1, Math.min(13, weekInQuarter)));
  };

  const fetchKPIQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_questions')
        .select('*')
        .order('week_number', { ascending: true });

      if (error) throw error;
      setKpiQuestions(data || []);
    } catch (error) {
      console.error('Error fetching KPI questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `Q${quarter} ${now.getFullYear()}`;
  };

  const currentKPI = kpiQuestions.find(q => q.week_number === currentWeek);
  const nextKPI = kpiQuestions.find(q => q.week_number === currentWeek + 1);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading KPI timeline...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quarter Timeline */}
      <Card className="emp-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Quarter Timeline
              </CardTitle>
              <CardDescription>Current quarter: {getCurrentQuarter()}</CardDescription>
            </div>
            <Badge variant="outline" className="text-base px-4 py-2">
              Week {currentWeek} of 13
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline bar */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 13 }, (_, i) => i + 1).map((week) => {
                const hasKPI = kpiQuestions.some(q => q.week_number === week);
                const isCurrent = week === currentWeek;
                const isPast = week < currentWeek;
                
                return (
                  <div
                    key={week}
                    className="flex-1 group relative"
                  >
                    <div
                      className={`h-12 rounded transition-all ${
                        isCurrent
                          ? 'bg-primary ring-2 ring-primary ring-offset-2'
                          : isPast
                          ? 'bg-primary/40'
                          : hasKPI
                          ? 'bg-muted-foreground/20'
                          : 'bg-muted'
                      }`}
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground">
                      {week}
                    </div>
                    {hasKPI && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary-foreground' : 'bg-foreground'}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Current Week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/40" />
              <span>Past Weeks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted-foreground/20" />
              <span>Scheduled KPI</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current and Next KPI */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current KPI */}
        <Card className="emp-card border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="default">Current Week</Badge>
              <Badge variant="outline">Week {currentWeek}</Badge>
            </div>
            <CardTitle>Current KPI Question</CardTitle>
            <CardDescription>Active question for this week</CardDescription>
          </CardHeader>
          <CardContent>
            {currentKPI ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium">{currentKPI.question_text}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={currentKPI.active ? "default" : "secondary"}>
                    {currentKPI.active ? "Active" : "Inactive"}
                  </Badge>
                  <span>•</span>
                  <span>{currentKPI.quarter} {currentKPI.year}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No KPI question set for the current week</p>
                <p className="text-sm mt-2">Configure a question for week {currentWeek}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next KPI */}
        <Card className="emp-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Next Week</Badge>
              <Badge variant="outline">Week {currentWeek + 1}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
            <CardTitle>Upcoming KPI Question</CardTitle>
            <CardDescription>Scheduled for next week</CardDescription>
          </CardHeader>
          <CardContent>
            {nextKPI ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-lg font-medium">{nextKPI.question_text}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant={nextKPI.active ? "default" : "secondary"}>
                    {nextKPI.active ? "Active" : "Inactive"}
                  </Badge>
                  <span>•</span>
                  <span>{nextKPI.quarter} {nextKPI.year}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No KPI question scheduled for next week</p>
                <p className="text-sm mt-2">Configure a question for week {currentWeek + 1}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
