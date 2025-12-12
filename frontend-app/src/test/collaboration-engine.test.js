import { describe, it, expect, beforeEach } from 'vitest';
import { CollaborationEngine } from '../../server/collaboration-engine.js';

describe('CollaborationEngine concurrency behaviour', () => {
  let engine;

  beforeEach(() => {
    engine = new CollaborationEngine();
  });

  it('prevents simultaneous locks and allows force unlocks', () => {
    engine.join('workflow:1', { id: 'u1', name: 'User One' });
    engine.join('workflow:1', { id: 'u2', name: 'User Two' });

    const initialLock = engine.acquireLock('workflow:1', { id: 'u1', name: 'User One' });
    expect(initialLock.success).toBe(true);
    expect(engine.getLock('workflow:1')?.userId).toBe('u1');

    const conflictingLock = engine.acquireLock('workflow:1', { id: 'u2', name: 'User Two' });
    expect(conflictingLock.success).toBe(false);
    expect(conflictingLock.conflict?.userId).toBe('u1');

    const forced = engine.forceUnlock('workflow:1', { id: 'u2', name: 'User Two' }, { reason: 'Urgent update' });
    expect(forced.success).toBe(true);
    expect(engine.getLock('workflow:1')?.userId).toBe('u2');
    expect(forced.lock?.previousOwnerId).toBe('u1');
  });

  it('detects save conflicts when lock is not held', () => {
    engine.join('workflow:1', { id: 'u1', name: 'User One' });
    engine.join('workflow:1', { id: 'u2', name: 'User Two' });

    const noLockSave = engine.save('workflow:1', { id: 'u1', name: 'User One' }, 'Attempt without lock');
    expect(noLockSave.success).toBe(false);
    expect(noLockSave.conflict).toBeNull();

    engine.acquireLock('workflow:1', { id: 'u1', name: 'User One' });
    const validSave = engine.save('workflow:1', { id: 'u1', name: 'User One' }, 'Legitimate update');
    expect(validSave.success).toBe(true);

    const conflictingSave = engine.save('workflow:1', { id: 'u2', name: 'User Two' }, 'Conflicting update');
    expect(conflictingSave.success).toBe(false);
    expect(conflictingSave.conflict?.userId).toBe('u1');
  });

  it('releases locks so other collaborators can proceed', () => {
    engine.join('workflow:1', { id: 'u1', name: 'User One' });
    engine.join('workflow:1', { id: 'u2', name: 'User Two' });

    engine.acquireLock('workflow:1', { id: 'u1', name: 'User One' });
    const releaseResult = engine.releaseLock('workflow:1', 'u1');
    expect(releaseResult.success).toBe(true);
    expect(engine.getLock('workflow:1')).toBeNull();

    const secondLock = engine.acquireLock('workflow:1', { id: 'u2', name: 'User Two' });
    expect(secondLock.success).toBe(true);
    expect(engine.getLock('workflow:1')?.userId).toBe('u2');
  });
});
