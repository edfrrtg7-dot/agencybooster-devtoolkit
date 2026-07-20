import type {
  InvestigationConfig,
  InvestigationProfile,
  InvestigationReport,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import { investigateDOM } from "./dom-module";
import { investigateRuntime } from "./runtime-module";
import { investigateStorage } from "./storage-module";
import { detectRelationships } from "./relationships";

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

    const reportSize = JSON.stringify({
      dom: domResult.matches,
      runtimeObjects: runtimeResult.matches,
      storage: storageResult.matches,
      relationships,
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
        relationships: relationships.length,
      },
      dom: domResult.matches,
      runtimeObjects: runtimeResult.matches,
      storage: storageResult.matches,
      relationships,
    };
  }
}
