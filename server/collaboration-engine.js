import { randomUUID } from 'crypto';

const nowIso = () => new Date().toISOString();

export class CollaborationEngine {
  constructor(options = {}) {
    const { onAuditEntry, initialAuditLog = [] } = options;
    this.onAuditEntry = onAuditEntry;
    this.presence = new Map();
    this.locks = new Map();
    this.userResources = new Map();
    this.auditLog = Array.isArray(initialAuditLog) ? [...initialAuditLog] : [];
  }

  _getPresenceMap(resource) {
    if (!this.presence.has(resource)) {
      this.presence.set(resource, new Map());
    }
    return this.presence.get(resource);
  }

  _record(action, payload) {
    const entry = {
      id: randomUUID(),
      timestamp: nowIso(),
      ...payload,
      action,
    };
    this.auditLog.push(entry);
    if (typeof this.onAuditEntry === 'function') {
      this.onAuditEntry(entry, this.auditLog);
    }
    return entry;
  }

  join(resource, user) {
    if (!resource || !user?.id) {
      throw new Error('Resource and user id are required for join');
    }
    const presenceMap = this._getPresenceMap(resource);
    presenceMap.set(user.id, {
      id: user.id,
      name: user.name,
      color: user.color,
      lastActive: nowIso(),
    });

    if (!this.userResources.has(user.id)) {
      this.userResources.set(user.id, new Set());
    }
    this.userResources.get(user.id).add(resource);

    return {
      presence: Array.from(presenceMap.values()),
      lock: this.locks.get(resource) || null,
    };
  }

  leave(resource, userId) {
    if (!resource || !userId) return { presence: this.getPresence(resource), lock: this.getLock(resource) };
    const presenceMap = this._getPresenceMap(resource);
    presenceMap.delete(userId);

    if (this.userResources.has(userId)) {
      const resources = this.userResources.get(userId);
      resources.delete(resource);
      if (resources.size === 0) {
        this.userResources.delete(userId);
      }
    }

    return {
      presence: Array.from(presenceMap.values()),
      lock: this.locks.get(resource) || null,
    };
  }

  removeUserFromAll(userId) {
    if (!userId) return [];
    const affectedResources = [];
    const resources = this.userResources.get(userId);
    if (!resources) return affectedResources;

    const resourceList = Array.from(resources);

    for (const resource of resourceList) {
      const { presence } = this.leave(resource, userId);
      let lock = this.locks.get(resource);
      if (lock?.userId === userId) {
        this.locks.delete(resource);
        this._record('lock-released', {
          resource,
          userId,
          userName: lock.userName,
          details: 'Lock released due to disconnect',
        });
        lock = null;
      }
      affectedResources.push({ resource, presence: this.getPresence(resource), lock });
    }

    this.userResources.delete(userId);
    return affectedResources;
  }

  acquireLock(resource, user, metadata = {}) {
    if (!resource || !user?.id) {
      throw new Error('Resource and user id are required for lock');
    }
    const currentLock = this.locks.get(resource);
    if (currentLock && currentLock.userId !== user.id) {
      return { success: false, conflict: currentLock };
    }

    const lock = {
      resource,
      userId: user.id,
      userName: user.name,
      lockedAt: nowIso(),
      metadata,
    };

    this.locks.set(resource, lock);
    this._record('lock-acquired', {
      resource,
      userId: user.id,
      userName: user.name,
      details: metadata.reason || 'Lock acquired',
    });

    return { success: true, lock };
  }

  releaseLock(resource, userId, metadata = {}) {
    if (!resource || !userId) {
      throw new Error('Resource and user id are required for release');
    }
    const currentLock = this.locks.get(resource);
    if (!currentLock || currentLock.userId !== userId) {
      return { success: false, lock: currentLock || null };
    }

    this.locks.delete(resource);
    this._record('lock-released', {
      resource,
      userId,
      userName: currentLock.userName,
      details: metadata.reason || 'Lock released',
    });

    return { success: true, lock: null };
  }

  forceUnlock(resource, user, metadata = {}) {
    if (!resource || !user?.id) {
      throw new Error('Resource and user id are required for force unlock');
    }
    const previousLock = this.locks.get(resource) || null;
    const reason = metadata.reason || 'Force unlock requested';

    const lock = {
      resource,
      userId: user.id,
      userName: user.name,
      lockedAt: nowIso(),
      forced: true,
      reason,
      previousOwnerId: previousLock?.userId,
      previousOwnerName: previousLock?.userName,
    };

    this.locks.set(resource, lock);

    this._record('lock-forced', {
      resource,
      userId: user.id,
      userName: user.name,
      details: reason,
      metadata: {
        previousOwnerId: previousLock?.userId || null,
        previousOwnerName: previousLock?.userName || null,
      },
    });

    return { success: true, lock, previousLock };
  }

  save(resource, user, summary, metadata = {}) {
    if (!resource || !user?.id) {
      throw new Error('Resource and user id are required for save');
    }
    const currentLock = this.locks.get(resource);
    if (!currentLock || currentLock.userId !== user.id) {
      return { success: false, conflict: currentLock || null };
    }

    const entry = this._record('save', {
      resource,
      userId: user.id,
      userName: user.name,
      details: summary || 'Changes saved',
      metadata,
    });

    return { success: true, auditEntry: entry };
  }

  getPresence(resource) {
    const presenceMap = this._getPresenceMap(resource);
    return Array.from(presenceMap.values());
  }

  getLock(resource) {
    return this.locks.get(resource) || null;
  }

  getAuditLog(limit) {
    if (typeof limit === 'number') {
      return this.auditLog.slice(-limit);
    }
    return [...this.auditLog];
  }
}
