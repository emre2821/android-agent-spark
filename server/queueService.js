import { randomUUID } from 'crypto';

class InMemoryQueueService {
  constructor() {
    this.subscriptions = new Map();
  }

  subscribe(queueName, handler) {
    const id = randomUUID();
    const normalized = queueName || 'default';
    if (!this.subscriptions.has(normalized)) {
      this.subscriptions.set(normalized, new Map());
    }
    const bucket = this.subscriptions.get(normalized);
    bucket.set(id, handler);
    return () => {
      const target = this.subscriptions.get(normalized);
      if (!target) return;
      target.delete(id);
      if (target.size === 0) {
        this.subscriptions.delete(normalized);
      }
    };
  }

  publish(queueName, message) {
    const normalized = queueName || 'default';
    const handlers = this.subscriptions.get(normalized);
    if (!handlers || handlers.size === 0) {
      return;
    }
    // Use for..of instead of forEach for better performance
    for (const handler of handlers.values()) {
      try {
        Promise.resolve(handler(message)).catch((error) => {
          console.error('Queue handler failed', error);
        });
      } catch (error) {
        console.error('Queue handler failed', error);
      }
    }
  }
}

export const queueService = new InMemoryQueueService();
