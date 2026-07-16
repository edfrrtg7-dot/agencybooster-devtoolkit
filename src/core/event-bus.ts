export type EventHandler<T = unknown> = (payload: T) => void;

export interface EventBusOptions {
  maxListeners?: number;
}

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();
  private maxListeners: number;

  constructor(options: EventBusOptions = {}) {
    this.maxListeners = options.maxListeners ?? 100;
  }

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;
    if (handlers.size >= this.maxListeners) {
      throw new Error(
        `EventBus: max listeners (${this.maxListeners}) exceeded for event "${event}"`
      );
    }

    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const wrapper: EventHandler<T> = (payload) => {
      unsub();
      handler(payload);
    };
    const unsub = this.on<T>(event, wrapper);
    return unsub;
  }

  emit<T = unknown>(event: string, payload?: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`EventBus: error in handler for "${event}"`, err);
      }
    }
  }

  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}
