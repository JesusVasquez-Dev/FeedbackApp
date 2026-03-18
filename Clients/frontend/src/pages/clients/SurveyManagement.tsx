import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";

interface Survey {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  created_at: string;
}

interface KPIQuestion {
  id: string;
  question_text: string;
  question_type: string;
  week_number: number;
  quarter: string;
  year: number;
  active: boolean;
}

export default function SurveyManagement() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [kpiQuestions, setKpiQuestions] = useState<KPIQuestion[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isEditKPIDialogOpen, setIsEditKPIDialogOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPIQuestion | null>(null);
  const [editedQuestion, setEditedQuestion] = useState("");
  const [newSurvey, setNewSurvey] = useState<{
    title: string;
    description: string;
    status: 'draft' | 'active' | 'closed';
  }>({
    title: "",
    description: "",
    status: "draft",
  });
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  const surveyTemplates = [
    {
      title: "Project Retrospective Survey",
      description: "Gather feedback on recently completed projects to improve future workflows",
    },
    {
      title: "Employee Satisfaction Survey",
      description: "Measure employee satisfaction and identify areas for workplace improvement",
    },
    {
      title: "Onboarding Experience Survey",
      description: "Collect feedback from new employees about their onboarding experience",
    },
    {
      title: "Team Collaboration Survey",
      description: "Assess how well teams are working together and identify collaboration challenges",
    },
    {
      title: "Remote Work Experience Survey",
      description: "Understand employee experiences with remote work and hybrid arrangements",
    },
  ];

  useEffect(() => {
    fetchSurveys();
    fetchKPIQuestions();
    fetchCurrentWeek();
  }, []);

  const fetchSurveys = async () => {
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSurveys(data as Survey[]);
    }
  };

  const fetchKPIQuestions = async () => {
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from('kpi_questions')
      .select('*')
      .order('week_number', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching KPI questions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch KPI questions",
        variant: "destructive",
      });
      return;
    }

    setKpiQuestions(data as KPIQuestion[]);
  };

  const fetchCurrentWeek = async () => {
    const { data, error } = await supabase.rpc('get_current_quarter_week');
    if (!error && data) {
      setCurrentWeek(data as number);
    }
  };

  const initializeKPIQuestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user for initialization");
      return;
    }

    console.log("Initializing KPI questions with:", { user: user.id, year: currentYear, quarter: currentQuarter });

    const { data, error } = await supabase.rpc('initialize_default_kpi_questions', {
      _company_id: user.id,
      _year: currentYear,
      _quarter: currentQuarter,
    });

    if (error) {
      console.error("Error initializing KPI questions:", error);
      toast({
        title: "Error",
        description: `Failed to initialize KPI questions: ${error.message}`,
        variant: "destructive",
      });
    } else {
      console.log("KPI questions initialized successfully", data);
      toast({
        title: "Success",
        description: "KPI questions initialized for this quarter",
      });
      // Refresh the questions
      await fetchKPIQuestions();
    }
  };

  const handleCreateSurvey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .schema(SCHEMA)
      .from('surveys')
      .insert([{
        ...newSurvey,
        company_id: user.id,
        created_by: user.id,
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create survey",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Survey created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewSurvey({ title: "", description: "", status: "draft" });
      fetchSurveys();
    }
  };

  const handleCreateFromTemplate = (template: typeof surveyTemplates[0]) => {
    setNewSurvey({
      title: template.title,
      description: template.description,
      status: "draft",
    });
    setIsTemplateDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteSurvey = async (id: string) => {
    const { error } = await supabase
      .schema(SCHEMA)
      .from('surveys')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete survey",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Survey deleted successfully",
      });
      fetchSurveys();
    }
  };

  const handleEditKPI = (kpi: KPIQuestion) => {
    setSelectedKPI(kpi);
    setEditedQuestion(kpi.question_text);
    setIsEditKPIDialogOpen(true);
  };

  const handleUpdateKPI = async () => {
    if (!selectedKPI) return;

    const { error } = await supabase
      .schema(SCHEMA)
      .from('kpi_questions')
      .update({ question_text: editedQuestion })
      .eq('id', selectedKPI.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update KPI question",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "KPI question updated successfully",
      });
      setIsEditKPIDialogOpen(false);
      fetchKPIQuestions();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'closed': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Survey Management</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage employee surveys and KPI questions
        </p>
      </div>

      <Tabs defaultValue="surveys" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="surveys">Custom Surveys</TabsTrigger>
          <TabsTrigger value="kpi">KPI Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="surveys" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Create from Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Choose a Survey Template</DialogTitle>
                  <DialogDescription>
                    Select a template to get started quickly with pre-configured survey content
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  {surveyTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto justify-start text-left p-4"
                      onClick={() => handleCreateFromTemplate(template)}
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">{template.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Survey
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Survey</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new survey
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newSurvey.title}
                      onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                      placeholder="Employee Satisfaction Survey"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newSurvey.description}
                      onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                      placeholder="Help us understand your experience..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newSurvey.status}
                      onValueChange={(value) => 
                        setNewSurvey({ ...newSurvey, status: value as 'draft' | 'active' | 'closed' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateSurvey} className="w-full">
                    Create Survey
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle>{survey.title}</CardTitle>
                      <CardDescription>{survey.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(survey.status)}>
                        {survey.status}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteSurvey(survey.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(survey.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="kpi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quarterly KPI Questions - {currentQuarter} {currentYear}</CardTitle>
              <CardDescription>
                Manage the 13 weekly KPI questions for this quarter. Week {currentWeek} is the current week.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {kpiQuestions.map((kpi) => (
                  <Card 
                    key={kpi.id}
                    className={kpi.week_number === currentWeek ? "border-primary bg-primary/5" : ""}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground">Week</span>
                            <span className="text-sm font-bold">
                              {kpi.week_number ?? "-"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{kpi.question_text}</p>
                          {kpi.week_number === currentWeek && (
                            <Badge variant="default" className="mt-2">
                              <Target className="mr-1 h-3 w-3" />
                              Current Week
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditKPI(kpi)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditKPIDialogOpen} onOpenChange={setIsEditKPIDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit KPI Question - Week {selectedKPI?.week_number}</DialogTitle>
            <DialogDescription>
              Customize the KPI question for this week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kpi-question">Question Text</Label>
              <Textarea
                id="kpi-question"
                value={editedQuestion}
                onChange={(e) => setEditedQuestion(e.target.value)}
                placeholder="Enter KPI question..."
                rows={3}
              />
            </div>
            <Button onClick={handleUpdateKPI} className="w-full">
              Update Question
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}