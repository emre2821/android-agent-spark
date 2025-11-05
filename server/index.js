import { createServer as createWorkspaceServer, startWorkspaceServer } from './workspaceServer.js';
import { createApp as createAgentApp, startAgentRuntime, HttpError } from './agentRuntime.js';
import { serverConfig } from './config/serverConfig.js';
import logger from './logger.js';

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

const DEFAULT_PORT = Number.isFinite(serverConfig.port) ? serverConfig.port : 3001;

const createRuntimeApp = (...args) => createAgentApp(...args);
export const createApp = createRuntimeApp;

let runningInstance;
export let server;

export const startServer = (port = DEFAULT_PORT) =>
  new Promise((resolve, reject) => {
    if (server?.listening) {
      resolve(server);
      return;
    }

    runningInstance = createRuntimeApp();
    const httpServer = runningInstance.server;

    const onError = (error) => {
      httpServer.off('error', onError);
      runningInstance = undefined;
      reject(error);
    };

    httpServer.once('error', onError);
    httpServer.listen(port, () => {
      httpServer.off('error', onError);
      server = httpServer;
      resolve(httpServer);
    });
  });

export const stopServer = async () => {
  if (!runningInstance) {
    return;
  }

  await runningInstance.close();
  runningInstance = undefined;
  server = undefined;
};

const bootstrap = () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const entry = resolveEntry();
  if (entry === 'workspace') {
    startWorkspaceServer();
    return;
  }

  const envPort = Number.parseInt(process.env.PORT ?? '', 10);
  const port = Number.isFinite(envPort) ? envPort : DEFAULT_PORT;

  startServer(port)
    .then((httpServer) => {
      const address = httpServer.address();
      const resolvedPort =
        typeof address === 'object' && address !== null ? address.port ?? port : port;
      logger.info('API server started', {
        port: resolvedPort,
        url: `http://localhost:${resolvedPort}`,
      });
    })
    .catch((error) => {
      logger.error('Failed to start API server', { error });
      process.exit(1);
    });
};

bootstrap();

export { createWorkspaceServer as createServer, startWorkspaceServer, startAgentRuntime, HttpError };
