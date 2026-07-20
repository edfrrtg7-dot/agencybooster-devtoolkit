import { createPipeline } from "./setup";
import { DOMExplorer } from "./explorers/dom";
import { StorageExplorer } from "./explorers/storage";
import { NetworkExplorer } from "./explorers/network";
import { RuntimeExplorer } from "./explorers/runtime";
import type { Observation, ObservationRegistry } from "./core";

const { sessionManager, recorder, registry } = createPipeline();
sessionManager.start();

interface ExplorerEntry {
  name: string;
  running: boolean;
  startedAt: number | null;
}

const explorerEntries: ExplorerEntry[] = [];

function registerAndStart(name: string, explorer: { start(): void; stop(): void }) {
  const entry: ExplorerEntry = { name, running: false, startedAt: null };
  explorerEntries.push(entry);
  explorer.start();
  entry.running = true;
  entry.startedAt = Date.now();
}

registerAndStart("Runtime Explorer", new RuntimeExplorer(recorder));
registerAndStart("DOM Explorer", new DOMExplorer(recorder));
registerAndStart("Storage Explorer", new StorageExplorer(recorder));
registerAndStart("Network Explorer", new NetworkExplorer(recorder));

function getExplorerStatus() {
  return explorerEntries.map((e) => ({
    name: e.name,
    running: e.running,
    startedAt: e.startedAt,
  }));
}

function getObsStats(reg: ObservationRegistry) {
  const all = reg.getAll();
  const perExplorer: Record<string, number> = {};
  let lastTimestamp: number | null = null;

  for (const obs of all) {
    const key = obs.source;
    perExplorer[key] = (perExplorer[key] ?? 0) + 1;
    if (lastTimestamp === null || obs.timestamp > lastTimestamp) {
      lastTimestamp = obs.timestamp;
    }
  }

  return { total: reg.count(), perExplorer, lastTimestamp };
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
      return "Runtime initialized";
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
      explorerStatus: getExplorerStatus(),
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
      },
    });
    return;
  }

  if (message.type === "GET_RECENT_OBS") {
    sendResponse(getRecentObs(registry));
  }
});
