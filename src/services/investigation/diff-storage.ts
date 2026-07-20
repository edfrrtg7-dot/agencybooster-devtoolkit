import type { StorageMatch } from "./types";
import type { StorageDiffResult, DiffChange, StoragePropertyDiff, DiffClassification } from "./diff-types";

function storageKey(match: StorageMatch): string {
  return `${match.storageType}:${match.key}`;
}

function classifyStorage(type: "added" | "removed" | "modified"): DiffClassification {
  if (type === "removed") return "Critical";
  if (type === "added") return "Major";
  return "Major";
}

function classifyProperty(): DiffClassification {
  return "Minor";
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      current = isNaN(idx) ? undefined : current[idx];
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

function deepCompare(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();

  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (!deepCompare(aObj[aKeys[i]], bObj[bKeys[i]])) return false;
  }
  return true;
}

function findPropertyDiffs(
  key: string,
  beforeParsed: unknown,
  afterParsed: unknown,
  path: string,
): StoragePropertyDiff[] {
  const diffs: StoragePropertyDiff[] = [];

  if (beforeParsed === null || afterParsed === null) return diffs;
  if (typeof beforeParsed !== "object" || typeof afterParsed !== "object") return diffs;
  if (Array.isArray(beforeParsed) !== Array.isArray(afterParsed)) return diffs;

  const beforeObj = beforeParsed as Record<string, unknown>;
  const afterObj = afterParsed as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const prop of allKeys) {
    const bVal = beforeObj[prop];
    const aVal = afterObj[prop];
    const propPath = `${path}.${prop}`;

    if (prop in beforeObj && !(prop in afterObj)) {
      diffs.push({
        path: propPath,
        before: bVal,
        after: undefined,
        classification: "Critical",
      });
    } else if (!(prop in beforeObj) && prop in afterObj) {
      diffs.push({
        path: propPath,
        before: undefined,
        after: aVal,
        classification: "Minor",
      });
    } else if (!deepCompare(bVal, aVal)) {
      diffs.push({
        path: propPath,
        before: bVal,
        after: aVal,
        classification: classifyProperty(),
      });
    }
  }

  return diffs;
}

function tryParse(raw: string): { parsed: unknown; valid: boolean } {
  try {
    return { parsed: JSON.parse(raw), valid: true };
  } catch {
    return { parsed: raw, valid: false };
  }
}

export function diffStorage(
  before: readonly StorageMatch[],
  after: readonly StorageMatch[],
): StorageDiffResult {
  const beforeMap = new Map<string, StorageMatch>();
  for (const m of before) beforeMap.set(storageKey(m), m);

  const afterMap = new Map<string, StorageMatch>();
  for (const m of after) afterMap.set(storageKey(m), m);

  const addedKeys: DiffChange[] = [];
  const removedKeys: DiffChange[] = [];
  const changedKeys: DiffChange[] = [];
  const propertyDiffs: StoragePropertyDiff[] = [];

  for (const [key, afterMatch] of afterMap) {
    const beforeMatch = beforeMap.get(key);
    if (!beforeMatch) {
      addedKeys.push({
        path: `storage.${key}`,
        type: "added",
        classification: classifyStorage("added"),
        after: { size: afterMatch.size, valueType: afterMatch.valueType },
      });
      continue;
    }

    const bParsed = tryParse(beforeMatch.parsedPreview.replace(/\.\.\.$/, ""));
    const aParsed = tryParse(afterMatch.parsedPreview.replace(/\.\.\.$/, ""));

    if (beforeMatch.size !== afterMatch.size ||
        beforeMatch.valueType !== afterMatch.valueType ||
        (bParsed.valid && aParsed.valid && !deepCompare(bParsed.parsed, aParsed.parsed))) {
      changedKeys.push({
        path: `storage.${key}`,
        type: "modified",
        classification: classifyStorage("modified"),
        before: { size: beforeMatch.size, valueType: beforeMatch.valueType },
        after: { size: afterMatch.size, valueType: afterMatch.valueType },
      });

      if (bParsed.valid && aParsed.valid) {
        const propDiffs = findPropertyDiffs(key, bParsed.parsed, aParsed.parsed, key);
        propertyDiffs.push(...propDiffs);
      }
    }
  }

  for (const [key, beforeMatch] of beforeMap) {
    if (!afterMap.has(key)) {
      removedKeys.push({
        path: `storage.${key}`,
        type: "removed",
        classification: classifyStorage("removed"),
        before: { size: beforeMatch.size, valueType: beforeMatch.valueType },
      });
    }
  }

  return { addedKeys, removedKeys, changedKeys, propertyDiffs };
}
