import { ObservationType, ObservationSource, Confidence, type CreateObservationInput } from "../core";
import { getPageInfo } from "./page-info";

export interface DOMObservationPayload {
  readonly mutationType: string;
  readonly targetTag: string;
  readonly attributeName?: string;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly oldValue?: string;
}

export function collectDOMMutation(record: MutationRecord): CreateObservationInput {
  return {
    type: ObservationType.DOM,
    source: ObservationSource.DOMInspector,
    confidence: Confidence.Observed,
    page: getPageInfo(),
    trigger: record.type,
    payload: {
      mutationType: record.type,
      targetTag: record.target.nodeName?.toLowerCase() ?? "unknown",
      attributeName: record.attributeName ?? undefined,
      addedCount: record.addedNodes.length,
      removedCount: record.removedNodes.length,
      oldValue: record.oldValue ?? undefined,
    } satisfies DOMObservationPayload,
  };
}
