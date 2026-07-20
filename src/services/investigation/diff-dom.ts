import type { DOMMatch } from "./types";
import type { DOMDiffResult, DiffChange } from "./diff-types";

function domKey(match: DOMMatch): string {
  return `${match.tagName}:${match.selector}`;
}

function classifyDOM(type: "added" | "removed" | "modified"): "Major" | "Minor" {
  if (type === "added" || type === "removed") return "Major";
  return "Minor";
}

export function diffDOM(
  before: readonly DOMMatch[],
  after: readonly DOMMatch[],
): DOMDiffResult {
  const beforeMap = new Map<string, DOMMatch>();
  for (const m of before) beforeMap.set(domKey(m), m);

  const afterMap = new Map<string, DOMMatch>();
  for (const m of after) afterMap.set(domKey(m), m);

  const added: DiffChange[] = [];
  const removed: DiffChange[] = [];
  const modified: DiffChange[] = [];

  for (const [key, afterMatch] of afterMap) {
    const beforeMatch = beforeMap.get(key);
    if (!beforeMatch) {
      added.push({
        path: `dom.${key}`,
        type: "added",
        classification: classifyDOM("added"),
        after: { tagName: afterMatch.tagName, text: afterMatch.text.slice(0, 100) },
      });
      continue;
    }

    const changes: string[] = [];
    if (beforeMatch.text !== afterMatch.text) changes.push("text");
    if (beforeMatch.childCount !== afterMatch.childCount) changes.push("childCount");
    if (JSON.stringify(beforeMatch.attributes) !== JSON.stringify(afterMatch.attributes)) changes.push("attributes");

    if (changes.length > 0) {
      modified.push({
        path: `dom.${key}`,
        type: "modified",
        classification: classifyDOM("modified"),
        before: { text: beforeMatch.text.slice(0, 100), childCount: beforeMatch.childCount },
        after: { text: afterMatch.text.slice(0, 100), childCount: afterMatch.childCount },
        detail: `Changed: ${changes.join(", ")}`,
      });
    }
  }

  for (const [key, beforeMatch] of beforeMap) {
    if (!afterMap.has(key)) {
      removed.push({
        path: `dom.${key}`,
        type: "removed",
        classification: classifyDOM("removed"),
        before: { tagName: beforeMatch.tagName, text: beforeMatch.text.slice(0, 100) },
      });
    }
  }

  return { added, removed, modified };
}
