export interface InvestigationConfig {
  readonly maxRecursionDepth: number;
  readonly maxObjects: number;
  readonly maxProperties: number;
  readonly maxReportSize: number;
}

export const DEFAULT_CONFIG: InvestigationConfig = {
  maxRecursionDepth: 5,
  maxObjects: 200,
  maxProperties: 50,
  maxReportSize: 100_000,
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
}
