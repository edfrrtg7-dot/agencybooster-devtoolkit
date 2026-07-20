import type { DOMDiffResult, DiffChange } from "./diff-types";
import type { SemanticEvent, EvidenceItem } from "./semantic-types";

const STRUCTURAL_TAGS = new Set(["div", "span", "section", "article", "main", "aside", "nav", "header", "footer"]);
const CONTENT_TAGS = new Set(["table", "tbody", "tr", "td", "th", "ul", "ol", "li", "form", "input", "select", "button", "a", "img"]);

function describeDOMChange(change: DiffChange): string {
  const after = change.after as Record<string, unknown> | undefined;
  const before = change.before as Record<string, unknown> | undefined;
  const tag = (after?.tagName ?? before?.tagName) as string | undefined;

  if (change.type === "added") return `${tag ? `<${tag}>` : "Element"} added`;
  if (change.type === "removed") return `${tag ? `<${tag}>` : "Element"} removed`;

  if (change.detail) {
    if (change.detail.includes("text")) return `Text updated on ${tag ? `<${tag}>` : "element"}`;
    if (change.detail.includes("childCount")) return `Content changed on ${tag ? `<${tag}>` : "element"}`;
    if (change.detail.includes("attributes")) return `Attributes changed on ${tag ? `<${tag}>` : "element"}`;
  }

  return `${tag ? `<${tag}>` : "Element"} modified`;
}

function findDeepestMeaningful(changes: readonly DiffChange[]): DiffChange[] {
  const byTag = new Map<string, DiffChange[]>();

  for (const change of changes) {
    const after = change.after as Record<string, unknown> | undefined;
    const before = change.before as Record<string, unknown> | undefined;
    const tag = ((after?.tagName ?? before?.tagName) as string)?.toLowerCase() ?? "unknown";
    const key = tag;
    const arr = byTag.get(key) ?? [];
    arr.push(change);
    byTag.set(key, arr);
  }

  const result: DiffChange[] = [];
  for (const [tag, tagChanges] of byTag) {
    if (CONTENT_TAGS.has(tag)) {
      result.push(tagChanges[0]);
    } else if (STRUCTURAL_TAGS.has(tag) && tagChanges.length <= 2) {
      result.push(tagChanges[0]);
    }
  }

  if (result.length === 0 && changes.length > 0) {
    result.push(changes[0]);
  }

  return result;
}

export function analyzeDOM(
  dom: DOMDiffResult,
): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  const meaningfulAdded = findDeepestMeaningful(dom.added);
  const meaningfulRemoved = findDeepestMeaningful(dom.removed);
  const meaningfulModified = findDeepestMeaningful(dom.modified);

  const totalChanges = dom.added.length + dom.removed.length + dom.modified.length;

  if (meaningfulModified.length > 0) {
    const evidence: EvidenceItem[] = meaningfulModified.map((c) => ({
      type: "dom" as const,
      description: describeDOMChange(c),
      path: c.path,
    }));

    const hasTable = meaningfulModified.some((c) => {
      const tag = ((c.after as Record<string, unknown>)?.tagName ?? (c.before as Record<string, unknown>)?.tagName) as string | undefined;
      return tag?.toLowerCase() === "table";
    });

    const name = hasTable ? "Table rebuilt" : `${meaningfulModified.length} element(s) modified`;

    events.push({
      id: `dom-mod-${Date.now()}`,
      name,
      description: `DOM: ${totalChanges} total mutations, ${meaningfulModified.length} meaningful`,
      confidence: totalChanges > 5 ? "High" : "Medium",
      category: "DOM",
      evidence,
      timestamp: Date.now(),
      order: 1,
    });
  }

  if (meaningfulAdded.length > 0) {
    events.push({
      id: `dom-add-${Date.now()}`,
      name: `${meaningfulAdded.length} element(s) added`,
      description: `DOM: ${meaningfulAdded.length} new elements`,
      confidence: "Medium",
      category: "DOM",
      evidence: meaningfulAdded.map((c) => ({
        type: "dom" as const,
        description: describeDOMChange(c),
        path: c.path,
      })),
      timestamp: Date.now(),
      order: 2,
    });
  }

  if (meaningfulRemoved.length > 0) {
    events.push({
      id: `dom-rem-${Date.now()}`,
      name: `${meaningfulRemoved.length} element(s) removed`,
      description: `DOM: ${meaningfulRemoved.length} elements removed`,
      confidence: "Medium",
      category: "DOM",
      evidence: meaningfulRemoved.map((c) => ({
        type: "dom" as const,
        description: describeDOMChange(c),
        path: c.path,
      })),
      timestamp: Date.now(),
      order: 3,
    });
  }

  return events;
}
