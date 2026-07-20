import type { DOMMatch, RuntimeMatch, StorageMatch, Relationship } from "./types";

export function detectRelationships(
  dom: readonly DOMMatch[],
  runtime: readonly RuntimeMatch[],
  storage: readonly StorageMatch[],
): Relationship[] {
  const relationships: Relationship[] = [];

  for (const d of dom) {
    const domId = d.attributes["id"];
    if (domId) {
      for (const s of storage) {
        if (s.key.includes(domId)) {
          relationships.push({
            source: `DOM #${domId}`,
            target: `Storage "${s.key}"`,
            type: "DOM-Storage",
            confidence: "High",
            detail: `Element #${domId} matches storage key "${s.key}"`,
          });
        }
      }
      for (const r of runtime) {
        if (r.path.includes(domId)) {
          relationships.push({
            source: `DOM #${domId}`,
            target: `Runtime ${r.path}`,
            type: "DOM-Runtime",
            confidence: "Medium",
            detail: `Element #${domId} matches runtime path "${r.path}"`,
          });
        }
      }
    }

    const domClass = d.attributes["class"];
    if (domClass) {
      for (const r of runtime) {
        if (r.path.toLowerCase().includes(domClass.toLowerCase())) {
          relationships.push({
            source: `DOM .${domClass.split(" ")[0]}`,
            target: `Runtime ${r.path}`,
            type: "DOM-Runtime",
            confidence: "Low",
            detail: `CSS class matches runtime path`,
          });
        }
      }
    }
  }

  for (const r of runtime) {
    const rPath = r.path.toLowerCase();
    for (const s of storage) {
      if (s.key.toLowerCase() === rPath.split(".").pop()) {
        relationships.push({
          source: `Runtime ${r.path}`,
          target: `Storage "${s.key}"`,
          type: "Runtime-Storage",
          confidence: "Medium",
          detail: `Runtime property name matches storage key`,
        });
      }
    }
  }

  for (const s of storage) {
    if (s.valueType === "object" || s.valueType === "array") {
      for (const r of runtime) {
        const rLeaf = r.path.split(".").pop()?.toLowerCase();
        if (rLeaf && s.parsedPreview.toLowerCase().includes(rLeaf)) {
          relationships.push({
            source: `Storage "${s.key}"`,
            target: `Runtime ${r.path}`,
            type: "Storage-Runtime",
            confidence: "Low",
            detail: `Storage JSON contains reference to runtime property`,
          });
        }
      }
    }
  }

  for (const d of dom) {
    for (const r of runtime) {
      if (r.preview.includes(d.matchedKeyword)) {
        relationships.push({
          source: `DOM "${d.matchedKeyword}"`,
          target: `Runtime ${r.path}`,
          type: "DOM-Runtime",
          confidence: "Medium",
          detail: `DOM keyword "${d.matchedKeyword}" found in runtime preview`,
        });
      }
    }
  }

  return relationships;
}
