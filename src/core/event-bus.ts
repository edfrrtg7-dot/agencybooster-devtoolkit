export type EventHandler<T = unknown> = (payload: T) => void;

export const Events = {
  ObservationRecorded: "ObservationRecorded",
  ObservationRemoved: "ObservationRemoved",
  RegistryCleared: "RegistryCleared",
  SessionStarted: "SessionStarted",
  SessionFinished: "SessionFinished",
} as const;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler);
    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<T = unknown>(event: string, payload?: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  off(event: string): void {
    this.listeners.delete(event);
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
