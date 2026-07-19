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
    const observation = createObservation({
      ...input,
      sessionId: input.sessionId ?? this.sessionManager.getCurrentId(),
    });
    this.registry.add(observation);
    this.eventBus.emit(Events.ObservationRecorded, { observation });
    return observation;
  }
}
