import type { InvestigationDiffReport } from "./diff-types";
import type {
  SemanticReport,
  SemanticEvent,
  FocusContainer,
  SemanticSummary,
  ConfidenceDistribution,
  IgnoredChange,
  SemanticStatistics,
} from "./semantic-types";
import { resolveFocusContainers } from "./focus-containers";
import { detectNoise } from "./noise-detector";
import { analyzeDOM } from "./semantic-dom";
import { analyzeStorage } from "./semantic-storage";
import { analyzeRuntime } from "./semantic-runtime";
import { groupRelatedEvents } from "./change-grouper";
import { recalculateConfidence, scoreConfidence } from "./confidence-scorer";
import { getRule } from "./semantic-rules";
import { buildTimeline } from "./timeline-builder";

function buildSummary(
  events: readonly SemanticEvent[],
  ignored: readonly IgnoredChange[],
  profile: string,
): SemanticSummary {
  const actions = events.map((e) => e.name);
  const details = events.map((e) => e.description);
  const noiseIgnored = ignored.map((i) => `${i.path} (${i.reason})`);

  let headline = "No significant changes detected";
  if (events.length > 0) {
    headline = `${events.length} semantic event(s) detected for ${profile}`;
  }

  return { headline, actions, details, noiseIgnored };
}

function buildConfidenceDistribution(events: readonly SemanticEvent[]): ConfidenceDistribution {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const e of events) {
    if (e.confidence === "High") high++;
    else if (e.confidence === "Medium") medium++;
    else low++;
  }
  return { high, medium, low };
}

export function analyzeSemantics(
  diff: InvestigationDiffReport,
  profile: string,
  manualContainers: readonly string[] = [],
): SemanticReport {
  const start = performance.now();

  const rule = getRule(profile);
  const containers = resolveFocusContainers(diff, manualContainers);
  const ignored = detectNoise(diff);

  const domEvents = analyzeDOM(diff.dom);
  const storageEvents = analyzeStorage(diff.storage, rule);
  const runtimeEvents = analyzeRuntime(diff.runtime);

  const rawEvents = [...domEvents, ...storageEvents, ...runtimeEvents];
  const grouped = groupRelatedEvents(rawEvents);
  const events = recalculateConfidence(grouped);

  const timeline = buildTimeline(events);
  const summary = buildSummary(events, ignored, profile);
  const confidenceDistribution = buildConfidenceDistribution(events);
  const duration = performance.now() - start;

  const statistics: SemanticStatistics = {
    semanticEvents: events.length,
    ignoredChanges: ignored.length,
    focusedContainers: containers.length,
    groupedDomChanges: domEvents.length,
    storageEvents: storageEvents.length,
    runtimeEvents: runtimeEvents.length,
    analysisDuration: Math.round(duration * 100) / 100,
  };

  return {
    timestamp: Date.now(),
    diffTimestamp: diff.timestamp,
    duration: statistics.analysisDuration,
    events,
    timeline,
    summary,
    confidenceDistribution,
    ignoredChanges: ignored,
    focusedContainers: containers,
    statistics,
  };
}
