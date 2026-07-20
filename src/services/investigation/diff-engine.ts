import type { InvestigationReport } from "./types";
import type { InvestigationDiffReport } from "./diff-types";
import { diffDOM } from "./diff-dom";
import { diffStorage } from "./diff-storage";
import { diffRuntime } from "./diff-runtime";
import { diffRelationships } from "./diff-relationships";
import { diffTrace } from "./diff-trace";
import { diffMetadata } from "./diff-metadata";
import { buildExecutiveSummary, buildDiffStatistics, buildAllEntries } from "./diff-summary";

export function diffReports(
  before: InvestigationReport,
  after: InvestigationReport,
): InvestigationDiffReport {
  const dom = diffDOM(before.dom, after.dom);
  const storage = diffStorage(before.storage, after.storage);
  const runtime = diffRuntime(before.runtimeObjects, after.runtimeObjects);
  const relationships = diffRelationships(before.relationships, after.relationships);
  const trace = diffTrace(before.trace, after.trace);
  const metadata = diffMetadata(before, after);

  const summary = buildExecutiveSummary(dom, storage, runtime, relationships, trace, metadata);
  const statistics = buildDiffStatistics(dom, storage, runtime, relationships, trace, metadata);
  const entries = buildAllEntries(dom, storage, runtime, relationships, metadata);

  return {
    timestamp: Date.now(),
    beforeTimestamp: before.timestamp,
    afterTimestamp: after.timestamp,
    beforeProfile: before.profile,
    afterProfile: after.profile,
    dom,
    storage,
    runtime,
    relationships,
    trace,
    metadata,
    statistics,
    summary,
    entries,
  };
}
