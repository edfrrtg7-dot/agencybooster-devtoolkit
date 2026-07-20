import type {
  DOMDiffResult,
  StorageDiffResult,
  RuntimeDiffResult,
  RelationshipDiffResult,
  TraceDiffResult,
  MetadataDiffResult,
  DiffStatistics,
  ExecutiveSummary,
  SummarySection,
  DiffEntry,
  DiffClassification,
} from "./diff-types";

function hasChanges(result: { added: readonly unknown[]; removed: readonly unknown[]; modified?: readonly unknown[] }): boolean {
  return result.added.length > 0 || result.removed.length > 0 || (result.modified !== undefined && result.modified.length > 0);
}

function formatItems(changes: readonly { path: string; detail?: string; before?: unknown; after?: unknown; classification: DiffClassification }[]): string[] {
  return changes.map((c) => {
    const label = c.path.split(".").slice(-1)[0] ?? c.path;
    if (c.detail) return `${label} (${c.detail})`;
    if (c.before !== undefined && c.after !== undefined) return `${label}`;
    if (c.after !== undefined) return `+ ${label}`;
    return `- ${label}`;
  });
}

function buildDOMSummary(dom: DOMDiffResult): SummarySection {
  const items: string[] = [];
  items.push(...formatItems(dom.added));
  items.push(...formatItems(dom.removed));
  items.push(...formatItems(dom.modified));
  return { name: "DOM", changed: items.length > 0, items };
}

function buildStorageSummary(storage: StorageDiffResult): SummarySection {
  const items: string[] = [];
  items.push(...formatItems(storage.addedKeys));
  items.push(...formatItems(storage.removedKeys));
  items.push(...formatItems(storage.changedKeys));
  for (const pd of storage.propertyDiffs) {
    const label = pd.path.split(".").slice(-1)[0] ?? pd.path;
    items.push(`  ${label} changed`);
  }
  return { name: "Storage", changed: items.length > 0, items };
}

function buildRuntimeSummary(runtime: RuntimeDiffResult): SummarySection {
  const items: string[] = [];
  items.push(...formatItems(runtime.added));
  items.push(...formatItems(runtime.removed));
  items.push(...formatItems(runtime.modified));
  return { name: "Runtime", changed: items.length > 0, items };
}

function buildRelationshipSummary(relationships: RelationshipDiffResult): SummarySection {
  const items: string[] = [];
  items.push(...formatItems(relationships.added));
  items.push(...formatItems(relationships.removed));
  items.push(...formatItems(relationships.modified));
  return { name: "Relationships", changed: items.length > 0, items };
}

function buildTraceSummary(trace: TraceDiffResult): SummarySection {
  const items: string[] = [];
  items.push(...formatItems(trace.addedAnchors));
  items.push(...formatItems(trace.removedAnchors));
  items.push(...formatItems(trace.addedPaths));
  items.push(...formatItems(trace.removedPaths));
  items.push(...formatItems(trace.addedCorrelations));
  items.push(...formatItems(trace.removedCorrelations));
  return { name: "Trace", changed: items.length > 0, items };
}

export function buildExecutiveSummary(
  dom: DOMDiffResult,
  storage: StorageDiffResult,
  runtime: RuntimeDiffResult,
  relationships: RelationshipDiffResult,
  trace: TraceDiffResult,
  metadata: MetadataDiffResult,
): ExecutiveSummary {
  const sections: SummarySection[] = [
    buildDOMSummary(dom),
    buildStorageSummary(storage),
    buildRuntimeSummary(runtime),
    buildRelationshipSummary(relationships),
    buildTraceSummary(trace),
  ];

  const hasChanges = sections.some((s) => s.changed) || metadata.meaningfulChanges.length > 0;

  return { sections, hasChanges };
}

export function buildDiffStatistics(
  dom: DOMDiffResult,
  storage: StorageDiffResult,
  runtime: RuntimeDiffResult,
  relationships: RelationshipDiffResult,
  trace: TraceDiffResult,
  metadata: MetadataDiffResult,
): DiffStatistics {
  const traceChanges = trace.addedAnchors.length + trace.removedAnchors.length +
    trace.addedPaths.length + trace.removedPaths.length +
    trace.addedCorrelations.length + trace.removedCorrelations.length;

  return {
    domAdded: dom.added.length,
    domRemoved: dom.removed.length,
    domModified: dom.modified.length,
    storageChangedKeys: storage.changedKeys.length + storage.addedKeys.length + storage.removedKeys.length,
    storageChangedProperties: storage.propertyDiffs.length,
    runtimeChanged: runtime.added.length + runtime.removed.length + runtime.modified.length,
    relationshipAdded: relationships.added.length,
    relationshipRemoved: relationships.removed.length,
    relationshipModified: relationships.modified.length,
    traceChanges,
    metadataChanges: metadata.meaningfulChanges.length,
    noiseIgnored: metadata.noiseIgnored.length,
  };
}

export function buildAllEntries(
  dom: DOMDiffResult,
  storage: StorageDiffResult,
  runtime: RuntimeDiffResult,
  relationships: RelationshipDiffResult,
  metadata: MetadataDiffResult,
): DiffEntry[] {
  const entries: DiffEntry[] = [];

  function toEntry(c: { path: string; classification: DiffClassification; before?: unknown; after?: unknown; detail?: string }, category: string): DiffEntry {
    const raw = (`${c.before !== undefined ? "before" : ""} ${c.after !== undefined ? "after" : ""}`).trim();
    const desc = c.detail ?? (raw || "changed");
    return {
      path: c.path,
      category,
      classification: c.classification,
      description: desc,
      before: c.before ?? null,
      after: c.after ?? null,
    };
  }

  for (const c of dom.added) entries.push(toEntry(c, "DOM"));
  for (const c of dom.removed) entries.push(toEntry(c, "DOM"));
  for (const c of dom.modified) entries.push(toEntry(c, "DOM"));
  for (const c of storage.addedKeys) entries.push(toEntry(c, "Storage"));
  for (const c of storage.removedKeys) entries.push(toEntry(c, "Storage"));
  for (const c of storage.changedKeys) entries.push(toEntry(c, "Storage"));
  for (const c of runtime.added) entries.push(toEntry(c, "Runtime"));
  for (const c of runtime.removed) entries.push(toEntry(c, "Runtime"));
  for (const c of runtime.modified) entries.push(toEntry(c, "Runtime"));
  for (const c of relationships.added) entries.push(toEntry(c, "Relationships"));
  for (const c of relationships.removed) entries.push(toEntry(c, "Relationships"));
  for (const c of relationships.modified) entries.push(toEntry(c, "Relationships"));
  for (const c of metadata.meaningfulChanges) entries.push(toEntry(c, "Metadata"));

  return entries;
}
