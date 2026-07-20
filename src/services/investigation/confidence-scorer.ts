import type { SemanticEvent, EventConfidence, EvidenceItem } from "./semantic-types";

export function scoreConfidence(event: SemanticEvent): EventConfidence {
  const evidenceCount = event.evidence.length;
  const hasStorage = event.evidence.some((e) => e.type === "storage");
  const hasDom = event.evidence.some((e) => e.type === "dom");
  const hasRuntime = event.evidence.some((e) => e.type === "runtime");
  const hasRelationship = event.evidence.some((e) => e.type === "relationship");

  const signalCount = [hasStorage, hasDom, hasRuntime, hasRelationship].filter(Boolean).length;

  if (signalCount >= 3 || (signalCount >= 2 && evidenceCount >= 5)) return "High";
  if (signalCount >= 2 || evidenceCount >= 3) return "Medium";
  return "Low";
}

export function recalculateConfidence(events: readonly SemanticEvent[]): SemanticEvent[] {
  return events.map((event) => ({
    ...event,
    confidence: scoreConfidence(event),
  }));
}
