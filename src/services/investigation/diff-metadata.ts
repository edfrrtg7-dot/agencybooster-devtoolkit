import type { InvestigationReport } from "./types";
import type { MetadataDiffResult, DiffChange, DiffClassification } from "./diff-types";

const NOISE_FIELDS = ["timestamp", "duration", "captureTimestamp", "investigationDuration", "reportVersion"];

function classifyMetadata(field: string): DiffClassification {
  if (field === "profile") return "Informational";
  if (field === "exportPolicy") return "Informational";
  if (field === "configuredLimits") return "Informational";
  return "Informational";
}

export function diffMetadata(
  before: InvestigationReport,
  after: InvestigationReport,
): MetadataDiffResult {
  const meaningfulChanges: DiffChange[] = [];
  const noiseIgnored: string[] = [];

  if (before.profile !== after.profile) {
    meaningfulChanges.push({
      path: "metadata.profile",
      type: "modified",
      classification: classifyMetadata("profile"),
      before: before.profile,
      after: after.profile,
    });
  }

  const bMeta = before.metadata;
  const aMeta = after.metadata;

  if (bMeta.exportPolicy !== aMeta.exportPolicy) {
    meaningfulChanges.push({
      path: "metadata.exportPolicy",
      type: "modified",
      classification: classifyMetadata("exportPolicy"),
      before: bMeta.exportPolicy,
      after: aMeta.exportPolicy,
    });
  }

  if (JSON.stringify(bMeta.configuredLimits) !== JSON.stringify(aMeta.configuredLimits)) {
    meaningfulChanges.push({
      path: "metadata.configuredLimits",
      type: "modified",
      classification: classifyMetadata("configuredLimits"),
      before: bMeta.configuredLimits,
      after: aMeta.configuredLimits,
    });
  }

  if (before.timestamp !== after.timestamp) {
    noiseIgnored.push("captureTimestamp");
  }
  if (Math.abs(before.duration - after.duration) < 100) {
    noiseIgnored.push("investigationDuration (within tolerance)");
  }
  if (bMeta.reportVersion !== aMeta.reportVersion) {
    noiseIgnored.push("reportVersion");
  }

  return { meaningfulChanges, noiseIgnored };
}
