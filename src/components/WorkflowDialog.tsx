import React, { useState } from 'react';
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
import { 
  Workflow, 
  Plus, 
  Save, 
  Play, 
  Clock, 
  Mail, 
  FileText, 
  Database, 
  Globe,
  MessageSquare,
  Calendar,
  Shield,
  X
} from 'lucide-react';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  agentId?: string;
}

type WorkflowConfig = Record<string, unknown>;

interface WorkflowStep {
  id: string;
  type: string;
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
    id: 'email-automation',
    name: 'Email Response Automation',
    description: 'Automatically respond to emails based on content analysis',
    category: 'Communication',
    icon: Mail,
    steps: [
      { id: '1', type: 'trigger', name: 'Email Received', config: { folder: 'inbox' } },
      { id: '2', type: 'analyze', name: 'Analyze Content', config: { sentiment: true } },
      { id: '3', type: 'action', name: 'Generate Response', config: { template: 'professional' } },
      { id: '4', type: 'action', name: 'Send Reply', config: { delay: 300 } }
    ]
  },
  {
    id: 'data-processing',
    name: 'Data Collection & Processing',
    description: 'Collect data from multiple sources and process it automatically',
    category: 'Data',
    icon: Database,
    steps: [
      { id: '1', type: 'trigger', name: 'Schedule Trigger', config: { interval: '1h' } },
      { id: '2', type: 'action', name: 'Fetch Data', config: { sources: ['api1', 'api2'] } },
      { id: '3', type: 'process', name: 'Clean Data', config: { rules: ['remove_duplicates'] } },
      { id: '4', type: 'action', name: 'Store Results', config: { destination: 'database' } }
    ]
  },
  {
    id: 'content-generation',
    name: 'Content Generation Pipeline',
    description: 'Generate and publish content across multiple platforms',
    category: 'Content',
    icon: FileText,
    steps: [
      { id: '1', type: 'trigger', name: 'Content Request', config: { topic: 'dynamic' } },
      { id: '2', type: 'action', name: 'Research Topic', config: { sources: 3 } },
      { id: '3', type: 'generate', name: 'Create Content', config: { type: 'blog_post' } },
      { id: '4', type: 'action', name: 'Publish Content', config: { platforms: ['blog', 'social'] } }
    ]
  },
  {
    id: 'web-monitoring',
    name: 'Website Monitoring',
    description: 'Monitor websites for changes and send notifications',
    category: 'Monitoring',
    icon: Globe,
    steps: [
      { id: '1', type: 'trigger', name: 'Schedule Check', config: { interval: '30m' } },
      { id: '2', type: 'action', name: 'Check Website', config: { url: 'dynamic' } },
      { id: '3', type: 'condition', name: 'Detect Changes', config: { threshold: 0.1 } },
      { id: '4', type: 'action', name: 'Send Alert', config: { method: 'email' } }
    ]
  },
  {
    id: 'meeting-assistant',
    name: 'Meeting Assistant',
    description: 'Automatically schedule meetings and send reminders',
    category: 'Productivity',
    icon: Calendar,
    steps: [
      { id: '1', type: 'trigger', name: 'Meeting Request', config: { source: 'email' } },
      { id: '2', type: 'action', name: 'Check Availability', config: { calendar: 'primary' } },
      { id: '3', type: 'action', name: 'Schedule Meeting', config: { duration: 60 } },
      { id: '4', type: 'action', name: 'Send Confirmation', config: { template: 'default' } }
    ]
  },
  {
    id: 'security-monitor',
    name: 'Security Monitoring',
    description: 'Monitor system security and respond to threats',
    category: 'Security',
    icon: Shield,
    steps: [
      { id: '1', type: 'trigger', name: 'Security Event', config: { level: 'medium' } },
      { id: '2', type: 'analyze', name: 'Threat Analysis', config: { severity: true } },
      { id: '3', type: 'condition', name: 'Risk Assessment', config: { threshold: 'high' } },
      { id: '4', type: 'action', name: 'Initiate Response', config: { protocol: 'standard' } }
    ]
  }
];

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({
  open,
  onClose,
  agentId,
}) => {
  const [activeTab, setActiveTab] = useState('prebuilt');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [customWorkflow, setCustomWorkflow] = useState({
    name: '',
    description: '',
    trigger: '',
    steps: [] as WorkflowStep[],
  });

  const handleApplyPrebuilt = (workflow: WorkflowTemplate) => {
    console.log('Applying prebuilt workflow:', workflow.name, 'to agent:', agentId);
    // Logic to apply workflow to agent would go here
    onClose();
  };

  const handleSaveCustom = () => {
    console.log('Saving custom workflow:', customWorkflow);
    // Logic to save custom workflow would go here
    onClose();
  };

  const addCustomStep = () => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type: 'action',
      name: 'New Step',
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Workflow Management
          </DialogTitle>
          <DialogDescription>
            Choose from prebuilt workflows or create custom automation sequences.
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
                        <h5 className="text-sm font-medium mb-2">Workflow Steps:</h5>
                        <div className="space-y-2">
                          {workflow.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2 text-sm">
                              <Badge variant="secondary" className="text-xs">
                                {index + 1}
                              </Badge>
                              <span className="font-medium">{step.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {step.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyPrebuilt(workflow);
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
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
                      <SelectItem value="email">Email Received</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="file">File Change</SelectItem>
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
                      <Card key={step.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge>{index + 1}</Badge>
                            <div className="grid grid-cols-2 gap-2 flex-1">
                              <Input
                                placeholder="Step name"
                                value={step.name}
                                onChange={(e) => {
                                  const updatedSteps = customWorkflow.steps.map(s =>
                                    s.id === step.id ? { ...s, name: e.target.value } : s
                                  );
                                  setCustomWorkflow({ ...customWorkflow, steps: updatedSteps });
                                }}
                              />
                              <Select 
                                value={step.type} 
                                onValueChange={(value) => {
                                  const updatedSteps = customWorkflow.steps.map(s =>
                                    s.id === step.id ? { ...s, type: value } : s
                                  );
                                  setCustomWorkflow({ ...customWorkflow, steps: updatedSteps });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="action">Action</SelectItem>
                                  <SelectItem value="condition">Condition</SelectItem>
                                  <SelectItem value="delay">Delay</SelectItem>
                                  <SelectItem value="loop">Loop</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomStep(step.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCustom} disabled={!customWorkflow.name.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Workflow
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};