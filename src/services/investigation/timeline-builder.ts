import type { SemanticEvent, TimelineEntry } from "./semantic-types";

export function buildTimeline(events: readonly SemanticEvent[]): TimelineEntry[] {
  const sorted = [...events].sort((a, b) => a.order - b.order);
  const entries: TimelineEntry[] = [];

  let currentOrder = -1;
  let currentEvents: SemanticEvent[] = [];

  for (const event of sorted) {
    if (event.order !== currentOrder) {
      if (currentEvents.length > 0) {
        entries.push({
          order: currentOrder,
          label: currentEvents.map((e) => e.name).join(", "),
          events: currentEvents,
          isStable: false,
        });
      }
      currentOrder = event.order;
      currentEvents = [event];
    } else {
      currentEvents.push(event);
    }
  }

  if (currentEvents.length > 0) {
    entries.push({
      order: currentOrder,
      label: currentEvents.map((e) => e.name).join(", "),
      events: currentEvents,
      isStable: false,
    });
  }

  entries.push({
    order: currentOrder + 1,
    label: "Stable state",
    events: [],
    isStable: true,
  });

  return entries;
}
