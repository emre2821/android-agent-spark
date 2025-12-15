export interface CredentialMetadata {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  type: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export interface CreateCredentialPayload {
  userId: string;
  workspaceId: string;
  name: string;
  type: string;
  scopes?: string[];
  secret: Record<string, unknown> | string;
}

export interface AccessCredentialPayload {
  userId: string;
  workspaceId: string;
}

export interface AccessCredentialResponse {
  secret: Record<string, unknown>;
}

