import type { Relationship } from "./types";
import type { RelationshipDiffResult, DiffChange, DiffClassification } from "./diff-types";

function relKey(r: Relationship): string {
  return `${r.source}|${r.target}`;
}

function classifyRelationship(type: "added" | "removed" | "modified"): DiffClassification {
  if (type === "removed") return "Major";
  if (type === "added") return "Minor";
  return "Minor";
}

export function diffRelationships(
  before: readonly Relationship[],
  after: readonly Relationship[],
): RelationshipDiffResult {
  const beforeMap = new Map<string, Relationship>();
  for (const r of before) beforeMap.set(relKey(r), r);

  const afterMap = new Map<string, Relationship>();
  for (const r of after) afterMap.set(relKey(r), r);

  const added: DiffChange[] = [];
  const removed: DiffChange[] = [];
  const modified: DiffChange[] = [];

  for (const [key, afterRel] of afterMap) {
    const beforeRel = beforeMap.get(key);
    if (!beforeRel) {
      added.push({
        path: `relationships.${key}`,
        type: "added",
        classification: classifyRelationship("added"),
        after: { type: afterRel.type, confidence: afterRel.confidence },
      });
      continue;
    }

    if (beforeRel.confidence !== afterRel.confidence || beforeRel.type !== afterRel.type) {
      modified.push({
        path: `relationships.${key}`,
        type: "modified",
        classification: classifyRelationship("modified"),
        before: { type: beforeRel.type, confidence: beforeRel.confidence },
        after: { type: afterRel.type, confidence: afterRel.confidence },
        detail: `${beforeRel.confidence} → ${afterRel.confidence}`,
      });
    }
  }

  for (const [key, beforeRel] of beforeMap) {
    if (!afterMap.has(key)) {
      removed.push({
        path: `relationships.${key}`,
        type: "removed",
        classification: classifyRelationship("removed"),
        before: { type: beforeRel.type, confidence: beforeRel.confidence },
      });
    }
  }

  return { added, removed, modified };
}
