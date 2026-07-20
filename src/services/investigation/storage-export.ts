import type {
  ExportLimits,
  ExportPolicyType,
  StorageMetadata,
  TruncationInfo,
  EnrichedStorageEntry,
  ReportCompleteness,
  InvestigationMetadata,
} from "./types";
import { getPolicy } from "./export-policy";
import { generateSchema } from "./schema-generator";
import { generateObjectTree } from "./object-tree";
import { computeObjectStatistics } from "./object-statistics";

function estimateBytes(str: string): number {
  return new TextEncoder().encode(str).length;
}

function getRootType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function getPropertyCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object" && value !== null) return Object.keys(value as Record<string, unknown>).length;
  return 0;
}

function buildMetadata(
  storageType: "localStorage" | "sessionStorage",
  key: string,
  raw: string,
  parsed: unknown,
): StorageMetadata {
  const rawSize = estimateBytes(raw);
  const parsedSize = estimateBytes(JSON.stringify(parsed));
  const isValidJson = true;
  const rootType = getRootType(parsed);
  const topLevelPropertyCount = getPropertyCount(parsed);

  return {
    storageType,
    key,
    valueType: rootType,
    rawSize,
    parsedSize,
    isValidJson,
    rootType,
    topLevelPropertyCount,
  };
}

function buildMetadataInvalid(
  storageType: "localStorage" | "sessionStorage",
  key: string,
  raw: string,
): StorageMetadata {
  const rawSize = estimateBytes(raw);
  return {
    storageType,
    key,
    valueType: "string",
    rawSize,
    parsedSize: rawSize,
    isValidJson: false,
    rootType: "string",
    topLevelPropertyCount: 0,
  };
}

function deepExport(
  value: unknown,
  limits: ExportLimits,
  depth: number,
  path: string,
  truncations: TruncationInfo[],
): { exported: unknown; truncated: boolean } {
  if (depth > limits.maxRecursionDepth) {
    truncations.push({
      path,
      reason: `Max recursion depth (${limits.maxRecursionDepth}) exceeded`,
      omittedBytes: estimateBytes(JSON.stringify(value)),
      originalSize: estimateBytes(JSON.stringify(value)),
      exportedSize: 0,
    });
    return { exported: "[depth exceeded]", truncated: true };
  }

  if (value === null || value === undefined) {
    return { exported: value, truncated: false };
  }

  if (typeof value === "string") {
    if (value.length > limits.maxStringLength) {
      const omitted = estimateBytes(value.slice(limits.maxStringLength));
      truncations.push({
        path,
        reason: `String length (${value.length}) exceeds max (${limits.maxStringLength})`,
        omittedBytes: omitted,
        originalSize: estimateBytes(value),
        exportedSize: estimateBytes(value.slice(0, limits.maxStringLength)),
      });
      return { exported: value.slice(0, limits.maxStringLength), truncated: true };
    }
    return { exported: value, truncated: false };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { exported: value, truncated: false };
  }

  if (Array.isArray(value)) {
    const limited = value.slice(0, limits.maxArrayElements);
    const truncated = limited.length < value.length;
    const items: unknown[] = [];
    let anyTruncated = false;

    for (let i = 0; i < limited.length; i++) {
      const result = deepExport(limited[i], limits, depth + 1, `${path}[${i}]`, truncations);
      items.push(result.exported);
      if (result.truncated) anyTruncated = true;
    }

    if (truncated) {
      const omitted = estimateBytes(JSON.stringify(value.slice(limits.maxArrayElements)));
      const original = estimateBytes(JSON.stringify(value));
      const exported = estimateBytes(JSON.stringify(items));
      truncations.push({
        path,
        reason: `Array length (${value.length}) exceeds max (${limits.maxArrayElements})`,
        omittedBytes: omitted,
        originalSize: original,
        exportedSize: exported,
      });
    }

    return { exported: items, truncated: truncated || anyTruncated };
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    const limitedKeys = keys.slice(0, limits.maxObjectProperties);
    const truncatedKeys = limitedKeys.length < keys.length;
    const result: Record<string, unknown> = {};
    let anyTruncated = false;

    for (const key of limitedKeys) {
      const child = deepExport((value as Record<string, unknown>)[key], limits, depth + 1, `${path}.${key}`, truncations);
      result[key] = child.exported;
      if (child.truncated) anyTruncated = true;
    }

    if (truncatedKeys) {
      const omittedKeys = keys.slice(limits.maxObjectProperties);
      const omittedBytes = estimateBytes(JSON.stringify(
        Object.fromEntries(omittedKeys.map((k) => [k, (value as Record<string, unknown>)[k]])),
      ));
      const original = estimateBytes(JSON.stringify(value));
      const exported = estimateBytes(JSON.stringify(result));
      truncations.push({
        path,
        reason: `Object properties (${keys.length}) exceed max (${limits.maxObjectProperties})`,
        omittedBytes,
        originalSize: original,
        exportedSize: exported,
      });
    }

    return { exported: result, truncated: truncatedKeys || anyTruncated };
  }

  return { exported: String(value), truncated: false };
}

export function enrichStorageEntry(
  storageType: "localStorage" | "sessionStorage",
  key: string,
  raw: string,
  limits: ExportLimits,
  policy: ExportPolicyType,
): EnrichedStorageEntry {
  const truncations: TruncationInfo[] = [];
  let parsed: unknown;
  let isValidJson = false;

  try {
    parsed = JSON.parse(raw);
    isValidJson = true;
  } catch {
    parsed = raw;
  }

  const metadata = isValidJson
    ? buildMetadata(storageType, key, raw, parsed)
    : buildMetadataInvalid(storageType, key, raw);

  if (!isValidJson) {
    return {
      metadata,
      exportedData: raw,
      truncations,
    };
  }

  const adjustedLimits = policy === "full"
    ? { ...limits, maxJsonSize: limits.maxJsonSize * 4 }
    : limits;

  const rawSize = estimateBytes(raw);
  if (rawSize > adjustedLimits.maxJsonSize) {
    truncations.push({
      path: key,
      reason: `Raw JSON size (${rawSize}) exceeds limit (${adjustedLimits.maxJsonSize})`,
      omittedBytes: 0,
      originalSize: rawSize,
      exportedSize: 0,
    });
  }

  const { exported, truncated } = deepExport(parsed, adjustedLimits, 0, key, truncations);

  const schema = generateSchema(parsed);
  const tree = generateObjectTree(key, parsed);
  const statistics = computeObjectStatistics(parsed, adjustedLimits.maxRecursionDepth);

  return {
    metadata,
    exportedData: exported,
    schema,
    tree,
    statistics,
    truncations,
  };
}

export function buildCompleteness(
  entries: readonly EnrichedStorageEntry[],
  allKeys: number,
): ReportCompleteness {
  let exportedEntries = 0;
  let truncatedEntries = 0;
  let totalRawBytes = 0;
  let totalExportedBytes = 0;
  let totalOmittedBytes = 0;

  for (const entry of entries) {
    exportedEntries++;
    totalRawBytes += entry.metadata.rawSize;
    totalExportedBytes += entry.metadata.parsedSize;

    if (entry.truncations.length > 0) {
      truncatedEntries++;
      for (const t of entry.truncations) {
        totalOmittedBytes += t.omittedBytes;
      }
    }
  }

  return {
    exportedEntries,
    truncatedEntries,
    omittedEntries: allKeys - exportedEntries,
    totalRawBytes,
    totalExportedBytes,
    totalOmittedBytes,
  };
}

export function buildInvestigationMetadata(
  policy: ExportPolicyType,
  duration: number,
  pageUrl: string,
  profileName: string,
): InvestigationMetadata {
  return {
    exportPolicy: policy,
    reportVersion: "1.0.0",
    captureTimestamp: Date.now(),
    investigationDuration: duration,
    pageUrl,
    profile: profileName,
    configuredLimits: getPolicy(policy).limits,
  };
}
