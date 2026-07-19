import { EventBus, Events } from "./event-bus";

let counter = 0;

function generateSessionId(): string {
  return `session-${Date.now()}-${++counter}`;
}

export interface Session {
  readonly id: string;
  readonly startedAt: number;
  readonly finishedAt?: number;
}

export class SessionManager {
  private current: Session | null = null;

  constructor(private readonly eventBus: EventBus) {}

  start(): Session {
    this.current = Object.freeze({
      id: generateSessionId(),
      startedAt: Date.now(),
    });
    this.eventBus.emit(Events.SessionStarted, { session: this.current });
    return this.current;
  }

  finish(): void {
    if (!this.current) return;
    const finished: Session = Object.freeze({
      ...this.current,
      finishedAt: Date.now(),
    });
    this.current = finished;
    this.eventBus.emit(Events.SessionFinished, { session: finished });
  }

  getCurrent(): Session | null {
    return this.current;
  }

  getCurrentId(): string {
    return this.current?.id ?? "no-session";
  }
}
