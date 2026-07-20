import type { DOMAnchor, TraceRuntimePath, TraceStorageCorrelation } from "./types";

function matchesKeywords(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function buildAnchorKeys(anchor: DOMAnchor): string[] {
  const keys: string[] = [];
  if (anchor.id) keys.push(anchor.id);
  if (anchor.matchedKeyword) keys.push(anchor.matchedKeyword);
  for (const cls of anchor.className.split(/\s+/).filter(Boolean)) {
    keys.push(cls);
  }
  for (const val of Object.values(anchor.dataset)) {
    if (val) keys.push(val);
  }
  return keys;
}

function buildRuntimeKeys(runtimePaths: readonly TraceRuntimePath[]): string[] {
  const keys: string[] = [];
  for (const rp of runtimePaths) {
    const leaf = rp.path.split(".").pop();
    if (leaf) keys.push(leaf);
  }
  return keys;
}

function detectAnchorRelation(
  key: string,
  anchorKeys: readonly string[],
): string {
  const lower = key.toLowerCase();
  for (const ak of anchorKeys) {
    if (lower.includes(ak.toLowerCase())) return `matches anchor "${ak}"`;
  }
  return "";
}

function detectProfileRelation(
  key: string,
  keywords: readonly string[],
): string {
  const kw = matchesKeywords(key, keywords);
  return kw ? `matches keyword "${kw}"` : "";
}

function detectRuntimeRelation(
  key: string,
  runtimeKeys: readonly string[],
): string {
  const lower = key.toLowerCase();
  for (const rk of runtimeKeys) {
    if (lower.includes(rk.toLowerCase()) || rk.toLowerCase().includes(lower)) {
      return `matches runtime "${rk}"`;
    }
  }
  return "";
}

function getValueType(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return "array";
    if (typeof parsed === "object" && parsed !== null) return "object";
    return typeof parsed;
  } catch {
    return "string";
  }
}

export function correlateStorage(
  anchors: readonly DOMAnchor[],
  runtimePaths: readonly TraceRuntimePath[],
  keywords: readonly string[],
  maxResults: number,
): TraceStorageCorrelation[] {
  const correlations: TraceStorageCorrelation[] = [];
  const anchorKeys = anchors.length > 0 ? buildAnchorKeys(anchors[0]) : [];
  const runtimeKeys = buildRuntimeKeys(runtimePaths);

  const storages: Array<{ type: "localStorage" | "sessionStorage"; store: Storage }> = [
    { type: "localStorage", store: localStorage },
    { type: "sessionStorage", store: sessionStorage },
  ];

  for (const { type, store } of storages) {
    for (let i = 0; i < store.length; i++) {
      if (correlations.length >= maxResults) break;

      const key = store.key(i);
      if (!key) continue;

      const anchorRelation = detectAnchorRelation(key, anchorKeys);
      const profileRelation = detectProfileRelation(key, keywords);
      const runtimeRelation = detectRuntimeRelation(key, runtimeKeys);

      if (!anchorRelation && !profileRelation && !runtimeRelation) continue;

      let raw: string;
      try {
        raw = store.getItem(key) ?? "";
      } catch {
        continue;
      }

      correlations.push({
        storageType: type,
        key,
        valueType: getValueType(raw),
        anchorRelation: anchorRelation || "none",
        profileRelation: profileRelation || runtimeRelation || "none",
      });
    }
  }

  return correlations;
}
