export type ExportPolicyType = "smart" | "full";

export interface ExportLimits {
  readonly maxJsonSize: number;
  readonly maxRecursionDepth: number;
  readonly maxObjectProperties: number;
  readonly maxArrayElements: number;
  readonly maxStringLength: number;
}

export const DEFAULT_EXPORT_LIMITS: ExportLimits = {
  maxJsonSize: 500_000,
  maxRecursionDepth: 8,
  maxObjectProperties: 200,
  maxArrayElements: 100,
  maxStringLength: 10_000,
};

export interface InvestigationConfig {
  readonly maxRecursionDepth: number;
  readonly maxObjects: number;
  readonly maxProperties: number;
  readonly maxReportSize: number;
  readonly exportPolicy: ExportPolicyType;
  readonly exportLimits: ExportLimits;
}

export const DEFAULT_CONFIG: InvestigationConfig = {
  maxRecursionDepth: 5,
  maxObjects: 200,
  maxProperties: 50,
  maxReportSize: 100_000,
  exportPolicy: "smart",
  exportLimits: DEFAULT_EXPORT_LIMITS,
};

export interface InvestigationProfile {
  readonly name: string;
  readonly keywords: readonly string[];
  readonly enabledModules: readonly string[];
}

export interface DOMMatch {
  readonly tagName: string;
  readonly selector: string;
  readonly xpath: string;
  readonly text: string;
  readonly matchedKeyword: string;
  readonly hierarchy: readonly string[];
  readonly parentChain: readonly string[];
  readonly childCount: number;
  readonly attributes: Readonly<Record<string, string>>;
}

export interface RuntimeMatch {
  readonly path: string;
  readonly propertyNames: readonly string[];
  readonly valueType: string;
  readonly preview: string;
  readonly matchedKeyword: string;
}

export interface StorageMatch {
  readonly storageType: "localStorage" | "sessionStorage";
  readonly key: string;
  readonly valueType: string;
  readonly size: number;
  readonly matchedKeyword: string;
  readonly parsedPreview: string;
}

export interface Relationship {
  readonly source: string;
  readonly target: string;
  readonly type: string;
  readonly confidence: "High" | "Medium" | "Low" | "Unverified";
  readonly detail: string;
}

export interface DOMAnchor {
  readonly selector: string;
  readonly xpath: string;
  readonly tagName: string;
  readonly id: string;
  readonly className: string;
  readonly dataset: Readonly<Record<string, string>>;
  readonly hierarchy: readonly string[];
  readonly parentChain: readonly string[];
  readonly siblingBefore: string;
  readonly siblingAfter: string;
  readonly childSummary: string;
  readonly visibleText: string;
  readonly nearbyText: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly matchedKeyword: string;
}

export interface TraceRuntimePath {
  readonly path: string;
  readonly valueType: string;
  readonly preview: string;
  readonly anchorRelation: string;
  readonly depth: number;
}

export interface TraceStorageCorrelation {
  readonly storageType: "localStorage" | "sessionStorage";
  readonly key: string;
  readonly valueType: string;
  readonly anchorRelation: string;
  readonly profileRelation: string;
}

export interface TraceRelationship {
  readonly source: string;
  readonly target: string;
  readonly type: string;
  readonly confidence: "High" | "Medium" | "Low" | "Unverified";
  readonly detail: string;
}

export interface ConfidenceSummary {
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly unverified: number;
}

export interface TraceReport {
  readonly anchors: readonly DOMAnchor[];
  readonly runtimePaths: readonly TraceRuntimePath[];
  readonly storageCorrelations: readonly TraceStorageCorrelation[];
  readonly relationships: readonly TraceRelationship[];
  readonly confidenceSummary: ConfidenceSummary;
}

export interface StorageMetadata {
  readonly storageType: "localStorage" | "sessionStorage";
  readonly key: string;
  readonly valueType: string;
  readonly rawSize: number;
  readonly parsedSize: number;
  readonly isValidJson: boolean;
  readonly rootType: string;
  readonly topLevelPropertyCount: number;
}

export interface TruncationInfo {
  readonly path: string;
  readonly reason: string;
  readonly omittedBytes: number;
  readonly originalSize: number;
  readonly exportedSize: number;
}

export interface SchemaSummary {
  readonly rootType: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly arrayItemSchema?: Readonly<Record<string, string>>;
}

export interface ObjectTreeNode {
  readonly name: string;
  readonly type: string;
  readonly childCount: number;
  readonly children: readonly ObjectTreeNode[];
}

export interface ObjectStatistics {
  readonly objectCount: number;
  readonly arrayCount: number;
  readonly primitiveCount: number;
  readonly stringCount: number;
  readonly numberCount: number;
  readonly booleanCount: number;
  readonly nullCount: number;
  readonly maxDepth: number;
}

export interface EnrichedStorageEntry {
  readonly metadata: StorageMetadata;
  readonly exportedData: unknown;
  readonly schema?: SchemaSummary;
  readonly tree?: ObjectTreeNode;
  readonly statistics?: ObjectStatistics;
  readonly truncations: readonly TruncationInfo[];
}

export interface ReportCompleteness {
  readonly exportedEntries: number;
  readonly truncatedEntries: number;
  readonly omittedEntries: number;
  readonly totalRawBytes: number;
  readonly totalExportedBytes: number;
  readonly totalOmittedBytes: number;
}

export interface InvestigationMetadata {
  readonly exportPolicy: ExportPolicyType;
  readonly reportVersion: string;
  readonly captureTimestamp: number;
  readonly investigationDuration: number;
  readonly pageUrl: string;
  readonly profile: string;
  readonly configuredLimits: ExportLimits;
}

export interface InvestigationReport {
  readonly timestamp: number;
  readonly page: string;
  readonly profile: string;
  readonly duration: number;
  readonly truncated: boolean;
  readonly truncationReason: string;
  readonly summary: {
    readonly domMatches: number;
    readonly runtimeMatches: number;
    readonly storageMatches: number;
    readonly relationships: number;
  };
  readonly dom: readonly DOMMatch[];
  readonly runtimeObjects: readonly RuntimeMatch[];
  readonly storage: readonly StorageMatch[];
  readonly relationships: readonly Relationship[];
  readonly trace: TraceReport;
  readonly enrichedStorage: readonly EnrichedStorageEntry[];
  readonly completeness: ReportCompleteness;
  readonly metadata: InvestigationMetadata;
}
