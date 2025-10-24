import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AgentDetail from "./pages/AgentDetail";
import Login from "./pages/Login";
import { AgentsProvider } from "@/hooks/use-agents";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import WorkflowRuns from "./pages/WorkflowRuns";
import WorkflowRunNotifications from "@/components/WorkflowRunNotifications";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import { AgentsProvider } from "@/hooks/use-agents";
import { WorkflowsProvider } from "@/hooks/use-workflows";
import Workflows from "./pages/Workflows";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AgentsProvider>
    <AgentsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <WorkflowRunNotifications />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/agents/:id" element={<AgentDetail />} />
            <Route path="/workflow-runs" element={<WorkflowRuns />} />
            <Route path="/workflow-runs/:runId" element={<WorkflowRuns />} />
            {/* Place custom routes above the catch-all "*" route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <WorkflowsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Index />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                {/* Place custom routes above the catch-all "*" route */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AgentsProvider>
    </AuthProvider>
              <Route path="/" element={<Index />} />
              <Route path="/agents/:id" element={<AgentDetail />} />
              <Route path="/workflows" element={<Workflows />} />
              {/* Place custom routes above the catch-all "*" route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WorkflowsProvider>
    </AgentsProvider>
  </QueryClientProvider>
);

export default App;
