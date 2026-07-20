import { createPipeline } from "./setup";
import { DOMExplorer } from "./explorers/dom";
import { StorageExplorer } from "./explorers/storage";
import { NetworkExplorer } from "./explorers/network";
import { RuntimeExplorer } from "./explorers/runtime";
import type { ObservationRegistry } from "./core";

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
  }
});
