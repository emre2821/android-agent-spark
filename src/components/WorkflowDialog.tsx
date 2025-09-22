import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Workflow,
  Plus,
  Save,
  Play,
  Clock,
  MessageSquare,
  Database,
  Globe,
  Shield,
  Zap,
  ListChecks,
  X,
} from 'lucide-react';
import { workflowEngine, WorkflowDefinition } from '@/lib/workflowEngine';
import { nodeRegistry } from '@/lib/nodes';
import { useCredentials } from '@/hooks/use-credentials';
import { useToast } from '@/hooks/use-toast';
import type { CredentialMetadata } from '@/types/credential';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  agentId?: string;
  userId: string;
  workspaceId: string;
}

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  nodeType: string;
  config: Record<string, unknown> | string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<any>;
  steps: WorkflowStep[];
}

const prebuiltWorkflows: WorkflowTemplate[] = [
  {
    id: 'webhook-to-message',
    name: 'Webhook Notification Relay',
    description: 'Capture webhook events and broadcast them into a messaging channel.',
    category: 'Messaging',
    icon: MessageSquare,
    steps: [
      {
        id: 'listen',
        type: 'Webhook',
        name: 'Capture Event',
        nodeType: 'webhook.listen',
        config: {
          eventName: 'incoming.webhook',
          responseTemplate: 'Event received',
        },
      },
      {
        id: 'notify',
        type: 'Messaging',
        name: 'Notify Channel',
        nodeType: 'messaging.send',
        config: {
          channel: '#operations-alerts',
          message: 'New webhook event received',
          urgent: false,
        },
      },
    ],
  },
  {
    id: 'scheduled-http-sync',
    name: 'HTTP Data Sync',
    description: 'Fetch data from an API endpoint on a schedule and stage it for storage.',
    category: 'Integration',
    icon: Globe,
    steps: [
      {
        id: 'fetch-remote',
        type: 'HTTP',
        name: 'Fetch Remote Data',
        nodeType: 'http.request',
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/todos/1',
        },
      },
      {
        id: 'stage-storage',
        type: 'Database',
        name: 'Stage Result Set',
        nodeType: 'database.query',
        config: {
          dialect: 'postgres',
          statement: '-- Provide credentialId to persist data',
          credentialId: 'REPLACE_WITH_CREDENTIAL_ID',
        },
      },
    ],
  },
  {
    id: 'incident-bridge',
    name: 'Incident Bridge',
    description: 'Escalate webhook incidents, enrich context, and alert responders.',
    category: 'Operations',
    icon: Shield,
    steps: [
      {
        id: 'ingest',
        type: 'Webhook',
        name: 'Ingest Incident',
        nodeType: 'webhook.listen',
        config: {
          eventName: 'incident.created',
          responseTemplate: 'Acknowledged',
        },
      },
      {
        id: 'lookup',
        type: 'HTTP',
        name: 'Lookup Runbook',
        nodeType: 'http.request',
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1',
        },
      },
      {
        id: 'page',
        type: 'Messaging',
        name: 'Page On-call',
        nodeType: 'messaging.send',
        config: {
          channel: '@oncall',
          message: 'Incident acknowledged. Review latest runbook.',
          urgent: true,
        },
      },
    ],
  },
];

interface ExecutionLogEntry {
  stepId: string;
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

const resolveCredential = async (
  credentialId: string,
  userId: string,
  workspaceId: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const response = await fetch(`http://localhost:3001/api/credentials/${credentialId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, workspaceId }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.secret ?? null;
  } catch (error) {
    console.warn('Failed to access credential', error);
    return null;
  }
};

const stringifyConfig = (config: Record<string, unknown> | string) =>
  typeof config === 'string' ? config : JSON.stringify(config, null, 2);

const parseStepConfig = (step: WorkflowStep): Record<string, unknown> => {
  if (typeof step.config === 'string') {
    const trimmed = step.config.trim();
    if (!trimmed) {
      return {};
    }
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`Step "${step.name}" has invalid JSON configuration`);
    }
  }
  return step.config;
};

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({
  open,
  onClose,
  agentId,
  userId,
  workspaceId,
}) => {
  const { toast } = useToast();
  const availableNodes = useMemo(() => nodeRegistry.listNodes(), []);
  const { list: credentialList } = useCredentials(userId, workspaceId);

  const [activeTab, setActiveTab] = useState('prebuilt');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [customWorkflow, setCustomWorkflow] = useState({
    name: '',
    description: '',
    trigger: '',
    steps: [] as WorkflowStep[],
  });
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunStatus, setLastRunStatus] = useState<'idle' | 'completed' | 'failed'>('idle');

  const credentialMetadata: CredentialMetadata[] = credentialList.data ?? [];

  const handleApplyPrebuilt = (workflow: WorkflowTemplate) => {
    console.log('Applying prebuilt workflow:', workflow.name, 'to agent:', agentId);
    onClose();
  };

  const handleSaveCustom = () => {
    console.log('Saving custom workflow:', customWorkflow);
    onClose();
  };

  const addCustomStep = () => {
    const defaultNodeType = availableNodes[0]?.type ?? 'http.request';
    const defaultNodeName = availableNodes[0]?.displayName ?? 'HTTP Request';
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type: defaultNodeName,
      name: 'New Step',
      nodeType: defaultNodeType,
      config: {},
    };
    setCustomWorkflow({
      ...customWorkflow,
      steps: [...customWorkflow.steps, newStep],
    });
  };

  const removeCustomStep = (stepId: string) => {
    setCustomWorkflow({
      ...customWorkflow,
      steps: customWorkflow.steps.filter(step => step.id !== stepId),
    });
  };

  const updateCustomStep = (stepId: string, updater: (step: WorkflowStep) => WorkflowStep) => {
    setCustomWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.map(step => (step.id === stepId ? updater(step) : step)),
    }));
  };

  const runDefinition = async (definition: WorkflowDefinition) => {
    setExecutionLogs([]);
    setIsRunning(true);
    setLastRunStatus('idle');

    try {
      const result = await workflowEngine.run(
        definition,
        {
          userId,
          workspaceId,
          credentials: {
            getCredential: (credentialId) => resolveCredential(credentialId, userId, workspaceId),
          },
        },
        (entry) => {
          setExecutionLogs((logs) => [...logs, entry]);
        },
      );
      setLastRunStatus(result.status);
      if (result.status === 'failed') {
        toast({
          title: 'Workflow run failed',
          description: 'One or more nodes reported an error. Inspect the logs below for details.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Workflow run completed',
          description: 'All nodes finished without error.',
        });
      }
    } catch (error) {
      setLastRunStatus('failed');
      const message = error instanceof Error ? error.message : 'Unknown execution error';
      setExecutionLogs((logs) => [
        ...logs,
        {
          stepId: 'engine',
          level: 'error',
          message,
          timestamp: new Date().toISOString(),
        },
      ]);
      toast({
        title: 'Workflow execution error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testRunWorkflow = (workflow: WorkflowTemplate) => {
    const definition: WorkflowDefinition = {
      id: workflow.id,
      name: workflow.name,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        name: step.name,
        nodeType: step.nodeType,
        config: parseStepConfig(step),
      })),
    };
    runDefinition(definition);
  };

  const testRunCustomWorkflow = () => {
    const definition: WorkflowDefinition = {
      id: 'custom-workflow',
      name: customWorkflow.name || 'Custom Workflow',
      steps: customWorkflow.steps.map((step) => ({
        id: step.id,
        name: step.name,
        nodeType: step.nodeType,
        config: parseStepConfig(step),
      })),
    };
    runDefinition(definition);
  };

  const levelStyles: Record<string, string> = {
    info: 'bg-muted text-muted-foreground',
    debug: 'bg-slate-500/10 text-slate-600 dark:text-slate-200',
    warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    error: 'bg-destructive text-destructive-foreground',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[840px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Workflow Management
          </DialogTitle>
          <DialogDescription>
            Configure reusable workflows with typed nodes. Test runs validate configuration and stream live logs below.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prebuilt">Prebuilt Workflows</TabsTrigger>
            <TabsTrigger value="custom">Custom Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="prebuilt" className="space-y-4">
            <div className="grid gap-4">
              {prebuiltWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <workflow.icon className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {workflow.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{workflow.category}</Badge>
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
                              <Badge variant="outline" className="text-xs">
                                {step.nodeType}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRunning}
                          onClick={(event) => {
                            event.stopPropagation();
                            testRunWorkflow(workflow);
                          }}
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="workflowDescription">Description</Label>
                <Textarea
                  id="workflowDescription"
                  value={customWorkflow.description}
                  onChange={(e) => setCustomWorkflow({ ...customWorkflow, description: e.target.value })}
                  placeholder="Describe what this workflow does"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Workflow Steps</h4>
                  <Button size="sm" onClick={addCustomStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                {customWorkflow.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No steps added yet. Click "Add Step" to create your workflow.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customWorkflow.steps.map((step, index) => (
                      <Card key={step.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge>{index + 1}</Badge>
                            <Input
                              placeholder="Step name"
                              value={step.name}
                              onChange={(e) =>
                                updateCustomStep(step.id, (current) => ({ ...current, name: e.target.value }))
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomStep(step.id)}
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

              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Test runs execute immediately using your stored credentials.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isRunning || customWorkflow.steps.length === 0}
                    onClick={testRunCustomWorkflow}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Test Run
                  </Button>
                  <Button onClick={handleSaveCustom} disabled={!customWorkflow.name.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Workflow
                  </Button>
                </div>
              </div>
            </div>
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

