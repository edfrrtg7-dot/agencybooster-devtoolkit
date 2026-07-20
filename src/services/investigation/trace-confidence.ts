import type {
  DOMAnchor,
  TraceRuntimePath,
  TraceStorageCorrelation,
  TraceRelationship,
  ConfidenceSummary,
} from "./types";

function hasAnchorId(anchor: DOMAnchor): boolean {
  return anchor.id.length > 0;
}

function hasAnchorDataset(anchor: DOMAnchor): boolean {
  return Object.keys(anchor.dataset).length > 0;
}

function runtimeReferencesAnchor(
  runtimePath: TraceRuntimePath,
  anchor: DOMAnchor,
): boolean {
  const lower = runtimePath.path.toLowerCase();
  if (anchor.id && lower.includes(anchor.id.toLowerCase())) return true;
  if (anchor.matchedKeyword && lower.includes(anchor.matchedKeyword.toLowerCase())) return true;
  for (const cls of anchor.className.split(/\s+/).filter(Boolean)) {
    if (lower.includes(cls.toLowerCase())) return true;
  }
  return false;
}

function storageReferencesAnchor(
  correlation: TraceStorageCorrelation,
  anchor: DOMAnchor,
): boolean {
  if (!correlation.anchorRelation.includes("none")) return true;
  const key = correlation.key.toLowerCase();
  if (anchor.id && key.includes(anchor.id.toLowerCase())) return true;
  return false;
}

function storageReferencesRuntime(
  correlation: TraceStorageCorrelation,
  runtimePaths: readonly TraceRuntimePath[],
): boolean {
  if (!correlation.profileRelation.includes("none")) return true;
  for (const rp of runtimePaths) {
    const leaf = rp.path.split(".").pop()?.toLowerCase();
    if (leaf && correlation.key.toLowerCase().includes(leaf)) return true;
  }
  return false;
}

export function classifyConfidence(
  relationships: readonly TraceRelationship[],
): ConfidenceSummary {
  let high = 0;
  let medium = 0;
  let low = 0;
  let unverified = 0;
  for (const r of relationships) {
    switch (r.confidence) {
      case "High": high++; break;
      case "Medium": medium++; break;
      case "Low": low++; break;
      case "Unverified": unverified++; break;
    }
  }
  return { high, medium, low, unverified } as ConfidenceSummary;
}

export function buildTraceRelationships(
  anchors: readonly DOMAnchor[],
  runtimePaths: readonly TraceRuntimePath[],
  storageCorrelations: readonly TraceStorageCorrelation[],
): TraceRelationship[] {
  const relationships: TraceRelationship[] = [];

  for (const anchor of anchors) {
    for (const rp of runtimePaths) {
      if (runtimeReferencesAnchor(rp, anchor)) {
        const hasId = hasAnchorId(anchor);
        const confidence = hasId ? "High" : "Medium";
        relationships.push({
          source: `DOM ${anchor.selector}`,
          target: `Runtime ${rp.path}`,
          type: "DOM-Runtime",
          confidence,
          detail: rp.anchorRelation,
        });
      } else if (rp.depth <= 2) {
        relationships.push({
          source: `DOM ${anchor.selector}`,
          target: `Runtime ${rp.path}`,
          type: "DOM-Runtime",
          confidence: "Unverified",
          detail: "proximity only",
        });
      }
    }

    for (const sc of storageCorrelations) {
      if (storageReferencesAnchor(sc, anchor)) {
        const hasId = hasAnchorId(anchor) || hasAnchorDataset(anchor);
        const confidence = hasId ? "High" : "Medium";
        relationships.push({
          source: `DOM ${anchor.selector}`,
          target: `Storage "${sc.key}"`,
          type: "DOM-Storage",
          confidence,
          detail: sc.anchorRelation,
        });
      }
    }
  }

  for (const rp of runtimePaths) {
    for (const sc of storageCorrelations) {
      if (storageReferencesRuntime(sc, runtimePaths)) {
        relationships.push({
          source: `Runtime ${rp.path}`,
          target: `Storage "${sc.key}"`,
          type: "Runtime-Storage",
          confidence: "Medium",
          detail: sc.profileRelation,
        });
      }
    }
  }

  for (const sc of storageCorrelations) {
    if (sc.valueType === "object" || sc.valueType === "array") {
      for (const rp of runtimePaths) {
        const leaf = rp.path.split(".").pop()?.toLowerCase();
        if (leaf && sc.key.toLowerCase().includes(leaf)) {
          relationships.push({
            source: `Storage "${sc.key}"`,
            target: `Runtime ${rp.path}`,
            type: "Storage-Runtime",
            confidence: "Low",
            detail: "name similarity",
          });
        }
      }
    }
  }

  return relationships;
}
