import type { TraceReport } from "./types";
import type { TraceDiffResult, DiffChange, DiffClassification } from "./diff-types";

function anchorKey(a: { selector: string; tagName: string }): string {
  return `${a.tagName}:${a.selector}`;
}

function classifyTrace(): DiffClassification {
  return "Minor";
}

export function diffTrace(
  before: TraceReport,
  after: TraceReport,
): TraceDiffResult {
  const beforeAnchors = new Set(before.anchors.map(anchorKey));
  const afterAnchors = new Set(after.anchors.map(anchorKey));
  const addedAnchors: DiffChange[] = [];
  const removedAnchors: DiffChange[] = [];

  for (const key of afterAnchors) {
    if (!beforeAnchors.has(key)) {
      addedAnchors.push({
        path: `trace.anchors.${key}`,
        type: "added",
        classification: classifyTrace(),
        after: key,
      });
    }
  }
  for (const key of beforeAnchors) {
    if (!afterAnchors.has(key)) {
      removedAnchors.push({
        path: `trace.anchors.${key}`,
        type: "removed",
        classification: classifyTrace(),
        before: key,
      });
    }
  }

  const beforePaths = new Set(before.runtimePaths.map((p) => p.path));
  const afterPaths = new Set(after.runtimePaths.map((p) => p.path));
  const addedPaths: DiffChange[] = [];
  const removedPaths: DiffChange[] = [];

  for (const path of afterPaths) {
    if (!beforePaths.has(path)) {
      addedPaths.push({
        path: `trace.runtimePaths.${path}`,
        type: "added",
        classification: classifyTrace(),
        after: path,
      });
    }
  }
  for (const path of beforePaths) {
    if (!afterPaths.has(path)) {
      removedPaths.push({
        path: `trace.runtimePaths.${path}`,
        type: "removed",
        classification: classifyTrace(),
        before: path,
      });
    }
  }

  const beforeCorrs = new Set(before.storageCorrelations.map((c) => `${c.storageType}:${c.key}`));
  const afterCorrs = new Set(after.storageCorrelations.map((c) => `${c.storageType}:${c.key}`));
  const addedCorrelations: DiffChange[] = [];
  const removedCorrelations: DiffChange[] = [];

  for (const key of afterCorrs) {
    if (!beforeCorrs.has(key)) {
      addedCorrelations.push({
        path: `trace.correlations.${key}`,
        type: "added",
        classification: classifyTrace(),
        after: key,
      });
    }
  }
  for (const key of beforeCorrs) {
    if (!afterCorrs.has(key)) {
      removedCorrelations.push({
        path: `trace.correlations.${key}`,
        type: "removed",
        classification: classifyTrace(),
        before: key,
      });
    }
  }

  return {
    addedAnchors,
    removedAnchors,
    addedPaths,
    removedPaths,
    addedCorrelations,
    removedCorrelations,
  };
}
