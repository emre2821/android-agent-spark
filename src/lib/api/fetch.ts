export const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const text = await response.text();

  if (!response.ok) {
    try {
      const data = text ? JSON.parse(text) : {};
      throw new Error(data.error ?? response.statusText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(response.statusText);
      }
      throw error;
    }
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};
