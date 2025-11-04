import { createServer, startWorkspaceServer } from './workspaceServer.js';
import { createApp, startAgentRuntime, HttpError } from './agentRuntime.js';

const resolveEntry = () => {
  const raw = process.env.SERVER_ENTRY?.toLowerCase();
  switch (raw) {
    case 'workspace':
    case 'workspace-api':
      return 'workspace';
    case 'runtime':
    case 'agent':
    case 'agent-runtime':
    default:
      return 'runtime';
  }
};

if (process.env.NODE_ENV !== 'test') {
  const entry = resolveEntry();

  if (entry === 'workspace') {
    startWorkspaceServer();
  } else {
    startAgentRuntime();
  }
}

export { createServer, startWorkspaceServer, createApp, startAgentRuntime, HttpError };
