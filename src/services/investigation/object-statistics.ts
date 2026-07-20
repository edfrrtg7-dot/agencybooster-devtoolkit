import type { ObjectStatistics } from "./types";

interface StatsAccumulator {
  objectCount: number;
  arrayCount: number;
  primitiveCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
  maxDepth: number;
}

function collectStats(value: unknown, depth: number, acc: StatsAccumulator, maxDepth: number): void {
  if (depth > acc.maxDepth) acc.maxDepth = depth;
  if (depth > maxDepth) return;

  if (value === null) {
    acc.nullCount++;
    acc.primitiveCount++;
    return;
  }

  if (Array.isArray(value)) {
    acc.arrayCount++;
    for (const item of value) {
      collectStats(item, depth + 1, acc, maxDepth);
    }
    return;
  }

  if (typeof value === "object") {
    acc.objectCount++;
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStats(v, depth + 1, acc, maxDepth);
    }
    return;
  }

  acc.primitiveCount++;
  switch (typeof value) {
    case "string": acc.stringCount++; break;
    case "number": acc.numberCount++; break;
    case "boolean": acc.booleanCount++; break;
  }
}

export function computeObjectStatistics(value: unknown, maxDepth: number = 20): ObjectStatistics {
  const acc: StatsAccumulator = {
    objectCount: 0,
    arrayCount: 0,
    primitiveCount: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
    maxDepth: 0,
  };

  collectStats(value, 0, acc, maxDepth);

  return {
    objectCount: acc.objectCount,
    arrayCount: acc.arrayCount,
    primitiveCount: acc.primitiveCount,
    stringCount: acc.stringCount,
    numberCount: acc.numberCount,
    booleanCount: acc.booleanCount,
    nullCount: acc.nullCount,
    maxDepth: acc.maxDepth,
  };
}
