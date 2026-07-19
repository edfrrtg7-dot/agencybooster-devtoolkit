import { createObservation, type CreateObservationInput } from "./observation";
import type { Observation } from "./observation-types";
import { ObservationRegistry } from "./observation-registry";
import { EventBus, Events } from "./event-bus";
import { SessionManager } from "./session";

export class ObservationRecorder {
  constructor(
    private readonly registry: ObservationRegistry,
    private readonly eventBus: EventBus,
    private readonly sessionManager: SessionManager
  ) {}

  record(input: CreateObservationInput): Observation {
    let sessionId = input.sessionId;
    if (!sessionId) {
      const currentId = this.sessionManager.getCurrentId();
      if (currentId === "no-session") {
        throw new Error("ObservationRecorder: no active session. Call sessionManager.start() first.");
      }
      sessionId = currentId;
    }
    const observation = createObservation({ ...input, sessionId });
    this.registry.add(observation);
    this.eventBus.emit(Events.ObservationRecorded, { observation });
    return observation;
  }
}
