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

function deepFreeze<T extends Record<string, unknown>>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value as Record<string, unknown>);
    }
  }
  return obj;
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

  return deepFreeze(observation as unknown as Record<string, unknown>) as unknown as Observation;
}
