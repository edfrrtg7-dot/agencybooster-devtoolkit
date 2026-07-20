export interface DiffEntry {
  readonly path: string;
  readonly oldValue: unknown;
  readonly newValue: unknown;
}

export interface DiffSummary {
  readonly fieldsAdded: number;
  readonly fieldsRemoved: number;
  readonly fieldsModified: number;
  readonly arraysModified: number;
}

export interface DiffResult {
  readonly modified: readonly DiffEntry[];
  readonly added: readonly DiffEntry[];
  readonly removed: readonly DiffEntry[];
  readonly summary: DiffSummary;
  readonly identical: boolean;
}

export function diff(oldObj: unknown, newObj: unknown): DiffResult {
  const modified: DiffEntry[] = [];
  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];

  compare(oldObj, newObj, "", modified, added, removed);

  const summary: DiffSummary = {
    fieldsAdded: added.length,
    fieldsRemoved: removed.length,
    fieldsModified: modified.filter((e) => !isContainerChange(e)).length,
    arraysModified: modified.filter((e) => isArrayChange(e)).length,
  };

  return {
    modified,
    added,
    removed,
    summary,
    identical: modified.length === 0 && added.length === 0 && removed.length === 0,
  };
}

function compare(
  oldVal: unknown,
  newVal: unknown,
  path: string,
  modified: DiffEntry[],
  added: DiffEntry[],
  removed: DiffEntry[],
): void {
  if (oldVal === newVal) return;
  if (oldVal === null && newVal === undefined) return;
  if (oldVal === undefined && newVal === null) return;

  const oldType = typeof oldVal;
  const newType = typeof newVal;

  if (oldType !== newType) {
    modified.push({ path: path || "(root)", oldValue: oldVal, newValue: newVal });
    return;
  }

  if (oldVal === null || newVal === undefined || oldVal === undefined) {
    if (oldVal === undefined && newVal !== undefined) {
      added.push({ path: path || "(root)", oldValue: undefined, newValue: newVal });
    } else if (oldVal !== undefined && newVal === undefined) {
      removed.push({ path: path || "(root)", oldValue: oldVal, newValue: undefined });
    } else {
      modified.push({ path: path || "(root)", oldValue: oldVal, newValue: newVal });
    }
    return;
  }

  if (oldType === "object" && oldVal !== null && newVal !== null) {
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      compareArrays(oldVal, newVal, path, modified, added, removed);
      return;
    }
    if (Array.isArray(oldVal) !== Array.isArray(newVal)) {
      modified.push({ path: path || "(root)", oldValue: oldVal, newValue: newVal });
      return;
    }
    compareObjects(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, path, modified, added, removed);
    return;
  }

  if (oldVal !== newVal) {
    modified.push({ path: path || "(root)", oldValue: oldVal, newValue: newVal });
  }
}

function compareObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  path: string,
  modified: DiffEntry[],
  added: DiffEntry[],
  removed: DiffEntry[],
): void {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
  const childPath = path ? `${path}.${key}` : key;
    const oldHas = key in oldObj;
    const newHas = key in newObj;

    if (oldHas && !newHas) {
      removed.push({ path: childPath, oldValue: oldObj[key], newValue: undefined });
    } else if (!oldHas && newHas) {
      added.push({ path: childPath, oldValue: undefined, newValue: newObj[key] });
    } else {
      compare(oldObj[key], newObj[key], childPath, modified, added, removed);
    }
  }
}

function compareArrays(
  oldArr: unknown[],
  newArr: unknown[],
  path: string,
  modified: DiffEntry[],
  added: DiffEntry[],
  removed: DiffEntry[],
): void {
  const maxLen = Math.max(oldArr.length, newArr.length);
  let hasArrayModification = false;

  for (let i = 0; i < maxLen; i++) {
    const childPath = `${path}[${i}]`;
    if (i >= oldArr.length) {
      added.push({ path: childPath, oldValue: undefined, newValue: newArr[i] });
    } else if (i >= newArr.length) {
      removed.push({ path: childPath, oldValue: oldArr[i], newValue: undefined });
    } else {
      const before = modified.length;
      compare(oldArr[i], newArr[i], childPath, modified, added, removed);
      if (modified.length > before) hasArrayModification = true;
    }
  }

  if (hasArrayModification || oldArr.length !== newArr.length) {
    modified.push({ path: path || "(root)", oldValue: oldArr, newValue: newArr });
  }
}

function isContainerChange(entry: DiffEntry): boolean {
  const isArr = Array.isArray(entry.oldValue) || Array.isArray(entry.newValue);
  const isObj =
    (typeof entry.oldValue === "object" && entry.oldValue !== null) ||
    (typeof entry.newValue === "object" && entry.newValue !== null);
  return isArr || isObj;
}

function isArrayChange(entry: DiffEntry): boolean {
  return Array.isArray(entry.oldValue) || Array.isArray(entry.newValue);
}

export function formatDiffReport(result: DiffResult, label1: string, label2: string): string {
  const lines: string[] = [];
  const hr = "-".repeat(40);

  lines.push("Storage Snapshot Comparison");
  lines.push(hr);
  lines.push(`${label1} vs ${label2}`);
  lines.push("");

  if (result.identical) {
    lines.push("No differences found.");
    lines.push("");
    lines.push(hr);
    return lines.join("\n");
  }

  lines.push("Summary");
  lines.push(`  Fields Added: ${result.summary.fieldsAdded}`);
  lines.push(`  Fields Removed: ${result.summary.fieldsRemoved}`);
  lines.push(`  Fields Modified: ${result.summary.fieldsModified}`);
  lines.push(`  Arrays Modified: ${result.summary.arraysModified}`);
  lines.push("");

  if (result.modified.length > 0) {
    lines.push("Modified");
    for (const entry of result.modified) {
      if (isContainerChange(entry) && !isArrayChange(entry)) continue;
      lines.push(`  ${entry.path}`);
      lines.push(`    ${formatValue(entry.oldValue)} → ${formatValue(entry.newValue)}`);
    }
    lines.push("");
  }

  if (result.added.length > 0) {
    lines.push("Added");
    for (const entry of result.added) {
      lines.push(`  ${entry.path}`);
    }
    lines.push("");
  }

  if (result.removed.length > 0) {
    lines.push("Removed");
    for (const entry of result.removed) {
      lines.push(`  ${entry.path}`);
    }
    lines.push("");
  }

  lines.push(hr);
  lines.push("Generated by AgencyBooster DevToolkit");

  return lines.join("\n");
}

function formatValue(val: unknown): string {
  if (val === undefined) return "(undefined)";
  if (val === null) return "(null)";
  if (typeof val === "string") return `"${val}"`;
  if (typeof val === "object") {
    try {
      const s = JSON.stringify(val);
      return s.length > 60 ? s.slice(0, 57) + "..." : s;
    } catch {
      return "[Object]";
    }
  }
  return String(val);
}
