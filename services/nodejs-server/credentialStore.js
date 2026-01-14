import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const ivLength = 12;
const secret = (() => {
  const rawSecret = process.env.CREDENTIALS_SECRET ?? 'development-secret-key-20241109';
  return crypto.createHash('sha256').update(rawSecret).digest();
})();

const credentialStore = new Map();

const serialize = (buffer) => buffer.toString('base64');
const deserialize = (payload) => Buffer.from(payload, 'base64');

const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, secret, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: serialize(iv),
    content: serialize(encrypted),
    tag: serialize(tag),
  };
};

const decrypt = ({ iv, content, tag }) => {
  const decipher = crypto.createDecipheriv(algorithm, secret, deserialize(iv));
  decipher.setAuthTag(deserialize(tag));
  const decrypted = Buffer.concat([decipher.update(deserialize(content)), decipher.final()]);
  return decrypted.toString('utf8');
};

const scopeKey = (userId, workspaceId) => `${userId}:${workspaceId}`;

export const createCredential = ({
  userId,
  workspaceId,
  name,
  type,
  scopes = [],
  payload,
}) => {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const encrypted = encrypt(JSON.stringify(payload));

  const record = {
    id,
    userId,
    workspaceId,
    name,
    type,
    scopes,
    createdAt: timestamp,
    updatedAt: timestamp,
    encrypted,
    lastUsedAt: null,
  };

  const key = scopeKey(userId, workspaceId);
  if (!credentialStore.has(key)) {
    credentialStore.set(key, new Map());
  }
  credentialStore.get(key).set(id, record);

  return sanitize(record);
};

const sanitize = (record) => ({
  id: record.id,
  userId: record.userId,
  workspaceId: record.workspaceId,
  name: record.name,
  type: record.type,
  scopes: record.scopes,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  lastUsedAt: record.lastUsedAt,
});

export const listCredentials = ({ userId, workspaceId }) => {
  const key = scopeKey(userId, workspaceId);
  if (!credentialStore.has(key)) {
    return [];
  }
  return Array.from(credentialStore.get(key).values()).map(sanitize);
};

export const deleteCredential = ({ id, userId, workspaceId }) => {
  const key = scopeKey(userId, workspaceId);
  if (!credentialStore.has(key)) {
    return false;
  }
  return credentialStore.get(key).delete(id);
};

export const accessCredential = async ({ id, userId, workspaceId }) => {
  const key = scopeKey(userId, workspaceId);
  const scopeCredentials = credentialStore.get(key);
  if (!scopeCredentials || !scopeCredentials.has(id)) {
    return null;
  }
  const record = scopeCredentials.get(id);
  const decrypted = JSON.parse(decrypt(record.encrypted));
  record.lastUsedAt = new Date().toISOString();
  return decrypted;
};

export const clearAll = () => credentialStore.clear();

