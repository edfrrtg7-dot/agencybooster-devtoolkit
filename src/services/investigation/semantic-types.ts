import type { InvestigationDiffReport } from "./diff-types";

export type EventConfidence = "High" | "Medium" | "Low";

export interface EvidenceItem {
  readonly type: "storage" | "dom" | "runtime" | "relationship" | "trace" | "metadata";
  readonly description: string;
  readonly path?: string;
  readonly value?: string;
}

export interface SemanticEvent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly confidence: EventConfidence;
  readonly category: string;
  readonly evidence: readonly EvidenceItem[];
  readonly timestamp: number;
  readonly order: number;
}

export interface FocusContainer {
  readonly selector: string;
  readonly mode: "auto" | "manual";
  readonly label: string;
}

export interface TimelineEntry {
  readonly order: number;
  readonly label: string;
  readonly events: readonly SemanticEvent[];
  readonly isStable: boolean;
}

export interface SemanticReport {
  readonly timestamp: number;
  readonly diffTimestamp: number;
  readonly duration: number;
  readonly events: readonly SemanticEvent[];
  readonly timeline: readonly TimelineEntry[];
  readonly summary: SemanticSummary;
  readonly confidenceDistribution: ConfidenceDistribution;
  readonly ignoredChanges: readonly IgnoredChange[];
  readonly focusedContainers: readonly FocusContainer[];
  readonly statistics: SemanticStatistics;
}

export interface SemanticSummary {
  readonly headline: string;
  readonly actions: readonly string[];
  readonly details: readonly string[];
  readonly noiseIgnored: readonly string[];
}

export interface ConfidenceDistribution {
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

export interface IgnoredChange {
  readonly path: string;
  readonly reason: string;
  readonly category: string;
}

export interface SemanticStatistics {
  readonly semanticEvents: number;
  readonly ignoredChanges: number;
  readonly focusedContainers: number;
  readonly groupedDomChanges: number;
  readonly storageEvents: number;
  readonly runtimeEvents: number;
  readonly analysisDuration: number;
}

export interface SemanticRule {
  readonly name: string;
  readonly profile: string;
  readonly storageMappings: Readonly<Record<string, string>>;
  readonly domPatterns: readonly DomPattern[];
  readonly noisePatterns: readonly string[];
}

export interface DomPattern {
  readonly selector: string;
  readonly label: string;
  readonly keywords: readonly string[];
}
