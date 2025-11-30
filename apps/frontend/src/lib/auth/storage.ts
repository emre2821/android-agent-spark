const getStorage = (): Storage | null => {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch (error) {
    return null;
  }
};

export const TOKEN_STORAGE_KEY = 'eden_auth_token';
export const WORKSPACE_STORAGE_KEY = 'eden_workspace_id';

export const getStoredAuthToken = (): string | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

export const getStoredWorkspaceId = (): string | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};
