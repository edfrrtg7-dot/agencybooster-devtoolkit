import type { InvestigationConfig, StorageMatch } from "./types";

function matchesKeywords(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

function previewParsed(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const s = JSON.stringify(parsed);
    return s.length > 150 ? s.slice(0, 150) + "..." : s;
  } catch {
    return raw.length > 150 ? raw.slice(0, 150) + "..." : raw;
  }
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

function estimateSize(raw: string): number {
  return new TextEncoder().encode(raw).length;
}

export function investigateStorage(
  keywords: readonly string[],
  config: InvestigationConfig,
): { matches: StorageMatch[]; truncated: boolean } {
  const matches: StorageMatch[] = [];
  const maxMatches = config.maxObjects;
  const keywordsEmpty = keywords.length === 0;

  const storages: Array<{ type: "localStorage" | "sessionStorage"; store: Storage }> = [
    { type: "localStorage", store: localStorage },
    { type: "sessionStorage", store: sessionStorage },
  ];

  for (const { type, store } of storages) {
    if (matches.length >= maxMatches) break;

    for (let i = 0; i < store.length; i++) {
      if (matches.length >= maxMatches) break;

      const key = store.key(i);
      if (!key) continue;

      let raw: string;
      try {
        raw = store.getItem(key) ?? "";
      } catch {
        continue;
      }

      const kw = keywordsEmpty ? (key.length > 0 ? key.slice(0, 20) : null) : matchesKeywords(key + " " + raw, keywords);
      if (!kw) continue;

      matches.push({
        storageType: type,
        key,
        valueType: getValueType(raw),
        size: estimateSize(raw),
        matchedKeyword: kw,
        parsedPreview: previewParsed(raw),
      });
    }
  }

  return { matches, truncated: matches.length >= maxMatches };
}
