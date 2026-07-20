import { diff, formatDiffReport, type DiffResult } from "./object-diff";

const MAX_HISTORY = 20;

export interface StorageSnapshot {
  readonly id: string;
  readonly timestamp: number;
  readonly page: string;
  readonly storageKey: string;
  readonly size: number;
  readonly fieldCount: number;
  readonly state: unknown;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function estimateSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

function countFields(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    let count = value.length;
    for (const item of value) {
      count += countFields(item);
    }
    return count;
  }
  let count = 0;
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    count++;
    count += countFields(obj[key]);
  }
  return count;
}

export class StorageSnapshotService {
  private history: StorageSnapshot[] = [];

  constructor(private readonly keyUpdates: Map<string, number>) {}

  findKey(prefix: string): string | null {
    const matches: Array<{ key: string; lastUpdate: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        matches.push({ key, lastUpdate: this.keyUpdates.get(key) ?? 0 });
      }
    }

    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0].key;

    matches.sort((a, b) => b.lastUpdate - a.lastUpdate);

    if (matches[0].lastUpdate === 0) return null;

    return matches[0].key;
  }

  capture(key: string, pageUrl: string): StorageSnapshot {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      throw new Error(`Key "${key}" not found in localStorage`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse JSON for key "${key}"`);
    }

    const snapshot: StorageSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      page: pageUrl,
      storageKey: key,
      size: estimateSize(parsed),
      fieldCount: countFields(parsed),
      state: parsed,
    };

    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    return snapshot;
  }

  getHistory(): readonly StorageSnapshot[] {
    return this.history;
  }

  getLatest(): StorageSnapshot | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getCount(): number {
    return this.history.length;
  }

  hasDiff(): boolean {
    return this.history.length >= 2;
  }

  compare(): DiffResult | null {
    if (this.history.length < 2) return null;
    const oldSnap = this.history[this.history.length - 2];
    const newSnap = this.history[this.history.length - 1];
    return diff(oldSnap.state, newSnap.state);
  }

  exportLatest(): string {
    const snap = this.getLatest();
    if (!snap) return "No snapshots captured yet.";

    const lines: string[] = [];
    const hr = "-".repeat(40);

    lines.push("Storage Snapshot (Latest)");
    lines.push(hr);
    lines.push(`Timestamp: ${new Date(snap.timestamp).toLocaleString("sv-SE").replace(" ", " ")}`);
    lines.push(`Storage Key: ${snap.storageKey}`);
    lines.push(`Page: ${snap.page}`);
    lines.push(`Object Size: ${snap.size} bytes`);
    lines.push(`Root Fields: ${snap.fieldCount}`);
    lines.push("");
    lines.push("Parsed Object:");
    lines.push(JSON.stringify(snap.state, null, 2));
    lines.push("");
    lines.push(hr);
    lines.push("Exported by AgencyBooster DevToolkit");

    return lines.join("\n");
  }

  exportHistory(): string {
    if (this.history.length === 0) return "No snapshots captured yet.";

    return JSON.stringify(this.history, null, 2);
  }

  exportComparison(): string {
    if (this.history.length < 2) return "Need at least two snapshots to compare.";

    const oldSnap = this.history[this.history.length - 2];
    const newSnap = this.history[this.history.length - 1];
    const result = diff(oldSnap.state, newSnap.state);

    const label1 = `Snapshot ${new Date(oldSnap.timestamp).toLocaleTimeString("en-GB")}`;
    const label2 = `Snapshot ${new Date(newSnap.timestamp).toLocaleTimeString("en-GB")}`;

    return formatDiffReport(result, label1, label2);
  }

  clear(): void {
    this.history = [];
  }
}
