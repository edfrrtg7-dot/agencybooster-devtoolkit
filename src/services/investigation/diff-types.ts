import type { InvestigationReport } from "./types";

export type DiffClassification = "Critical" | "Major" | "Minor" | "Informational";

export interface DiffEntry {
  readonly path: string;
  readonly category: string;
  readonly classification: DiffClassification;
  readonly description: string;
  readonly before: unknown;
  readonly after: unknown;
}

export interface DiffChange {
  readonly path: string;
  readonly type: "added" | "removed" | "modified";
  readonly classification: DiffClassification;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly detail?: string;
}

export interface DOMDiffResult {
  readonly added: readonly DiffChange[];
  readonly removed: readonly DiffChange[];
  readonly modified: readonly DiffChange[];
}

export interface StoragePropertyDiff {
  readonly path: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly classification: DiffClassification;
}

export interface StorageDiffResult {
  readonly addedKeys: readonly DiffChange[];
  readonly removedKeys: readonly DiffChange[];
  readonly changedKeys: readonly DiffChange[];
  readonly propertyDiffs: readonly StoragePropertyDiff[];
}

export interface RuntimeDiffResult {
  readonly added: readonly DiffChange[];
  readonly removed: readonly DiffChange[];
  readonly modified: readonly DiffChange[];
}

export interface RelationshipDiffResult {
  readonly added: readonly DiffChange[];
  readonly removed: readonly DiffChange[];
  readonly modified: readonly DiffChange[];
}

export interface TraceDiffResult {
  readonly addedAnchors: readonly DiffChange[];
  readonly removedAnchors: readonly DiffChange[];
  readonly addedPaths: readonly DiffChange[];
  readonly removedPaths: readonly DiffChange[];
  readonly addedCorrelations: readonly DiffChange[];
  readonly removedCorrelations: readonly DiffChange[];
}

export interface MetadataDiffResult {
  readonly meaningfulChanges: readonly DiffChange[];
  readonly noiseIgnored: readonly string[];
}

export interface DiffStatistics {
  readonly domAdded: number;
  readonly domRemoved: number;
  readonly domModified: number;
  readonly storageChangedKeys: number;
  readonly storageChangedProperties: number;
  readonly runtimeChanged: number;
  readonly relationshipAdded: number;
  readonly relationshipRemoved: number;
  readonly relationshipModified: number;
  readonly traceChanges: number;
  readonly metadataChanges: number;
  readonly noiseIgnored: number;
}

export interface ExecutiveSummary {
  readonly sections: readonly SummarySection[];
  readonly hasChanges: boolean;
}

export interface SummarySection {
  readonly name: string;
  readonly changed: boolean;
  readonly items: readonly string[];
}

export interface InvestigationDiffReport {
  readonly timestamp: number;
  readonly beforeTimestamp: number;
  readonly afterTimestamp: number;
  readonly beforeProfile: string;
  readonly afterProfile: string;
  readonly dom: DOMDiffResult;
  readonly storage: StorageDiffResult;
  readonly runtime: RuntimeDiffResult;
  readonly relationships: RelationshipDiffResult;
  readonly trace: TraceDiffResult;
  readonly metadata: MetadataDiffResult;
  readonly statistics: DiffStatistics;
  readonly summary: ExecutiveSummary;
  readonly entries: readonly DiffEntry[];
}

export type InvestigationReportLike = InvestigationReport;
