import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge as FlowEdge,
  EdgeChange,
  Node as FlowNode,
  NodeChange,
  addEdge,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { workflowTemplates } from '@/lib/workflowTemplates';
import { useWorkflows, type WorkflowUpsert } from '@/hooks/use-workflows';
import { Workflow, WorkflowNode, WorkflowEdge as WorkflowConnection, WorkflowPort } from '@/types/workflow';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Loader2, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';

interface CanvasNodeData {
  label: string;
  stepType: string;
  summary?: string;
}

type CanvasNode = FlowNode<CanvasNodeData>;

type CanvasEdge = FlowEdge;

const createCanvasNode = (id: string, index: number, data: CanvasNodeData): CanvasNode => ({
  id,
  type: 'default',
  position: { x: 120, y: index * 160 },
  data,
});

const toCanvasState = (workflow: Workflow): { nodes: CanvasNode[]; edges: CanvasEdge[] } => {
  const nodes = workflow.nodes.map((node, index) =>
    createCanvasNode(node.id, index, {
      label: node.label,
      stepType: node.type,
      summary: node.data.summary,
    }),
  );
  const edges: CanvasEdge[] = workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));
  return { nodes, edges };
};

const toWorkflowNode = (node: CanvasNode): WorkflowNode => ({
  id: node.id,
  type: node.data.stepType,
  label: node.data.label,
  position: node.position,
  data: {
    summary: node.data.summary,
    inputs: [],
    outputs: [],
    config: {},
  },
});

const toWorkflowEdge = (edge: CanvasEdge): WorkflowConnection => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle,
  targetHandle: edge.targetHandle,
  metadata: {},
});

const defaultWorkflowPorts = (): WorkflowPort[] => [];

const ReactFlowCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
}) => (
  <div className="h-full">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background gap={24} size={2} />
      <Controls showInteractive={false} />
    </ReactFlow>
  </div>
);

const WorkflowBuilderInner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const workflowId = searchParams.get('workflowId');
  const {
    getWorkflowById,
    saveWorkflow,
    publishWorkflow,
    duplicateWorkflow,
    isSaving,
    isPublishing,
    isDuplicating,
  } =
    useWorkflows();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [inputs, setInputs] = useState<WorkflowPort[]>(defaultWorkflowPorts());
  const [outputs, setOutputs] = useState<WorkflowPort[]>(defaultWorkflowPorts());
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [persistedWorkflow, setPersistedWorkflow] = useState<Workflow | undefined>(
    workflowId ? getWorkflowById(workflowId) : undefined,
  );

  const selectedWorkflow = workflowId ? getWorkflowById(workflowId) : undefined;
  const activeWorkflow = selectedWorkflow ?? persistedWorkflow;

  const hydrateFromWorkflow = useCallback(
    (workflow: Workflow) => {
      setName(workflow.name);
      setDescription(workflow.description ?? '');
      setSchedule(workflow.execution.schedule ?? '');
      setTagsInput(workflow.metadata.tags.join(', '));
      setInputs(workflow.inputs);
      setOutputs(workflow.outputs);
      const canvas = toCanvasState(workflow);
      setNodes(canvas.nodes);
      setEdges(canvas.edges);
      setPersistedWorkflow(workflow);
      setHasHydrated(true);
    },
    [setNodes, setEdges],
  );

  const initializeBlank = useCallback(() => {
    setName('Untitled workflow');
    setDescription('');
    setSchedule('');
    setTagsInput('');
    setInputs([]);
    setOutputs([]);
    setNodes([]);
    setEdges([]);
    setPersistedWorkflow(undefined);
    setHasHydrated(true);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!workflowId) {
      setPersistedWorkflow(undefined);
      return;
    }

    if (persistedWorkflow && persistedWorkflow.id !== workflowId) {
      setPersistedWorkflow(undefined);
    }
  }, [workflowId, persistedWorkflow]);

  useEffect(() => {
    if (workflowId && selectedWorkflow) {
      hydrateFromWorkflow(selectedWorkflow);
    } else if (!workflowId && !hasHydrated) {
      initializeBlank();
    }
  }, [workflowId, selectedWorkflow, hydrateFromWorkflow, hasHydrated, initializeBlank]);

  const handleAddNode = () => {
    const id = `node-${Date.now()}`;
    const newNode = createCanvasNode(id, nodes.length, {
      label: 'New Step',
      stepType: nodes.length === 0 ? 'trigger' : 'action',
    });
    setNodes((current) => [...current, newNode]);
    if (nodes.length > 0) {
      const previous = nodes[nodes.length - 1];
      setEdges((current) => [
        ...current,
        {
          id: `edge-${previous.id}-${id}`,
          source: previous.id,
          target: id,
        },
      ]);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const handleNodeLabelChange = (nodeId: string, value: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: value,
              },
            }
          : node,
      ),
    );
  };

  const handleNodeTypeChange = (nodeId: string, value: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                stepType: value,
              },
            }
          : node,
      ),
    );
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const toWorkflowPayload = (): WorkflowUpsert => {
    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const baseExecution = activeWorkflow?.execution ?? {
      runCount: 0,
      lastRunStatus: 'idle' as const,
    };

    return {
      id: activeWorkflow?.id,
      name,
      description,
      status: activeWorkflow?.status ?? 'draft',
      version: activeWorkflow?.version ?? 1,
      triggerId: nodes[0]?.id,
      nodes: nodes.map(toWorkflowNode),
      edges: edges.map(toWorkflowEdge),
      inputs,
      outputs,
      createdAt: activeWorkflow?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      execution: {
        ...baseExecution,
        schedule: schedule || undefined,
      },
      metadata: {
        tags,
        owner: activeWorkflow?.metadata.owner,
        category: activeWorkflow?.metadata.category,
      },
    };
  };

  const handleSave = async () => {
    try {
      const payload = toWorkflowPayload();
      const saved = await saveWorkflow(payload);
      hydrateFromWorkflow(saved);
      const params = new URLSearchParams(searchParams);
      params.set('workflowId', saved.id);
      params.delete('mode');
      setSearchParams(params);
      toast({
        title: 'Workflow saved',
        description: 'Your changes have been stored.',
      });
    } catch (error) {
      toast({
        title: 'Unable to save workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async () => {
    if (!activeWorkflow?.id) return;
    try {
      const result = await publishWorkflow(activeWorkflow.id);
      hydrateFromWorkflow(result);
      toast({
        title: 'Workflow published',
        description: 'The workflow is now live.',
      });
    } catch (error) {
      toast({
        title: 'Unable to publish workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async () => {
    if (!activeWorkflow?.id) return;
    try {
      const duplicate = await duplicateWorkflow(activeWorkflow.id);
      hydrateFromWorkflow(duplicate);
      const params = new URLSearchParams(searchParams);
      params.set('workflowId', duplicate.id);
      params.delete('mode');
      setSearchParams(params);
      toast({
        title: 'Workflow duplicated',
        description: 'A draft copy is now available.',
      });
    } catch (error) {
      toast({
        title: 'Unable to duplicate workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleTemplateApply = (templateId: string) => {
    const template = workflowTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const templateNodes = template.steps.map((step, index) =>
      createCanvasNode(`template-${template.id}-${index}`, index, {
        label: step.name,
        stepType: step.type,
        summary: step.summary,
      }),
    );
    const templateEdges: CanvasEdge[] = templateNodes.slice(1).map((node, index) => ({
      id: `template-edge-${templateNodes[index].id}-${node.id}`,
      source: templateNodes[index].id,
      target: node.id,
    }));
    setNodes(templateNodes);
    setEdges(templateEdges);
    setName(template.name);
    setDescription(template.description);
    setSchedule('');
    setInputs([]);
    setOutputs([]);
    setTagsInput(template.category ? template.category.toLowerCase() : '');
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('workflowId');
      next.set('mode', 'new');
      return next;
    });
    toast({
      title: 'Template applied',
      description: `${template.name} loaded into the canvas.`,
    });
  };

  const handleAddPort = (collection: 'inputs' | 'outputs') => {
    const setter = collection === 'inputs' ? setInputs : setOutputs;
    setter((current) => [
      ...current,
      {
        id: `${collection}-${Date.now()}`,
        key: '',
        label: '',
        type: 'string',
      },
    ]);
  };

  const handlePortChange = (collection: 'inputs' | 'outputs', id: string, key: keyof WorkflowPort, value: string) => {
    const setter = collection === 'inputs' ? setInputs : setOutputs;
    setter((current) =>
      current.map((port) =>
        port.id === id
          ? {
              ...port,
              [key]: value,
            }
          : port,
      ),
    );
  };

  const handleRemovePort = (collection: 'inputs' | 'outputs', id: string) => {
    const setter = collection === 'inputs' ? setInputs : setOutputs;
    setter((current) => current.filter((port) => port.id !== id));
  };

  const isPublishDisabled = !activeWorkflow?.id || isPublishing;
  const saveDisabled = !name.trim() || nodes.length === 0 || isSaving;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {activeWorkflow?.status && (
              <Badge variant={activeWorkflow.status === 'published' ? 'default' : 'outline'}>
                {activeWorkflow.status}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold">Workflow Builder</h1>
          <p className="text-sm text-muted-foreground">
            Design automations visually and manage the data contract they expose.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeWorkflow?.id && (
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isDuplicating}>
              {isDuplicating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
              Duplicate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePublish} disabled={isPublishDisabled}>
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Publish
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save workflow
          </Button>
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={38} minSize={28} className="border-r bg-muted/10">
          <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-6">
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Workflow details
                </h2>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="workflow-name">
                  Name
                </label>
                <Input id="workflow-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Give your workflow a name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="workflow-description">
                  Description
                </label>
                <Textarea
                  id="workflow-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Describe what this workflow automates"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="workflow-tags">
                  Tags
                </label>
                <Input
                  id="workflow-tags"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="communication, onboarding"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="workflow-schedule">
                  Schedule
                </label>
                <Input
                  id="workflow-schedule"
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                  placeholder="cron expression (optional)"
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Inputs</h2>
                <Button size="sm" variant="outline" onClick={() => handleAddPort('inputs')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add input
                </Button>
              </div>
              {inputs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Define any data required to run this workflow.</p>
              ) : (
                <div className="space-y-3">
                  {inputs.map((input) => (
                    <Card key={input.id}>
                      <CardContent className="space-y-2 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-muted-foreground">Input</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemovePort('inputs', input.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={input.label}
                          onChange={(event) => handlePortChange('inputs', input.id, 'label', event.target.value)}
                          placeholder="Label"
                        />
                        <Input
                          value={input.key}
                          onChange={(event) => handlePortChange('inputs', input.id, 'key', event.target.value)}
                          placeholder="Key"
                        />
                        <Select
                          value={input.type}
                          onValueChange={(value) => handlePortChange('inputs', input.id, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Outputs</h2>
                <Button size="sm" variant="outline" onClick={() => handleAddPort('outputs')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add output
                </Button>
              </div>
              {outputs.length === 0 ? (
                <p className="text-xs text-muted-foreground">List the values produced when the workflow runs.</p>
              ) : (
                <div className="space-y-3">
                  {outputs.map((output) => (
                    <Card key={output.id}>
                      <CardContent className="space-y-2 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-muted-foreground">Output</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemovePort('outputs', output.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={output.label}
                          onChange={(event) => handlePortChange('outputs', output.id, 'label', event.target.value)}
                          placeholder="Label"
                        />
                        <Input
                          value={output.key}
                          onChange={(event) => handlePortChange('outputs', output.id, 'key', event.target.value)}
                          placeholder="Key"
                        />
                        <Select
                          value={output.type}
                          onValueChange={(value) => handlePortChange('outputs', output.id, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Steps</h2>
                <Button size="sm" variant="outline" onClick={handleAddNode}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add step
                </Button>
              </div>
              {nodes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add steps to outline the workflow before connecting them on the canvas.</p>
              ) : (
                <div className="space-y-3">
                  {nodes.map((node, index) => (
                    <Card key={node.id}>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-sm">Step {index + 1}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveNode(node.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Input
                          value={node.data.label}
                          onChange={(event) => handleNodeLabelChange(node.id, event.target.value)}
                          placeholder="Step name"
                        />
                        <Select
                          value={node.data.stepType}
                          onValueChange={(value) => handleNodeTypeChange(node.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trigger">Trigger</SelectItem>
                            <SelectItem value="action">Action</SelectItem>
                            <SelectItem value="analyze">Analyze</SelectItem>
                            <SelectItem value="process">Process</SelectItem>
                            <SelectItem value="condition">Condition</SelectItem>
                            <SelectItem value="generate">Generate</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Templates</h2>
              </div>
              <div className="space-y-3">
                {workflowTemplates.map((template) => (
                  <Card key={template.id} className="border-border/60">
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <template.icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {template.steps.map((step) => (
                          <Badge key={`${template.id}-${step.id}`} variant="secondary">
                            {step.type}
                          </Badge>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleTemplateApply(template.id)}>
                        Use template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={62} minSize={40} className="bg-background">
          <ReactFlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

const WorkflowBuilder = () => (
  <ReactFlowProvider>
    <WorkflowBuilderInner />
  </ReactFlowProvider>
);

export default WorkflowBuilder;
