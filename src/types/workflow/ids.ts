export type UUIDProvider = { randomUUID?: () => string };

const getUUIDProvider = (): UUIDProvider | undefined => {
  const globalWithCrypto = globalThis as typeof globalThis & { crypto?: UUIDProvider };
  return globalWithCrypto.crypto;
};

const uuidV4Fallback = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

export const generateId = (): string => {
  const provider = getUUIDProvider();
  if (typeof provider?.randomUUID === 'function') {
    return provider.randomUUID();
  }
  return uuidV4Fallback();
};
