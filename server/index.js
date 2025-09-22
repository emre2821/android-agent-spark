import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  workspaces,
  workspaceResources,
  findUserByEmail,
  findUserById,
  getWorkspaceById,
  getWorkspaceSummary,
} from './data.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL = '4h';

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const buildWorkspacePayload = (memberships) =>
  memberships
    .map((membership) => {
      const workspace = getWorkspaceById(membership.id);
      if (!workspace) {
        return null;
      }
      const summary = getWorkspaceSummary(membership.id);
      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        role: membership.role,
        summary,
      };
    })
    .filter(Boolean);

export const createServer = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = findUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ message: 'Invalid authentication token.' });
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaces: user.workspaces,
      };

      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid authentication token.' });
    }
  };

  const authorizeWorkspace = (req, res, next) => {
    const { workspaceId } = req.params;
    const membership = req.user.workspaces.find((item) => item.id === workspaceId);

    if (!membership) {
      return res.status(403).json({ message: 'You do not have access to this workspace.' });
    }

    const workspace = getWorkspaceById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const resources = workspaceResources[workspaceId];
    if (!resources) {
      return res.status(404).json({ message: 'Workspace resources not found.' });
    }

    req.workspace = workspace;
    req.workspaceMembership = membership;
    req.workspaceResources = resources;

    return next();
  };

  app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });

    return res.json({
      token,
      user: sanitizeUser(user),
      workspaces: buildWorkspacePayload(user.workspaces),
    });
  });

  app.get('/auth/me', authenticate, (req, res) => {
    return res.json({
      user: sanitizeUser(req.user),
      workspaces: buildWorkspacePayload(req.user.workspaces),
    });
  });

  app.get('/workspaces', authenticate, (req, res) => {
    return res.json(buildWorkspacePayload(req.user.workspaces));
  });

  app.get('/workspaces/:workspaceId', authenticate, authorizeWorkspace, (req, res) => {
    return res.json({
      ...req.workspace,
      role: req.workspaceMembership.role,
      summary: getWorkspaceSummary(req.workspace.id),
    });
  });

  app.get('/workspaces/:workspaceId/agents', authenticate, authorizeWorkspace, (req, res) => {
    return res.json(req.workspaceResources.agents);
  });

  app.get('/workspaces/:workspaceId/workflows', authenticate, authorizeWorkspace, (req, res) => {
    return res.json(req.workspaceResources.workflows);
  });

  app.get('/workspaces/:workspaceId/credentials', authenticate, authorizeWorkspace, (req, res) => {
    return res.json(req.workspaceResources.credentials);
  });

  app.get('/workspaces/:workspaceId/runs', authenticate, authorizeWorkspace, (req, res) => {
    return res.json(req.workspaceResources.runs);
  });

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  const app = createServer();
  app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });
}
