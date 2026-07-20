import type { InvestigationConfig, RuntimeMatch } from "./types";

function matchesKeywords(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function previewValue(val: unknown, maxLen = 100): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "function") return `[Function: ${val.name || "anonymous"}]`;
  if (typeof val === "string") return val.length > maxLen ? `"${val.slice(0, maxLen)}..."` : `"${val}"`;
  if (typeof val === "object") {
    try {
      const s = JSON.stringify(val);
      return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
    } catch {
      return "[Circular or unserializable]";
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

interface InspectNode {
  obj: Record<string, unknown>;
  path: string;
  depth: number;
}

export function investigateRuntime(
  keywords: readonly string[],
  config: InvestigationConfig,
): { matches: RuntimeMatch[]; truncated: boolean } {
  const matches: RuntimeMatch[] = [];
  let objectCount = 0;
  let truncated = false;
  const visited = new WeakSet<object>();

  const queue: InspectNode[] = [
    { obj: window as unknown as Record<string, unknown>, path: "window", depth: 0 },
  ];

  while (queue.length > 0) {
    if (objectCount >= config.maxObjects) {
      truncated = true;
      break;
    }

    const { obj, path, depth } = queue.shift()!;

    if (depth > config.maxRecursionDepth) continue;

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
      if (propCount >= config.maxProperties) break;
      if (objectCount >= config.maxObjects) {
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
      const kw = matchesKeywords(combinedText, keywords);

      const type = getValueType(val);
      const isComplex = type === "object" || type === "array";

      if (kw) {
        matches.push({
          path: childPath,
          propertyNames: [key],
          valueType: type,
          preview: previewValue(val),
          matchedKeyword: kw,
        });
      }

      if (isComplex && val !== null && depth < config.maxRecursionDepth) {
        objectCount++;
        queue.push({
          obj: val as Record<string, unknown>,
          path: childPath,
          depth: depth + 1,
        });
      }
    }
  }

  return { matches, truncated };
}
