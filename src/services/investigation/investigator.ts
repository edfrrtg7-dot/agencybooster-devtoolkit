import type {
  InvestigationConfig,
  InvestigationProfile,
  InvestigationReport,
  TraceReport,
  ConfidenceSummary,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import { investigateDOM } from "./dom-module";
import { investigateRuntime } from "./runtime-module";
import { investigateStorage } from "./storage-module";
import { detectRelationships } from "./relationships";
import { selectAnchors } from "./anchor-selector";
import { traceRuntime } from "./runtime-trace";
import { correlateStorage } from "./storage-correlation";
import { buildTraceRelationships, classifyConfidence } from "./trace-confidence";

export class RuntimeInvestigator {
  private config: InvestigationConfig;

  constructor(config?: Partial<InvestigationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateConfig(config: Partial<InvestigationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): InvestigationConfig {
    return this.config;
  }

  run(
    profile: InvestigationProfile,
    pageUrl: string,
  ): InvestigationReport {
    const start = performance.now();
    let truncated = false;
    let truncationReason = "";

    const domResult = profile.enabledModules.includes("dom")
      ? investigateDOM(profile.keywords, this.config)
      : { matches: [], truncated: false };

    const runtimeResult = profile.enabledModules.includes("runtime")
      ? investigateRuntime(profile.keywords, this.config)
      : { matches: [], truncated: false };

    const storageResult = profile.enabledModules.includes("storage")
      ? investigateStorage(profile.keywords, this.config)
      : { matches: [], truncated: false };

    if (domResult.truncated) {
      truncated = true;
      truncationReason += "DOM results truncated. ";
    }
    if (runtimeResult.truncated) {
      truncated = true;
      truncationReason += "Runtime results truncated. ";
    }
    if (storageResult.truncated) {
      truncated = true;
      truncationReason += "Storage results truncated. ";
    }

    const relationships = detectRelationships(
      domResult.matches,
      runtimeResult.matches,
      storageResult.matches,
    );

    const anchors = selectAnchors(domResult.matches);

    let trace: TraceReport;
    if (anchors.length > 0) {
      const runtimeTrace = traceRuntime(
        anchors,
        profile.keywords,
        this.config.maxRecursionDepth,
        this.config.maxObjects,
      );

      const storageCorrelations = correlateStorage(
        anchors,
        runtimeTrace.paths,
        profile.keywords,
        50,
      );

      const traceRelationships = buildTraceRelationships(
        anchors,
        runtimeTrace.paths,
        storageCorrelations,
      );

      const confidenceSummary = classifyConfidence(traceRelationships);

      if (runtimeTrace.truncated) {
        truncated = true;
        truncationReason += "Runtime trace truncated. ";
      }

      trace = {
        anchors,
        runtimePaths: runtimeTrace.paths,
        storageCorrelations,
        relationships: traceRelationships,
        confidenceSummary,
      };
    } else {
      trace = {
        anchors: [],
        runtimePaths: [],
        storageCorrelations: [],
        relationships: [],
        confidenceSummary: { high: 0, medium: 0, low: 0, unverified: 0 },
      };
    }

    const allRelationships = [...relationships, ...trace.relationships];
    const totalSummary: ConfidenceSummary = {
      high: classifyConfidence(allRelationships).high,
      medium: classifyConfidence(allRelationships).medium,
      low: classifyConfidence(allRelationships).low,
      unverified: classifyConfidence(allRelationships).unverified,
    };

    const reportSize = JSON.stringify({
      dom: domResult.matches,
      runtimeObjects: runtimeResult.matches,
      storage: storageResult.matches,
      relationships,
      trace,
    }).length;

    if (reportSize > this.config.maxReportSize) {
      truncated = true;
      truncationReason += `Report size (${reportSize}) exceeds limit. `;
    }

    const duration = performance.now() - start;

    return {
      timestamp: Date.now(),
      page: pageUrl,
      profile: profile.name,
      duration: Math.round(duration * 100) / 100,
      truncated,
      truncationReason: truncationReason.trim(),
      summary: {
        domMatches: domResult.matches.length,
        runtimeMatches: runtimeResult.matches.length,
        storageMatches: storageResult.matches.length,
        relationships: allRelationships.length,
      },
      dom: domResult.matches,
      runtimeObjects: runtimeResult.matches,
      storage: storageResult.matches,
      relationships: allRelationships,
      trace,
    };
  }
}
