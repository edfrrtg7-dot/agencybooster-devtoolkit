export enum ObservationType {
  Runtime = "Runtime",
  Storage = "Storage",
  Network = "Network",
  DOM = "DOM",
  Event = "Event",
  Custom = "Custom",
}

export enum ObservationSource {
  RuntimeSpy = "RuntimeSpy",
  NetworkSpy = "NetworkSpy",
  DOMInspector = "DOMInspector",
  StorageInspector = "StorageInspector",
  EventSpy = "EventSpy",
  Unknown = "Unknown",
}

export enum Confidence {
  Verified = "Verified",
  Observed = "Observed",
  Derived = "Derived",
  Unknown = "Unknown",
}

export interface ObservationPage {
  readonly url: string;
  readonly title?: string;
}

export interface Observation {
  readonly id: string;
  readonly schemaVersion: number;
  readonly sessionId: string;
  readonly timestamp: number;
  readonly type: ObservationType;
  readonly source: ObservationSource;
  readonly confidence: Confidence;
  readonly page: ObservationPage;
  readonly entity?: Entity;
  readonly trigger?: string;
  readonly payload: unknown;
  readonly metadata?: Record<string, unknown>;
}

import type { Entity } from "./entity";
