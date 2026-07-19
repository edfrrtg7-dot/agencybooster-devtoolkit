export interface DOMObservationPayload {
  readonly mutationType: string;
  readonly targetTag: string;
  readonly attributeName?: string;
  readonly addedCount: number;
  readonly removedCount: number;
}

export function processMutationRecord(record: MutationRecord): DOMObservationPayload {
  return {
    mutationType: record.type,
    targetTag: record.target.nodeName?.toLowerCase() ?? "unknown",
    attributeName: record.attributeName ?? undefined,
    addedCount: record.addedNodes.length,
    removedCount: record.removedNodes.length,
  };
}
