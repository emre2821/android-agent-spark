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

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
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
