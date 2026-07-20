import type { DOMAnchor, TraceRuntimePath } from "./types";

function matchesKeywords(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function previewValue(val: unknown, maxLen = 80): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "function") return `[Function: ${val.name || "anonymous"}]`;
  if (typeof val === "string") return val.length > maxLen ? `"${val.slice(0, maxLen)}..."` : `"${val}"`;
  if (typeof val === "object") {
    try {
      const s = JSON.stringify(val);
      return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
    } catch {
      return "[Circular]";
    }
  }
  return String(val);
}

function getValueType(val: unknown): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (Array.isArray(val)) return "array";
  if (typeof val === "function") return "function";
  if (typeof val === "object") {
    const name = val?.constructor?.name;
    return name && name !== "Object" ? name : "object";
  }
  return typeof val;
}

interface TraceNode {
  obj: Record<string, unknown>;
  path: string;
  depth: number;
}

function buildAnchorKeywords(anchor: DOMAnchor): string[] {
  const keywords: string[] = [];
  if (anchor.id) keywords.push(anchor.id);
  if (anchor.matchedKeyword) keywords.push(anchor.matchedKeyword);
  for (const cls of anchor.className.split(/\s+/).filter(Boolean)) {
    keywords.push(cls);
  }
  if (anchor.visibleText) {
    const words = anchor.visibleText.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    keywords.push(...words.slice(0, 5));
  }
  for (const val of Object.values(anchor.dataset)) {
    if (val) keywords.push(val);
  }
  return keywords;
}

function detectAnchorRelation(
  val: unknown,
  anchorKeywords: readonly string[],
): string | null {
  if (typeof val === "string") {
    const lower = val.toLowerCase();
    for (const kw of anchorKeywords) {
      if (lower.includes(kw.toLowerCase())) return `contains "${kw}"`;
    }
  }
  if (typeof val === "object" && val !== null && !Array.isArray(val)) {
    const keys = Object.keys(val as Record<string, unknown>);
    for (const key of keys) {
      for (const kw of anchorKeywords) {
        if (key.toLowerCase().includes(kw.toLowerCase())) return `property "${key}" matches`;
      }
    }
  }
  return null;
}

export function traceRuntime(
  anchors: readonly DOMAnchor[],
  keywords: readonly string[],
  maxDepth: number,
  maxObjects: number,
): { paths: TraceRuntimePath[]; truncated: boolean } {
  const paths: TraceRuntimePath[] = [];
  let objectCount = 0;
  let truncated = false;
  const visited = new WeakSet<object>();
  const anchorKeywords = anchors.length > 0 ? buildAnchorKeywords(anchors[0]) : [];
  const allKeywords = [...new Set([...keywords, ...anchorKeywords])];

  const queue: TraceNode[] = [
    { obj: window as unknown as Record<string, unknown>, path: "window", depth: 0 },
  ];

  while (queue.length > 0) {
    if (objectCount >= maxObjects) {
      truncated = true;
      break;
    }

    const { obj, path, depth } = queue.shift()!;

    if (depth > maxDepth) continue;

    try {
      if (visited.has(obj)) continue;
      visited.add(obj);
    } catch {
      continue;
    }

    let propCount = 0;
    let keys: string[];
    try {
      keys = Object.keys(obj);
    } catch {
      continue;
    }

    for (const key of keys) {
      if (propCount >= 30) break;
      if (objectCount >= maxObjects) {
        truncated = true;
        break;
      }

      propCount++;
      const childPath = `${path}.${key}`;
      let val: unknown;
      try {
        val = obj[key];
      } catch {
        continue;
      }

      const combinedText = `${key} ${childPath}`;
      const kw = matchesKeywords(combinedText, allKeywords);
      const anchorRelation = detectAnchorRelation(val, anchorKeywords);

      if (kw || anchorRelation) {
        const type = getValueType(val);
        paths.push({
          path: childPath,
          valueType: type,
          preview: previewValue(val),
          anchorRelation: anchorRelation ?? `keyword "${kw}"`,
          depth,
        });
      }

      const type = getValueType(val);
      if ((type === "object" || type === "array") && val !== null && depth < maxDepth) {
        objectCount++;
        queue.push({
          obj: val as Record<string, unknown>,
          path: childPath,
          depth: depth + 1,
        });
      }
    }
  }

  return { paths, truncated };
}
