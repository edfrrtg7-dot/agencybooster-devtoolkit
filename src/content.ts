import { createPipeline } from "./setup";
import { DOMExplorer } from "./explorers/dom";
import { StorageExplorer } from "./explorers/storage";
import { NetworkExplorer } from "./explorers/network";
import { RuntimeExplorer } from "./explorers/runtime";
import { StorageSnapshotService } from "./services";
import { getPageInfo } from "./collectors";
import { ObservationType, ObservationSource, Confidence } from "./core";
import type { Observation, ObservationRegistry } from "./core";

const STORAGE_KEY_PREFIX = "chat-sender-";

const { sessionManager, recorder, registry } = createPipeline();
const session = sessionManager.start();

const keyUpdates = new Map<string, number>();
const snapshotService = new StorageSnapshotService();

interface ExplorerEntry {
  name: string;
  running: boolean;
  startedAt: number;
  lastActivityAt: number | null;
  totalObservations: number;
  recentTimestamps: number[];
}

const explorerEntries: ExplorerEntry[] = [];

function registerAndStart(name: string, explorer: { start(): void; stop(): void }) {
  const entry: ExplorerEntry = {
    name,
    running: false,
    startedAt: Date.now(),
    lastActivityAt: null,
    totalObservations: 0,
    recentTimestamps: [],
  };
  explorerEntries.push(entry);
  explorer.start();
  entry.running = true;
  entry.startedAt = Date.now();
}

registerAndStart("Runtime Explorer", new RuntimeExplorer(recorder));
registerAndStart("DOM Explorer", new DOMExplorer(recorder));
registerAndStart("Storage Explorer", new StorageExplorer(recorder, keyUpdates));
registerAndStart("Network Explorer", new NetworkExplorer(recorder));

function recordActivity(source: string) {
  const entry = explorerEntries.find((e) => e.name.includes(source.replace("Spy", "").replace("Inspector", "")));
  if (!entry) return;
  const now = Date.now();
  entry.lastActivityAt = now;
  entry.totalObservations++;
  entry.recentTimestamps.push(now);
  const cutoff = now - 10_000;
  while (entry.recentTimestamps.length > 0 && entry.recentTimestamps[0] < cutoff) {
    entry.recentTimestamps.shift();
  }
}

const originalRecord = recorder.record.bind(recorder);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(recorder as any).record = function (input: any) {
  const obs = originalRecord(input);
  recordActivity(obs.source);
  return obs;
};

function pruneTimestamps() {
  const cutoff = Date.now() - 10_000;
  for (const entry of explorerEntries) {
    while (entry.recentTimestamps.length > 0 && entry.recentTimestamps[0] < cutoff) {
      entry.recentTimestamps.shift();
    }
  }
}

function computeRate(entry: ExplorerEntry): number {
  const cutoff = Date.now() - 10_000;
  const count = entry.recentTimestamps.filter((t) => t >= cutoff).length;
  return count / 10;
}

function computeHealth(entry: ExplorerEntry): string {
  if (!entry.running) return "error";
  if (entry.totalObservations === 0) return "idle";
  if (entry.lastActivityAt !== null && Date.now() - entry.lastActivityAt > 30_000) return "silent";
  return "healthy";
}

function getExplorerStats() {
  pruneTimestamps();
  return explorerEntries.map((e) => ({
    name: e.name,
    running: e.running,
    startedAt: e.startedAt,
    lastActivityAt: e.lastActivityAt,
    totalObservations: e.totalObservations,
    rate: computeRate(e),
    health: computeHealth(e),
  }));
}

function getObsStats(reg: ObservationRegistry) {
  const all = reg.getAll();
  const perExplorer: Record<string, number> = {};
  let lastTimestamp: number | null = null;
  let maxCount = 0;
  let mostActive = "";

  for (const obs of all) {
    const key = obs.source;
    const count = (perExplorer[key] ?? 0) + 1;
    perExplorer[key] = count;
    if (count > maxCount) {
      maxCount = count;
      mostActive = key;
    }
    if (lastTimestamp === null || obs.timestamp > lastTimestamp) {
      lastTimestamp = obs.timestamp;
    }
  }

  pruneTimestamps();
  let globalRate = 0;
  for (const entry of explorerEntries) {
    globalRate += computeRate(entry);
  }

  return { total: reg.count(), perExplorer, lastTimestamp, mostActive, globalRate };
}

function getRecentObs(reg: ObservationRegistry) {
  return reg
    .getAll()
    .slice(-100)
    .reverse()
    .map((obs: Observation) => ({
      timestamp: obs.timestamp,
      source: obs.source,
      type: obs.type,
      summary: summarizeObs(obs),
    }));
}

function summarizeObs(obs: Observation): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = obs.payload as any;
  if (!p) return obs.type;

  switch (obs.type) {
    case "DOM":
      if (p.mutationType === "childList") {
        const parts: string[] = [];
        if (p.addedCount) parts.push(`${p.addedCount} added`);
        if (p.removedCount) parts.push(`${p.removedCount} removed`);
        return `Element ${p.mutationType} (${parts.join(", ")}) <${p.targetTag}>`;
      }
      if (p.mutationType === "attributes") return `Attribute "${p.attributeName}" changed on <${p.targetTag}>`;
      if (p.mutationType === "characterData") return `Text changed on <${p.targetTag}>`;
      return `DOM ${p.mutationType}`;
    case "Storage":
      if (p.newValue === null) return `${p.storageType} removeItem "${p.key}"`;
      return `${p.storageType} setItem "${p.key}"`;
    case "Network":
      return `${p.method} ${p.url}${p.status ? ` (${p.status})` : ""}`;
    case "Runtime":
      if (obs.trigger === "navigation") return `Navigation: ${p.from ?? "?"} → ${p.to ?? "?"}`;
      if (obs.trigger === "popstate") return `History change → ${p.url ?? "?"}`;
      if (obs.trigger === "hashchange") return `Hash changed → ${p.newHash ?? "?"}`;
      if (obs.trigger === "visibilitychange") return `Visibility: ${p.visibility ?? "?"}`;
      return "Runtime initialized";
    case "Custom":
      if (obs.trigger === "snapshot") return `Snapshot captured: "${p.storageKey}" (${p.size} bytes)`;
      if (obs.trigger === "compare") return `Comparison: ${p.summary?.fieldsModified ?? 0} modified, ${p.summary?.fieldsAdded ?? 0} added, ${p.summary?.fieldsRemoved ?? 0} removed`;
      return "Custom event";
    default:
      return obs.type;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ type: "PONG", source: "content" });
    return;
  }

  if (message.type === "GET_DATA") {
    sendResponse({
      explorerStats: getExplorerStats(),
      obsStats: getObsStats(registry),
      recorderStatus: {
        recorderInitialized: true,
        eventBusConnected: true,
        collectorInitialized: true,
      },
      runtimeInfo: {
        extensionVersion: "0.1.0",
        manifestVersion: 3,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        sessionId: sessionManager.getCurrentId(),
        sessionStartedAt: session.startedAt,
      },
    });
    return;
  }

  if (message.type === "GET_RECENT_OBS") {
    sendResponse(getRecentObs(registry));
    return;
  }

  if (message.type === "CAPTURE_SNAPSHOT") {
    try {
      const key = snapshotService.findKey(STORAGE_KEY_PREFIX);
      if (!key) {
        sendResponse({ error: `No "${STORAGE_KEY_PREFIX}*" key found in localStorage` });
        return;
      }
      const snapshot = snapshotService.capture(key, window.location.href);
      recorder.record({
        type: ObservationType.Custom,
        source: ObservationSource.StorageInspector,
        confidence: Confidence.Observed,
        page: getPageInfo(),
        trigger: "snapshot",
        payload: { storageKey: snapshot.storageKey, size: snapshot.size, fieldCount: snapshot.fieldCount, snapshotId: snapshot.id },
      });
      sendResponse({ snapshot });
    } catch (err) {
      sendResponse({ error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (message.type === "GET_SNAPSHOT_DATA") {
    const latest = snapshotService.getLatest();
    sendResponse({
      snapshotCount: snapshotService.getCount(),
      latestTimestamp: latest?.timestamp ?? null,
      lastCaptureTime: latest?.timestamp ?? null,
      storageKey: latest?.storageKey ?? null,
      objectSize: latest?.size ?? null,
      diffAvailable: snapshotService.hasDiff(),
    });
    return;
  }

  if (message.type === "EXPORT_LATEST_SNAPSHOT") {
    sendResponse({ text: snapshotService.exportLatest() });
    return;
  }

  if (message.type === "EXPORT_SNAPSHOT_HISTORY") {
    sendResponse({ text: snapshotService.exportHistory() });
    return;
  }

  if (message.type === "COMPARE_SNAPSHOTS") {
    const result = snapshotService.compare();
    if (!result) {
      sendResponse({ error: "Need at least two snapshots to compare" });
      return;
    }
    const report = snapshotService.exportComparison();
    recorder.record({
      type: ObservationType.Custom,
      source: ObservationSource.Unknown,
      confidence: Confidence.Derived,
      page: getPageInfo(),
      trigger: "compare",
      payload: { summary: result.summary, identical: result.identical },
    });
    sendResponse({ text: report, summary: result.summary });
    return;
  }
});
