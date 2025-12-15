import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { CollaborationEngine } from './collaboration-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_LOG_PATH = path.join(__dirname, 'audit-log.json');

const readAuditLog = () => {
  try {
    const raw = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    // Ignore read/parse errors and fall back to an empty audit log
  }
  return [];
};

const persistAuditLog = (log) => {
  try {
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(log, null, 2));
  } catch (error) {
    // Ignore persistence failures to avoid crashing the server
  }
};

export const collaborationEngine = new CollaborationEngine({
  initialAuditLog: readAuditLog(),
  onAuditEntry: (_entry, log) => persistAuditLog(log),
});

