import { ObservationType, ObservationSource, Confidence, type CreateObservationInput } from "../core";
import { getPageInfo } from "./page-info";

export interface RuntimeSnapshotPayload {
  readonly timestamp: number;
  readonly windowProperties: readonly string[];
  readonly globalObjects: Readonly<Record<string, string>>;
}

export function collectRuntimeSnapshot(): CreateObservationInput {
  const props = Object.getOwnPropertyNames(window);
  const globalObjects: Record<string, string> = {};

  for (const prop of props) {
    try {
      const value = (window as unknown as Record<string, unknown>)[prop];
      if (value !== null && typeof value === "object") {
        globalObjects[prop] =
          (value as { constructor?: { name?: string } }).constructor?.name ?? typeof value;
      }
    } catch {
      // Some properties throw when accessed (e.g. cross-origin frames)
    }
  }

  return {
    type: ObservationType.Runtime,
    source: ObservationSource.RuntimeSpy,
    confidence: Confidence.Verified,
    page: getPageInfo(),
    trigger: "startup",
    payload: {
      timestamp: Date.now(),
      windowProperties: props,
      globalObjects,
    } satisfies RuntimeSnapshotPayload,
  };
}

export function collectNavigation(from: string, to: string): CreateObservationInput {
  return {
    type: ObservationType.Runtime,
    source: ObservationSource.RuntimeSpy,
    confidence: Confidence.Verified,
    page: getPageInfo(),
    trigger: "navigation",
    payload: { from, to },
  };
}

export function collectHistoryChange(): CreateObservationInput {
  return {
    type: ObservationType.Runtime,
    source: ObservationSource.RuntimeSpy,
    confidence: Confidence.Verified,
    page: getPageInfo(),
    trigger: "popstate",
    payload: { url: window.location.href, state: history.state },
  };
}

export function collectHashChange(oldHash: string, newHash: string): CreateObservationInput {
  return {
    type: ObservationType.Runtime,
    source: ObservationSource.RuntimeSpy,
    confidence: Confidence.Verified,
    page: getPageInfo(),
    trigger: "hashchange",
    payload: { oldHash, newHash },
  };
}

export function collectVisibilityChange(visibility: DocumentVisibilityState): CreateObservationInput {
  return {
    type: ObservationType.Runtime,
    source: ObservationSource.RuntimeSpy,
    confidence: Confidence.Verified,
    page: getPageInfo(),
    trigger: "visibilitychange",
    payload: { visibility },
  };
}
