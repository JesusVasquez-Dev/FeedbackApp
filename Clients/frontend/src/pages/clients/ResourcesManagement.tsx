import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Download, Search, Bot, CheckCircle, AlertCircle, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getProfile } from "@/modules/api/me";

interface Resource {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;

  bucket_name: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
  expires_at: string;
  uploaded_by: string;
}

export default function ResourcesManagement() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canManageResources, setCanManageResources] = useState(true);
  const [aiDocQAEnabled, setAiDocQAEnabled] = useState(false);
  const [aiTutorEnabled, setAiTutorEnabled] = useState(false);
  const [aiCultureEnabled, setAiCultureEnabled] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'doc-qa' | 'tutor' | 'culture'>('doc-qa');
  const [exampleQA, setExampleQA] = useState<{ question: string; answer: string }[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("Documentation");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || "feedbackApp";
  const BUCKET_NAME = "FeedBack App Resources";

  const categories = ["Documentation", "SOP", "Training", "Policy", "Guide", "Other"];
  const MIN_DOCS_REQUIRED = 3;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { profile } = await getProfile(user.id, user.email || undefined);
        const rawCompanyId =
          (profile as any)?.companyID ??
          (profile as any)?.CompanyID ??
          (profile as any)?.company_id ??
          (profile as any)?.companyId;

        const resolvedCompanyId = rawCompanyId == null ? null : Number(rawCompanyId);
        if (mounted) setCompanyId(Number.isFinite(resolvedCompanyId as any) ? (resolvedCompanyId as number) : null);

        // Company portal is an admin workspace; rely on RLS for enforcement.
        if (mounted) setCanManageResources(true);
      } catch (e) {
        if (mounted) {
          setCompanyId(null);
          setCanManageResources(true);
        }
      } finally {
        if (mounted) {
          fetchResources();
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResources = async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .schema(SCHEMA)
      .from("client_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message || "Failed to fetch resources");
      toast({
        title: "Error",
        description: error.message || "Failed to fetch resources",
        variant: "destructive",
      });
    } else {
      setResources(data || []);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({ title: "Error", description: "Missing company id for this account.", variant: "destructive" });
      return;
    }

    if (!uploadDescription.trim()) {
      toast({
        title: "Error",
        description: "Please provide a description for the file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const effectiveCompanyId = companyId;

      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const uniqueName = `${Date.now()}-${safeName}`;
      const filePath = `company/${effectiveCompanyId}/${uploadCategory}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .schema(SCHEMA)
        .from("client_resources")
        .insert({
          company_id: effectiveCompanyId,
          title: uploadTitle.trim() || null,
          description: uploadDescription.trim(),
          category: uploadCategory,

          bucket_name: BUCKET_NAME,
          storage_path: filePath,
          file_name: selectedFile.name,
          mime_type: selectedFile.type || null,
          size_bytes: selectedFile.size,

          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      fetchResources();
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadDescription("");
      setUploadTitle("");
      setUploadCategory("Documentation");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([resource.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .schema(SCHEMA)
        .from("client_resources")
        .delete()
        .eq("id", resource.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Resource deleted successfully",
      });

      fetchResources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete resource",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      const { data: pub } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(resource.storage_path);

      const url = pub?.publicUrl;

      if (!url) {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(resource.storage_path, 60);
        if (error) throw error;
        const a2 = document.createElement("a");
        a2.href = data.signedUrl;
        a2.download = resource.file_name;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = resource.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (resource: Resource, category: string) => {
    try {
      if ((resource.category || "Other") === category) return;

      // Move object inside the bucket so folder structure matches category
      // Expected path: company/<companyId>/<Category>/<file>
      const parts = String(resource.storage_path || "").split("/").filter(Boolean);
      if (parts.length >= 4 && parts[0] === "company") {
        const newPath = [parts[0], parts[1], category, ...parts.slice(3)].join("/");
        if (newPath !== resource.storage_path) {
          const { error: moveError } = await supabase.storage
            .from(BUCKET_NAME)
            .move(resource.storage_path, newPath);
          if (moveError) throw moveError;

          const { error } = await supabase
            .schema(SCHEMA)
            .from("client_resources")
            .update({ category, storage_path: newPath })
            .eq("id", resource.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .schema(SCHEMA)
            .from("client_resources")
            .update({ category })
            .eq("id", resource.id);

          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .schema(SCHEMA)
          .from("client_resources")
          .update({ category })
          .eq("id", resource.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Category updated",
      });

      fetchResources();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const filteredResources = resources.filter((resource) => {
    const q = searchQuery.trim().toLowerCase();
    const title = (resource.title || "").toLowerCase();
    const file = (resource.file_name || "").toLowerCase();
    const desc = (resource.description || "").toLowerCase();
    const matchesSearch = !q || title.includes(q) || file.includes(q) || desc.includes(q);
    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getDocumentationResources = () => {
    return resources.filter(r => 
      r.category === "Documentation" || 
      r.category === "SOP" || 
      r.category === "Policy"
    );
  };

  const getTrainingResources = () => {
    return resources.filter(r => r.category === "Training");
  };

  const getCultureResources = () => {
    return resources.filter(r => 
      r.category === "Policy" || 
      r.category === "Guide"
    );
  };

  const hasEnoughDocumentation = () => {
    return getDocumentationResources().length >= MIN_DOCS_REQUIRED;
  };

  const hasEnoughTraining = () => {
    return getTrainingResources().length >= MIN_DOCS_REQUIRED;
  };

  const hasEnoughCulture = () => {
    return getCultureResources().length >= MIN_DOCS_REQUIRED;
  };

  const generateExampleQA = (type: 'doc-qa' | 'tutor' | 'culture') => {
    if (type === 'doc-qa') {
      const docs = getDocumentationResources();
      return [
        {
          question: "What is our company's remote work policy?",
          answer: `Based on ${docs.length} documentation files, I can help answer questions about company policies, procedures, and guidelines.`
        },
        {
          question: "How do I submit a vacation request?",
          answer: "I can guide you through the process using our documented procedures."
        },
        {
          question: "What are the steps for onboarding new employees?",
          answer: "I have access to SOPs and training materials to provide detailed onboarding information."
        }
      ];
    } else if (type === 'tutor') {
      const training = getTrainingResources();
      return [
        {
          question: "Quiz me on the sales process module",
          answer: `Based on ${training.length} training materials, I can create interactive quizzes and provide feedback on your answers.`
        },
        {
          question: "Give me a quick refresher on data security best practices",
          answer: "I can provide micro-learning summaries and check your understanding with follow-up questions."
        },
        {
          question: "Test my knowledge on customer service protocols",
          answer: "I'll generate quiz questions and give you instant feedback based on our training materials."
        }
      ];
    } else {
      const culture = getCultureResources();
      return [
        {
          question: "What are our company's core values?",
          answer: `Based on ${culture.length} policy and guide files, I can explain our mission, values, and cultural principles.`
        },
        {
          question: "Tell me about our diversity and inclusion initiatives",
          answer: "I can summarize our DEI commitments and how they're reflected in our daily operations."
        },
        {
          question: "What makes our company culture unique?",
          answer: "I'll explain our company principles, work environment, and what we stand for as an organization."
        }
      ];
    }
  };

  const handleToggleDocQA = (checked: boolean) => {
    if (checked) {
      if (!hasEnoughDocumentation()) {
        toast({
          title: "Insufficient Documentation",
          description: `Please upload at least ${MIN_DOCS_REQUIRED} documentation files (Documentation, SOP, or Policy categories) to enable AI Q&A.`,
          variant: "destructive",
        });
        return;
      }
      setConfirmDialogType('doc-qa');
      setExampleQA(generateExampleQA('doc-qa'));
      setShowConfirmDialog(true);
    } else {
      setAiDocQAEnabled(false);
      toast({
        title: "AI Documentation Q&A Disabled",
        description: "The AI assistant will no longer answer questions based on company documentation.",
      });
    }
  };

  const handleToggleTutor = (checked: boolean) => {
    if (checked) {
      if (!hasEnoughTraining()) {
        toast({
          title: "Insufficient Training Materials",
          description: `Please upload at least ${MIN_DOCS_REQUIRED} training files (Training category) to enable AI Tutor Mode.`,
          variant: "destructive",
        });
        return;
      }
      setConfirmDialogType('tutor');
      setExampleQA(generateExampleQA('tutor'));
      setShowConfirmDialog(true);
    } else {
      setAiTutorEnabled(false);
      toast({
        title: "AI Training Tutor Disabled",
        description: "The AI assistant will no longer provide training quizzes and feedback.",
      });
    }
  };

  const handleToggleCulture = (checked: boolean) => {
    if (checked) {
      if (!hasEnoughCulture()) {
        toast({
          title: "Insufficient Culture Documentation",
          description: `Please upload at least ${MIN_DOCS_REQUIRED} files (Policy or Guide categories) to enable AI Culture explanations.`,
          variant: "destructive",
        });
        return;
      }
      setConfirmDialogType('culture');
      setExampleQA(generateExampleQA('culture'));
      setShowConfirmDialog(true);
    } else {
      setAiCultureEnabled(false);
      toast({
        title: "AI Culture Guide Disabled",
        description: "The AI assistant will no longer explain company culture and values.",
      });
    }
  };

  const confirmEnableAI = () => {
    if (confirmDialogType === 'doc-qa') {
      setAiDocQAEnabled(true);
      toast({
        title: "AI Documentation Q&A Enabled",
        description: "The AI assistant can now answer questions based on your company documentation.",
      });
    } else if (confirmDialogType === 'tutor') {
      setAiTutorEnabled(true);
      toast({
        title: "AI Training Tutor Enabled",
        description: "The AI assistant can now provide interactive training quizzes and feedback.",
      });
    } else {
      setAiCultureEnabled(true);
      toast({
        title: "AI Culture Guide Enabled",
        description: "The AI assistant can now explain company culture, values, and mission.",
      });
    }
    setShowConfirmDialog(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Resources & Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload company documents, SOPs, and training materials for AI-powered employee assistance
        </p>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="emp-card">
          <CardHeader>
            <CardTitle>Upload New Resource</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button
                  className="emp-btn w-full h-12 justify-center gap-2 rounded-lg"
                  disabled={!canManageResources}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload New File</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Upload Resource</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Select a category, upload your file, and provide a description.
                  </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Employee Handbook"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select className="w-full" value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Documentation">Documentation</SelectItem>
                        <SelectItem value="SOP">SOP</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Policy">Policy</SelectItem>
                        <SelectItem value="Guide">Guide</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>File *</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Input
                        id="file-input"
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      {selectedFile ? (
                        <div className="space-y-2">
                          <FileText className="h-12 w-12 mx-auto text-primary" />
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <Label
                              htmlFor="file-input"
                              className="text-primary hover:underline cursor-pointer"
                            >
                              Click to upload
                            </Label>
                            <span className="text-sm text-muted-foreground"> or drag and drop</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Supports all document types (PDF, DOCX, TXT, etc.)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide a brief description of this resource..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUploadDialog(false);
                      setSelectedFile(null);
                      setUploadDescription("");
                      setUploadTitle("");
                      setUploadCategory("Documentation");
                    }}
                    className="emp-btn-inline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleFileUpload} disabled={isUploading} className="emp-btn">
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="emp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Abilities & Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Documentation Q&A */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="doc-qa" className="text-base font-medium">
                      Answer Questions on Company Documentation
                    </Label>
                    <input
                      id="doc-qa"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={aiDocQAEnabled}
                      onChange={(e) => handleToggleDocQA(e.target.checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable AI to answer employee questions based on uploaded documentation
                  </p>
                </div>
              </div>

              {hasEnoughDocumentation() ? (
                <div className="flex items-start gap-2 p-3 rounded-md border bg-green-50 border-green-300">
                  <CheckCircle className="h-5 w-5 text-green-700 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">
                      Ready to enable
                    </p>
                    <p className="text-xs text-green-800 mt-1">
                      {getDocumentationResources().length} documentation files available
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-sky-600 rounded-md border border-sky-700">
                  <AlertCircle className="h-5 w-5 text-white mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      More data needed
                    </p>
                    <p className="text-xs text-sky-50 mt-1">
                      Upload at least {MIN_DOCS_REQUIRED} files in Documentation, SOP, or Policy categories ({getDocumentationResources().length}/{MIN_DOCS_REQUIRED} uploaded)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tutor Mode */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tutor" className="text-base font-medium">
                      Training Tutor Mode
                    </Label>
                    <input
                      id="tutor"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={aiTutorEnabled}
                      onChange={(e) => handleToggleTutor(e.target.checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI answers quiz-style questions and gives micro-learning feedback on training materials
                  </p>
                </div>
              </div>

              {hasEnoughTraining() ? (
                <div className="flex items-start gap-2 p-3 rounded-md border bg-green-50 border-green-300">
                  <CheckCircle className="h-5 w-5 text-green-700 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">
                      Ready to enable
                    </p>
                    <p className="text-xs text-green-800 mt-1">
                      {getTrainingResources().length} training files available
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-sky-600 rounded-md border border-sky-700">
                  <AlertCircle className="h-5 w-5 text-white mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      More data needed
                    </p>
                    <p className="text-xs text-sky-50 mt-1">
                      Upload at least {MIN_DOCS_REQUIRED} files in Training category ({getTrainingResources().length}/{MIN_DOCS_REQUIRED} uploaded)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Culture Guide */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="culture" className="text-base font-medium">
                      Explain Company Culture & Values
                    </Label>
                    <input
                      id="culture"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={aiCultureEnabled}
                      onChange={(e) => handleToggleCulture(e.target.checked)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Summarize company principles, diversity, and mission statements for onboarding
                  </p>
                </div>
              </div>

              {hasEnoughCulture() ? (
                <div className="flex items-start gap-2 p-3 rounded-md border bg-green-50 border-green-300">
                  <CheckCircle className="h-5 w-5 text-green-700 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">
                      Ready to enable
                    </p>
                    <p className="text-xs text-green-800 mt-1">
                      {getCultureResources().length} policy/guide files available
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-sky-600 rounded-md border border-sky-700">
                  <AlertCircle className="h-5 w-5 text-white mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      More data needed
                    </p>
                    <p className="text-xs text-sky-50 mt-1">
                      Upload at least {MIN_DOCS_REQUIRED} files in Policy or Guide categories ({getCultureResources().length}/{MIN_DOCS_REQUIRED} uploaded)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-44 h-10 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="emp-card hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" title={resource.file_name}>
                      {resource.title?.trim() ? resource.title : resource.file_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(resource.size_bytes)}
                    </p>
                  </div>
                </div>
              </div>

              <Select
                value={resource.category || "Other"}
                onValueChange={(value) => handleUpdateCategory(resource, value)}
              >
                <SelectTrigger
                  className={`w-full mb-3 ${!canManageResources ? "opacity-60 pointer-events-none" : ""}`}
                  aria-disabled={!canManageResources}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(resource)}
                  className="emp-btn-inline flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                {canManageResources && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(resource)}
                    className="emp-btn-inline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Uploaded {new Date(resource.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <Card className="emp-card">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all"
                ? "No resources match your search"
                : "No resources uploaded yet. Upload your first document to get started."}
            </p>
          </CardContent>
        </Card>
      )}

      {showConfirmDialog && (
        <Card className="emp-card border-dashed border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>
              {confirmDialogType === 'doc-qa' && 'Enable AI Documentation Q&A'}
              {confirmDialogType === 'tutor' && 'Enable AI Training Tutor Mode'}
              {confirmDialogType === 'culture' && 'Enable AI Culture & Values Guide'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {exampleQA.map((qa, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2 bg-background">
                  <div className="flex items-start gap-2">
                    <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-2">{qa.question}</p>
                      <p className="text-sm text-muted-foreground">{qa.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmEnableAI}>
                {confirmDialogType === 'doc-qa' && 'Enable AI Q&A'}
                {confirmDialogType === 'tutor' && 'Enable Tutor Mode'}
                {confirmDialogType === 'culture' && 'Enable Culture Guide'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
