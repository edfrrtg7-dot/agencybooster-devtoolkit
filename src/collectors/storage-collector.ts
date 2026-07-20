import { ObservationType, ObservationSource, Confidence, type CreateObservationInput } from "../core";
import { getPageInfo } from "./page-info";

export interface StorageChangePayload {
  readonly storageType: "localStorage" | "sessionStorage";
  readonly key: string;
  readonly oldValue: string | null;
  readonly newValue: string | null;
}

export function collectStorageChange(change: StorageChangePayload): CreateObservationInput {
  return {
    type: ObservationType.Storage,
    source: ObservationSource.StorageInspector,
    confidence: Confidence.Observed,
    page: getPageInfo(),
    trigger: change.newValue === null ? "remove" : "set",
    payload: change,
  };
}
