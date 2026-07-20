import { EventBus, SessionManager, ObservationRegistry, ObservationRecorder } from "./core";

export interface ObservationPipeline {
  eventBus: EventBus;
  sessionManager: SessionManager;
  registry: ObservationRegistry;
  recorder: ObservationRecorder;
}

export function createPipeline(): ObservationPipeline {
  const eventBus = new EventBus();
  const sessionManager = new SessionManager(eventBus);
  const registry = new ObservationRegistry(eventBus);
  const recorder = new ObservationRecorder(registry, eventBus, sessionManager);
  return { eventBus, sessionManager, registry, recorder };
}
