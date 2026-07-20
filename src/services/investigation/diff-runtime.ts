import type { RuntimeMatch } from "./types";
import type { RuntimeDiffResult, DiffChange, DiffClassification } from "./diff-types";

function classifyRuntime(type: "added" | "removed" | "modified"): DiffClassification {
  if (type === "removed") return "Major";
  if (type === "added") return "Minor";
  return "Minor";
}

export function diffRuntime(
  before: readonly RuntimeMatch[],
  after: readonly RuntimeMatch[],
): RuntimeDiffResult {
  const beforeMap = new Map<string, RuntimeMatch>();
  for (const m of before) beforeMap.set(m.path, m);

  const afterMap = new Map<string, RuntimeMatch>();
  for (const m of after) afterMap.set(m.path, m);

  const added: DiffChange[] = [];
  const removed: DiffChange[] = [];
  const modified: DiffChange[] = [];

  for (const [path, afterMatch] of afterMap) {
    const beforeMatch = beforeMap.get(path);
    if (!beforeMatch) {
      added.push({
        path: `runtime.${path}`,
        type: "added",
        classification: classifyRuntime("added"),
        after: { valueType: afterMatch.valueType, preview: afterMatch.preview.slice(0, 100) },
      });
      continue;
    }

    if (beforeMatch.valueType !== afterMatch.valueType || beforeMatch.preview !== afterMatch.preview) {
      modified.push({
        path: `runtime.${path}`,
        type: "modified",
        classification: classifyRuntime("modified"),
        before: { valueType: beforeMatch.valueType, preview: beforeMatch.preview.slice(0, 100) },
        after: { valueType: afterMatch.valueType, preview: afterMatch.preview.slice(0, 100) },
      });
    }
  }

  for (const [path, beforeMatch] of beforeMap) {
    if (!afterMap.has(path)) {
      removed.push({
        path: `runtime.${path}`,
        type: "removed",
        classification: classifyRuntime("removed"),
        before: { valueType: beforeMatch.valueType, preview: beforeMatch.preview.slice(0, 100) },
      });
    }
  }

  return { added, removed, modified };
}
