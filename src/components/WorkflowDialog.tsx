import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateWorkflow,
  useCreateWorkflowVersion,
  useDuplicateWorkflowVersion,
  usePublishWorkflowVersion,
  useRevertWorkflowVersion,
  useUpdateWorkflowVersion,
  useWorkflowList,
  fetchWorkflowDiff,
} from "@/hooks/use-workflows";
import { Workflow, WorkflowDefinition, WorkflowVersion, WorkflowDiff } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";
import { WorkflowShareDialog } from "./WorkflowShareDialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Diff,
  Plus,
  Save,
  Share2,
  Undo2,
  Copy,
} from "lucide-react";
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  agentId?: string;
  userId: string;
  workspaceId: string;
}

type WorkflowConfig = Record<string, unknown>;

interface WorkflowStep {

  id: string;
  type: WorkflowStepType;
  name: string;
  config: WorkflowConfig;

}

interface CreateWorkflowForm {
  name: string;
  description: string;
  trigger: string;
  author: string;
  changeSummary: string;
}

const defaultCreateForm: CreateWorkflowForm = {
  name: "",
  description: "",
  trigger: "manual",
  author: "",
  changeSummary: "Initial draft",
};

const cloneDefinition = (definition: WorkflowDefinition): WorkflowDefinition =>
  JSON.parse(JSON.stringify(definition));

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "∅";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const getPreviousVersion = (workflow: Workflow | undefined, versionId: string | undefined) => {
  if (!workflow || !versionId) return null;
  const ordered = [...workflow.versions].sort((a, b) => a.number - b.number);
  const index = ordered.findIndex((version) => version.id === versionId);
  if (index <= 0) return null;
  return ordered[index - 1];
};

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({ open, onClose }) => {
  const { toast } = useToast();
  const { data: workflows = [], isLoading } = useWorkflowList(open);
  const createWorkflowMutation = useCreateWorkflow();
  const createVersionMutation = useCreateWorkflowVersion();
  const updateVersionMutation = useUpdateWorkflowVersion();
  const duplicateVersionMutation = useDuplicateWorkflowVersion();
  const revertVersionMutation = useRevertWorkflowVersion();
  const publishVersionMutation = usePublishWorkflowVersion();

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [editorDefinition, setEditorDefinition] = useState<WorkflowDefinition | null>(null);
  const [author, setAuthor] = useState<string>("");
  const [changeSummary, setChangeSummary] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateWorkflowForm>(defaultCreateForm);
  const [shareOpen, setShareOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState<WorkflowVersion | null>(null);
  const [diffPrevious, setDiffPrevious] = useState<WorkflowVersion | null>(null);
  const [diffResult, setDiffResult] = useState<WorkflowDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  useEffect(() => {
    if (open && workflows.length > 0) {
      const first = workflows[0];
      setSelectedWorkflowId((current) => current || first.id);
    }
    if (!open) {
      setDiffVersion(null);
      setDiffResult(null);
      setDiffError(null);
    }
  }, [open, workflows]);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId),
    [selectedWorkflowId, workflows],
  );

  useEffect(() => {
    if (selectedWorkflow && selectedWorkflow.versions.length > 0) {
      const latest = selectedWorkflow.versions
        .slice()
        .sort((a, b) => b.number - a.number)[0];
      setSelectedVersionId((current) => current || latest.id);
    }
  }, [selectedWorkflow]);

  const selectedVersion = useMemo(() => {
    return selectedWorkflow?.versions.find((version) => version.id === selectedVersionId) || null;
  }, [selectedWorkflow, selectedVersionId]);

  useEffect(() => {
    if (selectedVersion) {
      setEditorDefinition(cloneDefinition(selectedVersion.definition));
      setAuthor(selectedVersion.author);
      setChangeSummary("");
    } else {
      setEditorDefinition(null);
    }
  }, [selectedVersion]);

  const handleCreateWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createForm.name.trim() || !createForm.author.trim()) {
      toast({
        title: "Missing details",
        description: "Provide at least a name and author.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await createWorkflowMutation.mutateAsync({
        ...createForm,
        steps: [],
      });
      setShowCreateForm(false);
      setCreateForm(defaultCreateForm);
      setSelectedWorkflowId(result.workflow.id);
      setSelectedVersionId(result.version.id);
      setEditorDefinition(cloneDefinition(result.version.definition));
      setAuthor(result.version.author);
      setChangeSummary("");
      toast({
        title: "Workflow created",
        description: `${result.workflow.name} is ready for drafting.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create workflow";
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    }
  };

  const handleAddStep = () => {
    if (!editorDefinition) return;
    setEditorDefinition({
      ...editorDefinition,
      steps: [
        ...editorDefinition.steps,
        {
          id: crypto.randomUUID(),
          name: "New step",
          type: "action",
          config: {},
        },
      ],
    });
  };

  const handleStepChange = (
    stepId: string,
    field: string,
    value: string | Record<string, unknown>,
  ) => {
    if (!editorDefinition) return;
    setEditorDefinition({
      ...editorDefinition,
      steps: editorDefinition.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              [field]: value,
            }
          : step,
      ),
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!editorDefinition) return;
    setEditorDefinition({
      ...editorDefinition,
      steps: editorDefinition.steps.filter((step) => step.id !== stepId),
    });
  };

  const handleSaveDraft = async () => {
    if (!selectedWorkflow || !selectedVersion || !editorDefinition) return;
    if (!changeSummary.trim()) {
      toast({
        title: "Change summary required",
        description: "Explain what changed to keep the history meaningful.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateVersionMutation.mutateAsync({
        workflowId: selectedWorkflow.id,
        versionId: selectedVersion.id,
        payload: {
          definition: editorDefinition,
          author: author.trim() || selectedVersion.author,
          changeSummary,
        },
      });
      toast({ title: "Draft saved", description: "Version history updated." });
      setChangeSummary("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save draft";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    }
  };

  const handlePublishVersion = async (version: WorkflowVersion) => {
    if (!selectedWorkflow) return;
    if (version.status !== "draft") {
      toast({
        title: "Cannot publish",
        description: "Only draft versions can be published.",
        variant: "destructive",
      });
      return;
    }
    if (!changeSummary.trim()) {
      toast({
        title: "Change summary required",
        description: "Document why this version is ready to publish.",
        variant: "destructive",
      });
      return;
    }
    try {
      const summary = changeSummary.trim() || version.changeSummary || `Publish v${version.number}`;
      await publishVersionMutation.mutateAsync({
        workflowId: selectedWorkflow.id,
        versionId: version.id,
        author: author.trim() || version.author,
        changeSummary: summary,
      });
      toast({
        title: "Version published",
        description: `v${version.number} is now immutable.`,
      });
      setChangeSummary("");
      setSelectedVersionId(version.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to publish version";
      toast({ title: "Publish failed", description: message, variant: "destructive" });
    }
  };

  const handleDuplicate = async (version: WorkflowVersion) => {
    if (!selectedWorkflow) return;
    try {
      const duplicationAuthor = author.trim() || version.author;
      const summary = changeSummary.trim() || `Duplicate of v${version.number}`;
      const result = await duplicateVersionMutation.mutateAsync({
        workflowId: selectedWorkflow.id,
        versionId: version.id,
        author: duplicationAuthor,
        changeSummary: summary,
      });
      setSelectedVersionId(result.id);
      toast({
        title: "Draft duplicated",
        description: `New draft based on v${version.number} created.`,
      });
      setChangeSummary("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to duplicate version";
      toast({ title: "Duplicate failed", description: message, variant: "destructive" });
    }
  };

  const handleRevert = async (version: WorkflowVersion) => {
    if (!selectedWorkflow) return;
    try {
      const revertAuthor = author.trim() || version.author;
      const summary = changeSummary.trim() || `Reverted to v${version.number}`;
      const result = await revertVersionMutation.mutateAsync({
        workflowId: selectedWorkflow.id,
        versionId: version.id,
        author: revertAuthor,
        changeSummary: summary,
      });
      setSelectedVersionId(result.id);
      toast({
        title: "Reverted",
        description: `Draft created from v${version.number}.`,
      });
      setChangeSummary("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to revert version";
      toast({ title: "Revert failed", description: message, variant: "destructive" });
    }
  };

  const handleCreateDraftFromCurrent = async () => {
    if (!selectedWorkflow || !editorDefinition) return;
    try {
      const draftAuthor = author.trim() || selectedVersion?.author || "System";
      const summary = changeSummary.trim() || "Fork from builder";
      const result = await createVersionMutation.mutateAsync({
        workflowId: selectedWorkflow.id,
        payload: {
          definition: editorDefinition,
          author: draftAuthor,
          changeSummary: summary,
        },
      });
      setSelectedVersionId(result.version.id);
      toast({
        title: "Draft created",
        description: "New version seeded from the current builder state.",
      });
      setChangeSummary("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create draft";
      toast({ title: "Draft creation failed", description: message, variant: "destructive" });
    }
  };

  const handleViewDiff = async (version: WorkflowVersion) => {
    if (!selectedWorkflow) return;
    const previous = getPreviousVersion(selectedWorkflow, version.id);
    setDiffVersion(version);
    setDiffPrevious(previous);
    if (!previous) {
      setDiffResult(null);
      setDiffError("No previous version to compare against.");
      return;
    }
    setDiffLoading(true);
    setDiffResult(null);
    setDiffError(null);
    try {
      const diff = await fetchWorkflowDiff(selectedWorkflow.id, previous.id, version.id);
      setDiffResult(diff);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to compute diff";
      setDiffError(message);
      setDiffResult(null);
    } finally {
      setDiffLoading(false);
    }
  };

  const sortedHistory = useMemo(() => {
    return (selectedWorkflow?.history || [])
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [selectedWorkflow]);

  const canEdit = selectedVersion?.status === "draft";

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader className="space-y-2">
          <DialogTitle>Workflow Builder</DialogTitle>
          <DialogDescription>
            Track version history, compare changes, and safely publish automation workflows.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {selectedWorkflow ? `Selected: ${selectedWorkflow.name}` : "Select or create a workflow"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCreateForm((value) => !value)}>
              <Plus className="mr-2 h-4 w-4" /> New Workflow
            </Button>
          </div>
        </div>
        <Separator />
        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Create workflow</CardTitle>
                  <CardDescription>Capture the metadata that anchors the first draft.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleCreateWorkflow}>
                    <div className="space-y-1">
                      <Label htmlFor="workflowName">Name</Label>
                      <Input
                        id="workflowName"
                        value={createForm.name}
                        onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
                        placeholder="Workflow title"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="workflowTrigger">Trigger</Label>
                      <Select
                        value={createForm.trigger}
                        onValueChange={(value) => setCreateForm((form) => ({ ...form, trigger: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="schedule">Schedule</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="workflowDescription">Description</Label>
                      <Textarea
                        id="workflowDescription"
                        value={createForm.description}
                        onChange={(event) =>
                          setCreateForm((form) => ({ ...form, description: event.target.value }))
                        }
                        rows={3}
                        placeholder="Describe the intent of this workflow"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="workflowAuthor">Author</Label>
                        <Input
                          id="workflowAuthor"
                          value={createForm.author}
                          onChange={(event) =>
                            setCreateForm((form) => ({ ...form, author: event.target.value }))
                          }
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="workflowSummary">Summary</Label>
                        <Input
                          id="workflowSummary"
                          value={createForm.changeSummary}
                          onChange={(event) =>
                            setCreateForm((form) => ({ ...form, changeSummary: event.target.value }))
                          }
                          placeholder="Initial change summary"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" type="button" onClick={() => setShowCreateForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createWorkflowMutation.isPending}>
                        {createWorkflowMutation.isPending ? "Creating…" : "Create"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Workflows</CardTitle>
                <CardDescription>Pick a workflow to explore and edit its versions.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {workflows.map((workflow) => (
                      <button
                        key={workflow.id}
                        className={cn(
                          "w-full text-left rounded-md border p-3 transition",
                          workflow.id === selectedWorkflowId
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted",
                        )}
                        onClick={() => {
                          setSelectedWorkflowId(workflow.id);
                          setSelectedVersionId("");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{workflow.name}</span>
                          {workflow.publishedVersionId && (
                            <Badge variant="secondary">Published v{workflow.versions.find((v) => v.id === workflow.publishedVersionId)?.number}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{workflow.description}</p>
                      </button>
                    ))}
                    {isLoading && <p className="text-xs text-muted-foreground">Loading workflows…</p>}
                    {!isLoading && workflows.length === 0 && (
                      <p className="text-xs text-muted-foreground">No workflows yet—create one to begin.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {selectedWorkflow && (
              <Card>
                <CardHeader>
                  <CardTitle>Version history</CardTitle>
                  <CardDescription>Each entry preserves author, action, and summary.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72">
                    <div className="space-y-3">
                      {sortedHistory.map((entry) => {
                        const version = selectedWorkflow.versions.find((v) => v.id === entry.versionId);
                        if (!version) return null;
                        const isCurrent = selectedVersion?.id === version.id;
                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "rounded-md border p-3",
                              isCurrent ? "border-primary bg-primary/5" : "border-border",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={version.status === "published" ? "default" : "secondary"}>
                                  v{version.number}
                                </Badge>
                                <span className="text-sm font-medium capitalize">{entry.action}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{entry.summary}</p>
                            <p className="text-xs text-muted-foreground">{entry.author}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedVersionId(version.id)}>
                                Open
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleViewDiff(version)}>
                                <Diff className="mr-1 h-4 w-4" /> Diff
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDuplicate(version)}>
                                <Copy className="mr-1 h-4 w-4" /> Duplicate
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRevert(version)}>
                                <Undo2 className="mr-1 h-4 w-4" /> Revert
                              </Button>
                              {version.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePublishVersion(version)}
                                >
                                  <CheckCircle2 className="mr-1 h-4 w-4" /> Publish
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {sortedHistory.length === 0 && (
                        <p className="text-xs text-muted-foreground">No version history recorded yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {selectedVersion && editorDefinition ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Editing v{selectedVersion.number}
                        <Badge variant={canEdit ? "outline" : "secondary"}>{selectedVersion.status}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {canEdit
                          ? "Changes to this draft can be saved or duplicated."
                          : "Published versions are immutable—duplicate or revert to evolve."}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCreateDraftFromCurrent}>
                        <Plus className="mr-1 h-4 w-4" /> Fork draft
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="builderName">Workflow name</Label>
                      <Input
                        id="builderName"
                        value={editorDefinition.name}
                        onChange={(event) =>
                          setEditorDefinition({ ...editorDefinition, name: event.target.value })
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="builderTrigger">Trigger</Label>
                      <Select
                        value={editorDefinition.trigger}
                        onValueChange={(value) =>
                          setEditorDefinition({ ...editorDefinition, trigger: value })
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="schedule">Schedule</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="builderDescription">Description</Label>
                    <Textarea
                      id="builderDescription"
                      value={editorDefinition.description}
                      onChange={(event) =>
                        setEditorDefinition({ ...editorDefinition, description: event.target.value })
                      }
                      rows={3}
                      disabled={!canEdit}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Steps</Label>
                      <Button size="sm" onClick={handleAddStep} disabled={!canEdit}>
                        <Plus className="mr-1 h-4 w-4" /> Add step
                      </Button>
                    </div>
                    {editorDefinition.steps.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No steps yet. Add actions, conditions, or integrations to shape the workflow.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {editorDefinition.steps.map((step, index) => (
                          <div key={step.id} className="rounded-md border p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Step {index + 1}</Badge>
                                <Input
                                  value={step.name}
                                  onChange={(event) => handleStepChange(step.id, "name", event.target.value)}
                                  disabled={!canEdit}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveStep(step.id)}
                                disabled={!canEdit}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label>Type</Label>
                                <Select
                                  value={step.type}
                                  onValueChange={(value) => handleStepChange(step.id, "type", value)}
                                  disabled={!canEdit}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="action">Action</SelectItem>
                                    <SelectItem value="condition">Condition</SelectItem>
                                    <SelectItem value="delay">Delay</SelectItem>
                                    <SelectItem value="loop">Loop</SelectItem>
                                    <SelectItem value="integration">Integration</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label>Config</Label>
                                <Textarea
                                  value={JSON.stringify(step.config || {}, null, 2)}
                                  onChange={(event) => {
                                    try {
                                      const parsed = JSON.parse(event.target.value || "{}") as Record<string, unknown>;
                                      handleStepChange(step.id, "config", parsed);
                                    } catch {
                                      // ignore invalid JSON until valid
                                    }
                                  }}
                                  rows={3}
                                  disabled={!canEdit}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="builderAuthor">Author</Label>
                      <Input
                        id="builderAuthor"
                        value={author}
                        onChange={(event) => setAuthor(event.target.value)}
                        placeholder="Who is making this change?"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="builderSummary">Change summary</Label>
                      <Input
                        id="builderSummary"
                        value={changeSummary}
                        onChange={(event) => setChangeSummary(event.target.value)}
                        placeholder="Describe the change for history"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-end">
                    {!canEdit && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Published versions cannot be edited directly.
                      </div>
                    )}
                    <Button variant="outline" onClick={handleCreateDraftFromCurrent}>
                      <Plus className="mr-1 h-4 w-4" /> Duplicate as draft
                    </Button>
                    <Button onClick={handleSaveDraft} disabled={!canEdit}>
                      <Save className="mr-1 h-4 w-4" /> Save draft
                    </Button>
                    <Button
                      onClick={() => selectedVersion && handlePublishVersion(selectedVersion)}
                      variant="default"
                      disabled={!canEdit}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Publish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center text-muted-foreground">
                  Select a workflow version to begin editing.
                </CardContent>
              </Card>
            )}

            {diffVersion && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Diff for v{diffVersion.number}</CardTitle>
                    <CardDescription>
                      {diffPrevious
                        ? `Comparing against v${diffPrevious.number}`
                        : "No baseline available"}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDiffVersion(null)}>
                    Clear
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {diffLoading && <p className="text-muted-foreground">Loading diff…</p>}
                  {diffError && <p className="text-destructive">{diffError}</p>}
                  {!diffLoading && !diffError && diffResult && (
                    <div className="space-y-2">
                      {diffResult.metadataChanges.length > 0 && (
                        <div>
                          <p className="font-medium">Metadata changes</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {diffResult.metadataChanges.map((change) => (
                              <li key={change.field}>
                                {change.field}: <span className="line-through">{formatValue(change.from)}</span>{" "}→{" "}
                                <span className="font-medium">{formatValue(change.to)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {diffResult.addedSteps.length > 0 && (
                        <div>
                          <p className="font-medium">Added steps</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {diffResult.addedSteps.map((step) => (
                              <li key={step.id}>
                                {step.name} ({step.type})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {diffResult.removedSteps.length > 0 && (
                        <div>
                          <p className="font-medium">Removed steps</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {diffResult.removedSteps.map((step) => (
                              <li key={step.id}>
                                {step.name} ({step.type})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {diffResult.changedSteps.length > 0 && (
                        <div>
                          <p className="font-medium">Modified steps</p>
                          <div className="space-y-2 text-muted-foreground">
                            {diffResult.changedSteps.map((step) => (
                              <div key={step.id} className="rounded border p-2">
                                <p className="font-medium">{step.name}</p>
                                <ul className="list-disc list-inside">
                                  {step.changes.map((change, index) => (
                                    <li key={`${step.id}-${change.field}-${index}`}>
                                      {change.field}: <span className="line-through">{formatValue(change.from)}</span>{" "}→{" "}
                                      <span className="font-medium">{formatValue(change.to)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {diffResult.metadataChanges.length === 0 &&
                        diffResult.addedSteps.length === 0 &&
                        diffResult.removedSteps.length === 0 &&
                        diffResult.changedSteps.length === 0 && (
                          <p className="text-muted-foreground">No differences detected.</p>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <WorkflowShareDialog open={shareOpen} onClose={() => setShareOpen(false)} workflows={workflows} />
  category: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  steps: WorkflowStep[];

}

const prebuiltWorkflows: WorkflowTemplate[] = [
  {

    ],
  },
  {
    id: 'scheduled-http-sync',
    name: 'HTTP Data Sync',
    description: 'Fetch data from an API endpoint on a schedule and stage it for storage.',
    category: 'Integration',
    icon: Globe,
    steps: [


  const [activeTab, setActiveTab] = useState('prebuilt');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [customWorkflow, setCustomWorkflow] = useState({
    name: '',
    description: '',
    trigger: '',
    steps: [] as WorkflowStep[],
  });

    onClose();
    navigate(`/workflows/builder${buildSearchSuffix(options)}`);
  };

  const handleSaveCustom = () => {

    onClose();
    setCustomWorkflow({
      name: '',
      description: '',
      trigger: '',
      steps: [],
    });
  };

  const addCustomStep = () => {

    setCustomWorkflow({
      ...customWorkflow,
      steps: [...customWorkflow.steps, newStep],
    });
  };

  const removeCustomStep = (stepId: string) => {
    setCustomWorkflow({
      ...customWorkflow,
      steps: customWorkflow.steps.filter((step) => step.id !== stepId),
    });
  };


  };

  return (
    <Dialog open={open} onOpenChange={onClose}>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WorkflowIcon className="h-5 w-5" />
            Workflow Library
          </DialogTitle>
          <DialogDescription>
            Configure reusable workflows with typed nodes. Test runs validate configuration and stream live logs below.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            <TabsTrigger value="prebuilt">Prebuilt Workflows</TabsTrigger>
            <TabsTrigger value="custom">Custom Workflow</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="prebuilt" className="space-y-4">
            <div className="grid gap-4">
              {prebuiltWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}

                >
                  <CardHeader className="pb-3">
                    <div className={cn('flex items-center justify-between', isMobile && 'flex-col gap-3 items-start')}>
                      <div className="flex items-center gap-3">
                        <workflow.icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {workflow.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={workflow.status === 'published' ? 'default' : 'outline'}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>v{workflow.version}</span>
                      <span>•</span>
                      <span>
                        Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                      </span>
                      {workflow.execution.schedule && (
                        <>
                          <span>•</span>
                          <span>Schedule: {workflow.execution.schedule}</span>
                        </>
                      )}
                    </div>
                  </CardHeader>

                  {selectedWorkflow?.id === workflow.id && (
                    <CardContent className="pt-0 space-y-4">
                      <Separator />
                      <div>
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <ListChecks className="h-4 w-4" />
                          Workflow Steps
                        </h5>
                        <div className="space-y-2">
                          {workflow.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary" className="text-xs">
                                {index + 1}
                              </Badge>
                              <span className="font-medium">{step.name}</span>

                            </div>
                          ))}
                        </div>
                      </div>

                          }}
                          className={cn(isMobile && 'w-full justify-center')}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Test Run
                        </Button>
                        <Button
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleApplyPrebuilt(workflow);
                          }}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Apply Workflow
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="workflowName">Workflow Name</Label>
                  <Input
                    id="workflowName"
                    value={customWorkflow.name}
                    onChange={(e) => setCustomWorkflow({ ...customWorkflow, name: e.target.value })}
                    placeholder="Enter workflow name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger Type</Label>
                  <Select
                    value={customWorkflow.trigger}
                    onValueChange={(value) => setCustomWorkflow({ ...customWorkflow, trigger: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <WorkflowBuilder
                resourceId={`workflow:${agentId ?? 'custom'}`}
                initialDescription={customWorkflow.description}
                onSave={(description) =>
                  setCustomWorkflow((previous) => ({ ...previous, description }))
                }
              />

              <Separator />

              <div className="space-y-4">

                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                {customWorkflow.steps.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No steps added yet. Click "Add Step" to create your workflow.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customWorkflow.steps.map((step, index) => (

                          </div>
                          <Button
                            variant="ghost"
                            size={isMobile ? 'default' : 'sm'}
                            onClick={() => removeCustomStep(step.id)}
                            className={cn(isMobile && 'self-stretch w-full justify-center')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={step.nodeType}
                            onValueChange={(value) =>
                              updateCustomStep(step.id, (current) => ({
                                ...current,
                                nodeType: value,
                                type:
                                  availableNodes.find((node) => node.type === value)?.displayName ?? current.type,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableNodes.map((node) => (
                                <SelectItem key={node.type} value={node.type}>
                                  {node.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="JSON configuration"
                            value={stringifyConfig(step.config)}
                            onChange={(event) =>
                              updateCustomStep(step.id, (current) => ({
                                ...current,
                                config: event.target.value,
                              }))
                            }
                            className="font-mono text-xs"
                            rows={4}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>


              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {savedWorkflows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Saved workflows will appear here for offline reuse.
              </p>
            ) : (
              <div className="space-y-3">
                {savedWorkflows.map((workflow) => (
                  <Card key={workflow.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {workflow.description || 'No description provided.'}
                          </CardDescription>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{workflow.trigger || 'manual'}</Badge>
                            <span>
                              {workflow.steps.length} step{workflow.steps.length === 1 ? '' : 's'}
                            </span>
                            <span>
                              Saved {new Date(workflow.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size={isMobile ? 'default' : 'sm'}
                            onClick={() => removeWorkflow(workflow.id)}
                            aria-label={`Delete ${workflow.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div
                        className={cn(
                          'flex justify-end gap-2',
                          isMobile && 'flex-col gap-3'
                        )}
                      >
                        <Button
                          size={isMobile ? 'default' : 'sm'}
                          className={cn(isMobile && 'w-full justify-center text-base')}
                          onClick={() => handleApplySaved(workflow)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Apply Workflow
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Execution Logs
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-2">
                Status:
                <Badge variant={lastRunStatus === 'completed' ? 'secondary' : lastRunStatus === 'failed' ? 'destructive' : 'outline'}>
                  {lastRunStatus.toUpperCase()}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2 text-xs">
                  {executionLogs.length === 0 ? (
                    <p className="text-muted-foreground">Execute a workflow to stream logs here.</p>
                  ) : (
                    executionLogs.map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="flex items-start gap-2">
                        <Badge className={`mt-0.5 ${levelStyles[log.level] ?? levelStyles.info}`}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <div className="space-y-1">
                          <div className="font-medium text-muted-foreground">Step: {log.stepId}</div>
                          <div>{log.message}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Available Credentials
              </CardTitle>
              <CardDescription className="text-xs">
                Reference IDs when configuring nodes that require secure secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {credentialMetadata.length === 0 ? (
                <p className="text-muted-foreground">No credentials stored yet. Create them from the dashboard.</p>
              ) : (
                <div className="space-y-1">
                  {credentialMetadata.map((credential) => (
                    <div key={credential.id} className="rounded border border-dashed border-muted p-2">
                      <div className="font-medium text-sm">{credential.name}</div>
                      <div className="text-muted-foreground">ID: {credential.id}</div>
                      <div className="text-muted-foreground">Type: {credential.type}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

