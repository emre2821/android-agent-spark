import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WorkflowsPreview = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-3xl flex-col gap-6 px-6 py-12">
      <Card className="border-dashed border-border/40 bg-card/40">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Workflow className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-semibold">Workflows are in preview</CardTitle>
          <CardDescription className="text-base">
            The custom workflow builder is hidden until the API persistence layer ships. Set
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">VITE_ENABLE_CUSTOM_WORKFLOWS=true</code>
            in your environment once the backend is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="border-border/40 bg-muted/40">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>What to expect</AlertTitle>
            <AlertDescription>
              Draft, publish, and trigger management will reappear after the storage layer is available. Until then, workflows
              remain in read-only preview mode.
            </AlertDescription>
          </Alert>

          <Separator />

          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Need to keep working? Automations that shipped with your workspace continue to run. Agent tasks, memory, and run
              telemetry remain available from the dashboard.
            </p>
            <p>
              Curious about the roadmap? Check the release notes for the latest status on workflow persistence and native shell
              packaging.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/')}>Back to dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowsPreview;
