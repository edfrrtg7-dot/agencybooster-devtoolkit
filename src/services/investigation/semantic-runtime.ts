import type { RuntimeDiffResult, DiffChange } from "./diff-types";
import type { SemanticEvent, EvidenceItem } from "./semantic-types";

function interpretRuntimeChange(change: DiffChange): { name: string; description: string } {
  if (change.type === "added") {
    return { name: "Object created", description: `Runtime object "${change.path}" created` };
  }
  if (change.type === "removed") {
    return { name: "Object removed", description: `Runtime object "${change.path}" removed` };
  }

  const before = change.before as Record<string, unknown> | undefined;
  const after = change.after as Record<string, unknown> | undefined;
  const beforeType = before?.valueType as string | undefined;
  const afterType = after?.valueType as string | undefined;

  if (beforeType && afterType && beforeType !== afterType) {
    return { name: "Reference replaced", description: `Runtime "${change.path}" type changed: ${beforeType} → ${afterType}` };
  }

  return { name: "Primitive updated", description: `Runtime value "${change.path}" modified` };
}

export function analyzeRuntime(
  runtime: RuntimeDiffResult,
): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let order = 20;

  const allChanges: DiffChange[] = [
    ...runtime.added,
    ...runtime.removed,
    ...runtime.modified,
  ];

  if (allChanges.length === 0) return events;

  if (runtime.added.length > 0 && runtime.removed.length > 0) {
    events.push({
      id: `runtime-replace-${Date.now()}`,
      name: "Reference replaced",
      description: `${runtime.added.length} added, ${runtime.removed.length} removed`,
      confidence: "Medium",
      category: "Runtime",
      evidence: allChanges.slice(0, 5).map((c) => ({
        type: "runtime" as const,
        description: interpretRuntimeChange(c).description,
        path: c.path,
      })),
      timestamp: Date.now(),
      order: order++,
    });
  } else {
    for (const change of allChanges.slice(0, 10)) {
      const { name, description } = interpretRuntimeChange(change);
      events.push({
        id: `runtime-${change.path}-${Date.now()}`,
        name,
        description,
        confidence: "Low",
        category: "Runtime",
        evidence: [{
          type: "runtime",
          description,
          path: change.path,
        }],
        timestamp: Date.now(),
        order: order++,
      });
    }
  }

  return events;
}
