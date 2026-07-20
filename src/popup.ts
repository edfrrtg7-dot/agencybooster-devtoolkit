interface ExplorerStatus {
  name: string;
  running: boolean;
  startedAt: number | null;
}

interface ObsStats {
  total: number;
  perExplorer: Record<string, number>;
  lastTimestamp: number | null;
}

interface RecorderStatus {
  recorderInitialized: boolean;
  eventBusConnected: boolean;
  collectorInitialized: boolean;
}

interface RuntimeInfo {
  extensionVersion: string;
  manifestVersion: number;
  userAgent: string;
  pageUrl: string;
  sessionId: string;
}

interface DiagnosticData {
  explorerStatus: ExplorerStatus[];
  obsStats: ObsStats;
  recorderStatus: RecorderStatus;
  runtimeInfo: RuntimeInfo;
}

function fetchData(): Promise<DiagnosticData | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);
    chrome.runtime.sendMessage({ type: "GET_DATA" }, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError || !response) {
        resolve(null);
        return;
      }
      resolve(response as DiagnosticData);
    });
  });
}

function updateAll(data: DiagnosticData | null) {
  if (!data) {
    setUnavailable();
    return;
  }
  updateExplorers(data.explorerStatus);
  updateObservations(data.obsStats);
  updateRecorder(data.recorderStatus);
  updateRuntime(data.runtimeInfo);
}

function setUnavailable() {
  document.getElementById("explorers")!.innerHTML =
    '<div class="item"><span class="item-value unavail">Content script not connected</span></div>';
  document.getElementById("observations")!.innerHTML =
    '<div class="item"><span class="item-value unavail">Content script not connected</span></div>';
  document.getElementById("recorder")!.innerHTML =
    '<div class="item"><span class="item-value unavail">Content script not connected</span></div>';
}

function updateExplorers(explorers: ExplorerStatus[]) {
  const el = document.getElementById("explorers")!;
  if (!explorers.length) {
    el.innerHTML = '<div class="item"><span class="item-value unavail">No explorers registered</span></div>';
    return;
  }
  el.innerHTML = explorers
    .map((e) => {
      const cls = e.running ? "running" : "stopped";
      const icon = e.running ? "\u2713" : "\u2717";
      const label = e.running ? "Running" : "Stopped";
      return `<div class="item"><span class="item-label">${icon} ${e.name}</span><span class="item-value ${cls}">${label}</span></div>`;
    })
    .join("");
}

function updateObservations(stats: ObsStats) {
  const el = document.getElementById("observations")!;
  const entries = Object.entries(stats.perExplorer);
  const lastTs = stats.lastTimestamp
    ? new Date(stats.lastTimestamp).toLocaleTimeString()
    : "--:--:--";

  let html = `<div class="stat-row total"><span class="stat-label">Total</span><span class="stat-value">${stats.total}</span></div>`;
  html += entries
    .map(
      ([name, count]) =>
        `<div class="stat-row"><span class="stat-label">${name}</span><span class="stat-value">${count}</span></div>`
    )
    .join("");
  html += `<div class="item" style="margin-top:4px"><span class="item-label">Last observation</span><span class="item-value">${lastTs}</span></div>`;
  el.innerHTML = html;
}

function updateRecorder(status: RecorderStatus) {
  const el = document.getElementById("recorder")!;
  const items = [
    { label: "Recorder", ok: status.recorderInitialized },
    { label: "EventBus", ok: status.eventBusConnected },
    { label: "Collectors", ok: status.collectorInitialized },
  ];
  el.innerHTML = items
    .map((i) => {
      const cls = i.ok ? "ok" : "stopped";
      const label = i.ok ? "Running" : "Stopped";
      return `<div class="item"><span class="item-label">${i.label}</span><span class="item-value ${cls}">${label}</span></div>`;
    })
    .join("");
}

function updateRuntime(info: RuntimeInfo) {
  const el = document.getElementById("runtime")!;
  const items = [
    ["Extension", info.extensionVersion],
    ["Manifest V", String(info.manifestVersion)],
    ["Browser", info.userAgent.split(" ").slice(-1)[0] ?? info.userAgent],
    ["Page", truncateUrl(info.pageUrl)],
    ["Session", info.sessionId],
  ];
  el.innerHTML = items
    .map(
      ([label, value]) =>
        `<div class="item"><span class="item-label">${label}</span><span class="item-value">${value}</span></div>`
    )
    .join("");
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url.length > 40 ? url.slice(0, 37) + "..." : url;
  }
}

async function poll() {
  const data = await fetchData();
  updateAll(data);
}

poll();
setInterval(poll, 2000);
