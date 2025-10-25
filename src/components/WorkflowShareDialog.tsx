import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Workflow } from "@/types/workflow";
import { exportWorkflowPayload, useImportWorkflows } from "@/hooks/use-workflows";
import { useToast } from "@/hooks/use-toast";

interface WorkflowShareDialogProps {
  open: boolean;
  onClose: () => void;
  workflows: Workflow[];
}

export const WorkflowShareDialog: React.FC<WorkflowShareDialogProps> = ({ open, onClose, workflows }) => {
  const { toast } = useToast();
  const importMutation = useImportWorkflows();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [exportResult, setExportResult] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "yaml">("json");

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId),
    [selectedWorkflowId, workflows],
  );

  useEffect(() => {
    if (open && workflows.length) {
      const activeWorkflow = workflows.find((workflow) => workflow.id === selectedWorkflowId) || workflows[0];
      setSelectedWorkflowId(activeWorkflow.id);
      const activeVersion = activeWorkflow.versions.find((version) => version.id === selectedVersionId);
      const fallbackVersion = activeWorkflow.versions[activeWorkflow.versions.length - 1];
      setSelectedVersionId(activeVersion?.id ?? fallbackVersion?.id ?? "");
    }
    if (!open) {
      setExportResult("");
      setImportContent("");
    }
  }, [open, workflows, selectedVersionId, selectedWorkflowId]);

  const handleExport = async () => {
    if (!selectedWorkflowId || !selectedVersionId) {
      toast({
        title: "Select a workflow",
        description: "Choose both a workflow and version to export.",
        variant: "destructive",
      });
      return;
    }
    setIsExporting(true);
    try {
      const payload = await exportWorkflowPayload(selectedWorkflowId, {
        versionId: selectedVersionId,
        format,
      });
      setExportResult(payload);
      toast({
        title: "Export ready",
        description: `Workflow serialized as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export workflow";
      toast({
        title: "Export failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      toast({
        title: "Nothing to import",
        description: "Paste a JSON or YAML payload first.",
        variant: "destructive",
      });
      return;
    }
    try {
      await importMutation.mutateAsync({ content: importContent, format: importFormat });
      toast({
        title: "Workflow imported",
        description: "Shared workflow is now available in this workspace.",
      });
      setImportContent("");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import workflow";
      toast({
        title: "Import failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Share Workflow</DialogTitle>
          <DialogDescription>
            Export the current version for another workspace or import a definition shared with you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1 space-y-2">
                <Label>Workflow</Label>
                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Version</Label>
                <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedWorkflow?.versions || []).map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        v{version.number} · {version.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-32 space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={(value: "json" | "yaml") => setFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="yaml">YAML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleExport} disabled={isExporting || !workflows.length || !selectedVersionId}>
              {isExporting ? "Preparing export…" : "Generate export"}
            </Button>
            <Textarea
              value={exportResult}
              onChange={(event) => setExportResult(event.target.value)}
              placeholder="Exported payload will appear here for copying."
              rows={10}
              readOnly
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="importContent">Import definition</Label>
                <Textarea
                  id="importContent"
                  value={importContent}
                  onChange={(event) => setImportContent(event.target.value)}
                  placeholder="Paste a workflow definition in JSON or YAML"
                  rows={8}
                />
              </div>
              <div className="w-full md:w-32 space-y-2">
                <Label>Format</Label>
                <Select value={importFormat} onValueChange={(value: "json" | "yaml") => setImportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="yaml">YAML</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleImport} disabled={importMutation.isPending} className="w-full">
                  {importMutation.isPending ? "Importing…" : "Import"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

