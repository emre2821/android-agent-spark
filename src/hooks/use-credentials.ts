import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CredentialMetadata, CreateCredentialPayload } from '@/types/credential';

const baseUrl = 'http://localhost:3001/api/credentials';

const fetchCredentials = async (userId: string, workspaceId: string): Promise<CredentialMetadata[]> => {
  const params = new URLSearchParams({ userId, workspaceId });
  const response = await fetch(`${baseUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to load credentials');
  }
  return response.json();
};

const createCredentialRequest = async (payload: CreateCredentialPayload): Promise<CredentialMetadata> => {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Failed to create credential');
  }
  return response.json();
};

const deleteCredentialRequest = async (
  id: string,
  userId: string,
  workspaceId: string,
): Promise<void> => {
  const params = new URLSearchParams({ userId, workspaceId });
  const response = await fetch(`${baseUrl}/${id}?${params.toString()}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Failed to delete credential');
  }
};

export const useCredentials = (userId: string, workspaceId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['credentials', userId, workspaceId];

  const list = useQuery({
    queryKey,
    queryFn: () => fetchCredentials(userId, workspaceId),
    enabled: Boolean(userId && workspaceId),
  });

  const create = useMutation({
    mutationFn: createCredentialRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const destroy = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteCredentialRequest(id, userId, workspaceId),
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

