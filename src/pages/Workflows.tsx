import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useWorkflows } from '@/hooks/use-workflows';
import { useAgents } from '@/hooks/use-agents';
import {
  Workflow,
  WorkflowExecutionLog,
  WorkflowPort,
  WorkflowStep,
} from '@/types/workflow';
import {
  GitBranch,
  History,
  Layers,
  Play,
  Plus,
  RefreshCcw,
  Rocket,
  Save,
  Share2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const statusToBadge = (status?: string) => {
  switch (status) {
    case 'success':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'error':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'running':
      return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const createPort = (label: string): WorkflowPort => ({
  id: crypto.randomUUID(),
  label,
  dataType: 'text',
});

const Workflows: React.FC = () => {
  const { agents } = useAgents();
  const {
    workflows,
    createWorkflow,
    addStep,
    updateStep,
    runWorkflow,
    createVersionSnapshot,
    applyWorkflowToAgent,
    updateWorkflow,
  } = useWorkflows();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentFilter = searchParams.get('agentId');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(searchParams.get('workflowId'));
  const [activeTab, setActiveTab] = useState('design');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  useEffect(() => {
    const workflowIdFromParams = searchParams.get('workflowId');
    if (workflowIdFromParams && workflowIdFromParams !== selectedWorkflowId) {
      setSelectedWorkflowId(workflowIdFromParams);
    }
  }, [searchParams, selectedWorkflowId]);

  const filteredWorkflows = useMemo(() => {
    if (!agentFilter) return workflows;
    return workflows.filter((workflow) => workflow.agentId === agentFilter);
  }, [agentFilter, workflows]);

  const selectedWorkflow: Workflow | undefined = useMemo(() => {
    if (selectedWorkflowId) {
      return workflows.find((workflow) => workflow.id === selectedWorkflowId);
    }
    if (agentFilter) {
      return filteredWorkflows[0];
    }
    return workflows[0];
  }, [agentFilter, filteredWorkflows, selectedWorkflowId, workflows]);

  useEffect(() => {
    if (!selectedWorkflowId) {
      const fallback = filteredWorkflows[0] ?? (!agentFilter ? workflows[0] : undefined);
      if (fallback) {
        setSelectedWorkflowId(fallback.id);
        const params = new URLSearchParams();
        params.set('workflowId', fallback.id);
        if (agentFilter) params.set('agentId', agentFilter);
        setSearchParams(params);
      }
    }
  }, [agentFilter, filteredWorkflows, selectedWorkflowId, setSearchParams, workflows]);

  useEffect(() => {
    if (selectedWorkflow && selectedWorkflow.steps.length > 0) {
      setSelectedStepId((current) => current ?? selectedWorkflow.steps[0]?.id ?? null);
    } else {
      setSelectedStepId(null);
    }
  }, [selectedWorkflow]);

  const handleCreateWorkflow = (agentId?: string | null, respectScope = false) => {
    const count = workflows.length + 1;
    const workflow = createWorkflow({
      name: `Workflow ${count}`,
      description: 'Describe the workflow goals and key outcomes.',
      agentId: agentId ?? (respectScope ? agentFilter ?? undefined : undefined),
    });
    setSelectedWorkflowId(workflow.id);
    const params = new URLSearchParams();
    params.set('workflowId', workflow.id);
    const scopedAgent = agentId ?? (respectScope ? agentFilter : undefined);
    if (scopedAgent) params.set('agentId', scopedAgent);
    setSearchParams(params);
    toast({
      title: 'Workflow created',
      description: `${workflow.name} is ready for editing.`,
    });
  };

  const handleAddStep = () => {
    if (!selectedWorkflow) return;
    const stepCount = selectedWorkflow.steps.length + 1;
    const step = addStep(selectedWorkflow.id, {
      name: `Step ${stepCount}`,
      position: { x: 160 + stepCount * 40, y: 160 + stepCount * 20 },
      outputs: [createPort('Result')],
    });
    setSelectedStepId(step.id);
  };

  const handleDropOnCanvas = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!selectedWorkflow) return;
    const stepId = event.dataTransfer.getData('text/plain') || selectedStepId;
    if (!stepId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    updateStep(selectedWorkflow.id, stepId, { position: { x, y } });
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, stepId: string) => {
    event.dataTransfer.setData('text/plain', stepId);
  };

  const handleRunWorkflow = () => {
    if (!selectedWorkflow) return;
    runWorkflow(selectedWorkflow.id);
    toast({
      title: 'Workflow executed',
      description: `${selectedWorkflow.name} ran successfully.`,
    });
  };

  const handleCreateVersion = () => {
    if (!selectedWorkflow) return;
    const version = createVersionSnapshot(selectedWorkflow.id, 'Manual snapshot');
    if (version) {
      toast({
        title: 'Version saved',
        description: `Snapshot created with ${version.steps.length} steps.`,
      });
    }
  };

  const handleApplyToAgent = () => {
    if (!selectedWorkflow || !selectedWorkflow.agentId) {
      toast({
        title: 'Select an agent',
        description: 'Assign the workflow to an agent before applying.',
        variant: 'destructive',
      });
      return;
    }
    applyWorkflowToAgent(selectedWorkflow.id, selectedWorkflow.agentId);
    toast({
      title: 'Workflow applied',
      description: `${selectedWorkflow.name} is now active for the agent.`,
    });
  };

  const selectedAgent = selectedWorkflow?.agentId
    ? agents.find((agent) => agent.id === selectedWorkflow.agentId)
    : undefined;

  const selectedStep: WorkflowStep | undefined = selectedWorkflow?.steps.find(
    (step) => step.id === selectedStepId
  );

  const handleStepFieldChange = <K extends keyof WorkflowStep>(field: K, value: WorkflowStep[K]) => {
    if (!selectedWorkflow || !selectedStep) return;
    updateStep(selectedWorkflow.id, selectedStep.id, { [field]: value } as Partial<WorkflowStep>);
  };

  const addPort = (type: 'inputs' | 'outputs') => {
    if (!selectedWorkflow || !selectedStep) return;
    const ports = [...selectedStep[type], createPort(`${type === 'inputs' ? 'Input' : 'Output'} ${selectedStep[type].length + 1}`)];
    updateStep(selectedWorkflow.id, selectedStep.id, { [type]: ports } as Partial<WorkflowStep>);
  };

  const addBranch = () => {
    if (!selectedWorkflow || !selectedStep) return;
    const newBranch = {
      id: crypto.randomUUID(),
      label: `Branch ${selectedStep.branches.length + 1}`,
      condition: 'Define condition',
    };
    updateStep(selectedWorkflow.id, selectedStep.id, { branches: [...selectedStep.branches, newBranch] });
  };

  const handleAgentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedWorkflow) return;
    updateWorkflow(selectedWorkflow.id, { agentId: event.target.value || null });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Workflow Builder</h1>
          <p className="text-muted-foreground">
            Design, preview, and activate automation flows for your agents. Drag steps onto the canvas and track execution history.
          </p>
          {agentFilter && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="border-primary/40 text-primary">
                Scoped to agent {agentFilter}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchParams(new URLSearchParams());
                  setSelectedWorkflowId(null);
                }}
              >
                Clear scope
              </Button>
            </div>
          )}
        </div>

        <ResizablePanelGroup direction="horizontal" className="min-h-[640px] rounded-lg border bg-card">
          <ResizablePanel defaultSize={26} className="border-r">
            <div className="flex h-full flex-col gap-4 p-4">
              <div className="flex flex-col gap-2">
                <Button onClick={() => handleCreateWorkflow(null)} className="justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  New workflow
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCreateWorkflow(agentFilter, true)}
                  disabled={!agentFilter}
                  className="justify-start gap-2"
                >
                  <Layers className="h-4 w-4" />
                  New for agent
                </Button>
              </div>

              <Separator />

              <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                {filteredWorkflows.map((workflow) => (
                  <Card
                    key={workflow.id}
                    className={`cursor-pointer border ${
                      selectedWorkflow?.id === workflow.id
                        ? 'border-primary shadow-md'
                        : 'border-border/60 hover:border-primary/60'
                    }`}
                    onClick={() => {
                      setSelectedWorkflowId(workflow.id);
                      const params = new URLSearchParams();
                      params.set('workflowId', workflow.id);
                      if (agentFilter) params.set('agentId', agentFilter);
                      setSearchParams(params);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{workflow.name}</CardTitle>
                        <Badge variant="outline" className={statusToBadge(workflow.lastRunStatus)}>
                          {workflow.lastRunStatus ?? 'idle'}
                        </Badge>
                      </div>
                      <CardDescription>{workflow.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{workflow.steps.length} steps</span>
                      {workflow.agentId && <span>Agent: {workflow.agentId}</span>}
                    </CardContent>
                  </Card>
                ))}

                {filteredWorkflows.length === 0 && (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">No workflows yet</CardTitle>
                      <CardDescription>Start by creating a new automation pipeline.</CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={74}>
            {selectedWorkflow ? (
              <div className="flex h-full flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                    <GitBranch className="h-3.5 w-3.5" />
                    {selectedWorkflow.status}
                  </Badge>
                  {selectedAgent && (
                    <Badge variant="secondary" className="gap-1">
                      <Share2 className="h-3.5 w-3.5" />
                      {selectedAgent.name}
                    </Badge>
                  )}
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleCreateVersion}>
                      <Save className="mr-2 h-4 w-4" />
                      Snapshot
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRunWorkflow}>
                      <Play className="mr-2 h-4 w-4" />
                      Run
                    </Button>
                    <Button size="sm" onClick={handleApplyToAgent} className="bg-gradient-primary">
                      <Rocket className="mr-2 h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="design">Builder</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="design" className="flex h-full flex-col gap-4 border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{selectedWorkflow.name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
                      </div>
                      <Button variant="secondary" onClick={handleAddStep} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add step
                      </Button>
                    </div>

                    <div className="grid flex-1 gap-4 lg:grid-cols-[2fr_1fr]">
                      <div
                        className="relative min-h-[400px] overflow-hidden rounded-lg border border-dashed bg-muted/10"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={handleDropOnCanvas}
                      >
                        {selectedWorkflow.steps.map((step) => (
                          <div
                            key={step.id}
                            className={`absolute w-56 cursor-move rounded-lg border bg-background p-4 shadow-sm transition ${
                              selectedStepId === step.id
                                ? 'border-primary ring-2 ring-primary/40'
                                : 'border-border/60 hover:border-primary/60'
                            }`}
                            style={{
                              left: step.position.x,
                              top: step.position.y,
                            }}
                            draggable
                            onDragStart={(event) => handleDragStart(event, step.id)}
                            onClick={() => setSelectedStepId(step.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{step.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {step.type}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {step.branches.length} branches · {step.outputs.length} outputs
                            </p>
                          </div>
                        ))}

                        {selectedWorkflow.steps.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                            Drag steps here to begin constructing your workflow.
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Step details</CardTitle>
                            <CardDescription>
                              Configure inputs, outputs, and branching logic for the selected node.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {selectedStep ? (
                              <>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Step name</label>
                                  <Input
                                    value={selectedStep.name}
                                    onChange={(event) => handleStepFieldChange('name', event.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Type</label>
                                  <Input
                                    value={selectedStep.type}
                                    onChange={(event) => handleStepFieldChange('type', event.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Configuration</label>
                                  <Textarea
                                    value={JSON.stringify(selectedStep.config, null, 2)}
                                    onChange={(event) => {
                                      try {
                                        const parsed = JSON.parse(event.target.value);
                                        handleStepFieldChange('config', parsed);
                                      } catch (error) {
                                        // ignore invalid JSON typing to keep editing experience smooth
                                      }
                                    }}
                                    className="font-mono text-xs"
                                    rows={4}
                                  />
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Inputs</span>
                                    <Button variant="ghost" size="sm" onClick={() => addPort('inputs')}>
                                      <Plus className="mr-1 h-4 w-4" />
                                      Add
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {selectedStep.inputs.map((input) => (
                                      <div key={input.id} className="flex items-center justify-between rounded border px-3 py-2">
                                        <span className="text-sm">{input.label}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {input.dataType}
                                        </Badge>
                                      </div>
                                    ))}
                                    {selectedStep.inputs.length === 0 && (
                                      <p className="text-xs text-muted-foreground">No inputs configured yet.</p>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Outputs</span>
                                    <Button variant="ghost" size="sm" onClick={() => addPort('outputs')}>
                                      <Plus className="mr-1 h-4 w-4" />
                                      Add
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {selectedStep.outputs.map((output) => (
                                      <div key={output.id} className="flex items-center justify-between rounded border px-3 py-2">
                                        <span className="text-sm">{output.label}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {output.dataType}
                                        </Badge>
                                      </div>
                                    ))}
                                    {selectedStep.outputs.length === 0 && (
                                      <p className="text-xs text-muted-foreground">No outputs configured yet.</p>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Branches</span>
                                    <Button variant="ghost" size="sm" onClick={addBranch}>
                                      <Plus className="mr-1 h-4 w-4" />
                                      Add
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {selectedStep.branches.map((branch) => (
                                      <div key={branch.id} className="rounded border px-3 py-2 text-sm">
                                        <div className="font-medium">{branch.label}</div>
                                        <div className="text-xs text-muted-foreground">{branch.condition}</div>
                                      </div>
                                    ))}
                                    {selectedStep.branches.length === 0 && (
                                      <p className="text-xs text-muted-foreground">No branching rules yet.</p>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <span className="text-sm font-medium">Execution log</span>
                                  <div className="space-y-2">
                                    {selectedStep.logs.map((log: WorkflowExecutionLog) => (
                                      <div
                                        key={log.id}
                                        className="flex items-start justify-between rounded border px-3 py-2 text-xs"
                                      >
                                        <div>
                                          <div className="font-medium">{log.message}</div>
                                          <div className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                                        </div>
                                        <Badge variant="outline" className={statusToBadge(log.status)}>
                                          {log.status}
                                        </Badge>
                                      </div>
                                    ))}
                                    {selectedStep.logs.length === 0 && (
                                      <p className="text-xs text-muted-foreground">Run the workflow to generate logs.</p>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Select a step on the canvas to edit its configuration.</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Assignment</CardTitle>
                            <CardDescription>Scope the workflow to an agent to activate it quickly.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <label className="text-sm font-medium">Agent ID</label>
                            <Input
                              value={selectedWorkflow.agentId ?? ''}
                              onChange={handleAgentChange}
                              placeholder="agent-id"
                            />
                            <p className="text-xs text-muted-foreground">
                              Paste an existing agent identifier or leave blank to keep the workflow unassigned.
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="flex h-full flex-col gap-4 border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">Preview run</h2>
                        <p className="text-sm text-muted-foreground">Review the execution order and expected outputs.</p>
                      </div>
                      <Button variant="outline" onClick={handleRunWorkflow} className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Simulate run
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedWorkflow.steps.map((step) => (
                        <Card key={step.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{step.name}</CardTitle>
                            <CardDescription>{step.type}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium">Inputs</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {step.inputs.map((input) => (
                                  <Badge key={input.id} variant="outline" className="text-xs">
                                    {input.label}
                                  </Badge>
                                ))}
                                {step.inputs.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Outputs</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {step.outputs.map((output) => (
                                  <Badge key={output.id} variant="outline" className="text-xs">
                                    {output.label}
                                  </Badge>
                                ))}
                                {step.outputs.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Branches</span>
                              <div className="mt-1 flex flex-col gap-1 text-xs">
                                {step.branches.map((branch) => (
                                  <div key={branch.id} className="flex items-center justify-between rounded border px-2 py-1">
                                    <span>{branch.label}</span>
                                    <span className="text-muted-foreground">{branch.condition}</span>
                                  </div>
                                ))}
                                {step.branches.length === 0 && <span className="text-xs text-muted-foreground">Linear flow</span>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {selectedWorkflow.steps.length === 0 && (
                        <Card className="border-dashed text-center text-sm text-muted-foreground">
                          <CardHeader>
                            <CardTitle className="text-base">No steps to preview</CardTitle>
                            <CardDescription>Add steps in the builder to view the execution outline.</CardDescription>
                          </CardHeader>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="flex h-full flex-col gap-4 border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">Version history</h2>
                        <p className="text-sm text-muted-foreground">
                          Snapshots capture the state of the workflow at each significant change or run.
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleCreateVersion} className="gap-2">
                        <History className="h-4 w-4" />
                        Save snapshot
                      </Button>
                    </div>

                    <div className="space-y-3 overflow-y-auto">
                      {selectedWorkflow.versions.map((version) => (
                        <Card key={version.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Snapshot · {new Date(version.createdAt).toLocaleString()}</CardTitle>
                            <CardDescription>{version.note ?? 'No description provided.'}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{version.steps.length} steps</span>
                            {version.agentId && <span>Agent: {version.agentId}</span>}
                          </CardContent>
                        </Card>
                      ))}

                      {selectedWorkflow.versions.length === 0 && (
                        <Card className="border-dashed text-center text-sm text-muted-foreground">
                          <CardHeader>
                            <CardTitle className="text-base">No versions yet</CardTitle>
                            <CardDescription>Run the workflow or capture a snapshot to build history.</CardDescription>
                          </CardHeader>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Card className="max-w-md text-center">
                  <CardHeader>
                    <CardTitle className="text-xl">Choose a workflow to begin</CardTitle>
                    <CardDescription>
                      Create a workflow from scratch or scope a new builder session to an agent from the left panel.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleCreateWorkflow(null)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create workflow
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Workflows;
