import type { SemanticEvent, EvidenceItem } from "./semantic-types";

export function groupRelatedEvents(events: readonly SemanticEvent[]): SemanticEvent[] {
  const storageEvents = events.filter((e) => e.category === "Storage");
  const domEvents = events.filter((e) => e.category === "DOM");
  const runtimeEvents = events.filter((e) => e.category === "Runtime");

  const grouped: SemanticEvent[] = [];

  if (storageEvents.length > 0 && domEvents.length > 0) {
    const allEvidence: EvidenceItem[] = [
      ...storageEvents.flatMap((e) => e.evidence),
      ...domEvents.flatMap((e) => e.evidence),
    ];

    const storageNames = storageEvents.map((e) => e.name).join(", ");
    const domNames = domEvents.map((e) => e.name).join(", ");

    grouped.push({
      id: `grouped-${Date.now()}`,
      name: `Application state changed`,
      description: `Storage: ${storageNames}; DOM: ${domNames}`,
      confidence: "High",
      category: "Grouped",
      evidence: allEvidence,
      timestamp: Date.now(),
      order: 0,
    });
  } else {
    grouped.push(...storageEvents);
    grouped.push(...domEvents);
  }

  grouped.push(...runtimeEvents);

  return grouped;
}
