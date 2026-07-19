import type {
  Observation,
  ObservationType,
  ObservationSource,
  Confidence,
  ObservationPage,
} from "./observation-types";
import type { Entity } from "./entity";

export const SCHEMA_VERSION = 1;

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CreateObservationInput {
  type: ObservationType;
  source: ObservationSource;
  confidence?: Confidence;
  page: ObservationPage;
  entity?: Entity;
  trigger?: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
  id?: string;
  timestamp?: number;
  sessionId?: string;
  schemaVersion?: number;
}

export function createObservation(input: CreateObservationInput): Observation {
  const observation: Observation = {
    id: input.id ?? generateId(),
    schemaVersion: input.schemaVersion ?? SCHEMA_VERSION,
    sessionId: input.sessionId ?? "",
    timestamp: input.timestamp ?? Date.now(),
    type: input.type,
    source: input.source,
    confidence: input.confidence ?? ("Unknown" as Confidence),
    page: input.page,
    entity: input.entity,
    trigger: input.trigger,
    payload: input.payload,
    metadata: input.metadata,
  };

  return Object.freeze(observation);
}
