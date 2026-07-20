import type { StorageDiffResult, DiffChange } from "./diff-types";
import type { SemanticEvent, EvidenceItem, SemanticRule } from "./semantic-types";

function extractKeyName(path: string): string {
  const parts = path.split(":");
  return parts.length > 1 ? parts[parts.length - 1] : path.split(".").pop() ?? path;
}

function interpretStorageChange(
  change: DiffChange,
  mappings: Readonly<Record<string, string>>,
): { name: string; description: string } {
  const key = extractKeyName(change.path);
  const mapping = mappings[key];

  if (mapping) {
    return { name: mapping, description: `Storage key "${key}" changed` };
  }

  if (change.type === "added") return { name: `Key "${key}" added`, description: `New storage key "${key}"` };
  if (change.type === "removed") return { name: `Key "${key}" removed`, description: `Storage key "${key}" deleted` };

  return { name: `Key "${key}" modified`, description: `Storage value "${key}" changed` };
}

export function analyzeStorage(
  storage: StorageDiffResult,
  rule: SemanticRule,
): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let order = 10;

  for (const change of storage.changedKeys) {
    const { name, description } = interpretStorageChange(change, rule.storageMappings);
    const evidence: EvidenceItem[] = [{
      type: "storage",
      description,
      path: change.path,
      value: `${change.before} → ${change.after}`,
    }];

    for (const pd of storage.propertyDiffs) {
      if (pd.path.startsWith(extractKeyName(change.path))) {
        evidence.push({
          type: "storage",
          description: `Property "${pd.path.split(".").pop()}" changed`,
          path: pd.path,
        });
      }
    }

    events.push({
      id: `storage-${change.path}-${Date.now()}`,
      name,
      description: `${description}. ${storage.propertyDiffs.length} property-level changes.`,
      confidence: evidence.length > 2 ? "High" : "Medium",
      category: "Storage",
      evidence,
      timestamp: Date.now(),
      order: order++,
    });
  }

  for (const change of storage.addedKeys) {
    const key = extractKeyName(change.path);
    events.push({
      id: `storage-add-${change.path}-${Date.now()}`,
      name: `Storage key "${key}" added`,
      description: `New storage key "${key}" created`,
      confidence: "Medium",
      category: "Storage",
      evidence: [{
        type: "storage",
        description: `New key "${key}"`,
        path: change.path,
      }],
      timestamp: Date.now(),
      order: order++,
    });
  }

  for (const change of storage.removedKeys) {
    const key = extractKeyName(change.path);
    events.push({
      id: `storage-rem-${change.path}-${Date.now()}`,
      name: `Storage key "${key}" removed`,
      description: `Storage key "${key}" deleted`,
      confidence: "High",
      category: "Storage",
      evidence: [{
        type: "storage",
        description: `Key "${key}" removed`,
        path: change.path,
      }],
      timestamp: Date.now(),
      order: order++,
    });
  }

  return events;
}
