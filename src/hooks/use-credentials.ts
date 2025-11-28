import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { buildApiUrl } from '@/lib/api/config';
import { fetchJson } from '@/lib/api/fetch';
import { CredentialMetadata, CreateCredentialPayload } from '@/types/credential';

const credentialsKey = (workspaceId: string) => ['credentials', workspaceId] as const;

const fetchCredentials = async (workspaceId: string): Promise<CredentialMetadata[]> =>
  fetchJson<CredentialMetadata[]>(buildApiUrl(`/workspaces/${workspaceId}/credentials`), {
    headers: {
      'X-Workspace-Id': workspaceId,
    },
  });

const createCredentialRequest = async (
  workspaceId: string,
  payload: CreateCredentialPayload,
): Promise<CredentialMetadata> =>
  fetchJson<CredentialMetadata>(buildApiUrl(`/workspaces/${workspaceId}/credentials`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Workspace-Id': workspaceId,
    },
    body: JSON.stringify(payload),
  });

const deleteCredentialRequest = async (workspaceId: string, id: string): Promise<void> =>
  fetchJson<void>(buildApiUrl(`/workspaces/${workspaceId}/credentials/${id}`), {
    method: 'DELETE',
    headers: {
      'X-Workspace-Id': workspaceId,
    },
  });

export const useCredentials = (workspaceId: string) => {
  const queryClient = useQueryClient();
  const queryKey = credentialsKey(workspaceId);

  const list = useQuery({
    queryKey,
    queryFn: () => fetchCredentials(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const create = useMutation({
    mutationFn: (payload: CreateCredentialPayload) => createCredentialRequest(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteCredentialRequest(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    list,
    create,
    destroy,
  };
};

