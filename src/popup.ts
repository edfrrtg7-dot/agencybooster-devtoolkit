interface ExplorerStats {
  name: string;
  running: boolean;
  startedAt: number;
  lastActivityAt: number | null;
  totalObservations: number;
  rate: number;
  health: string;
}

interface ObsStats {
  total: number;
  perExplorer: Record<string, number>;
  lastTimestamp: number | null;
  mostActive: string;
  globalRate: number;
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
  sessionStartedAt: number;
}

interface DiagnosticData {
  explorerStats: ExplorerStats[];
  obsStats: ObsStats;
  recorderStatus: RecorderStatus;
  runtimeInfo: RuntimeInfo;
}

interface RecentObsItem {
  timestamp: number;
  source: string;
  type: string;
  summary: string;
}

let cachedData: DiagnosticData | null = null;

// --- Data Fetching ---

function sendMessage<T>(message: Record<string, unknown>): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError || !response) {
        resolve(null);
        return;
      }
      resolve(response as T);
    });
  });
}

// --- Rendering ---

function updateAll(data: DiagnosticData | null) {
  if (!data) {
    setUnavailable();
    return;
  }
  cachedData = data;
  updateExplorers(data.explorerStats);
  updateObsSummary(data.obsStats);
  updateRecorder(data.recorderStatus);
  updateRuntime(data.runtimeInfo, data.obsStats);
}

function setUnavailable() {
  const msg = '<div class="unavail">Content script not connected</div>';
  document.getElementById("explorers")!.innerHTML = msg;
  document.getElementById("recorder")!.innerHTML = msg;
}

function updateExplorers(stats: ExplorerStats[]) {
  const el = document.getElementById("explorers")!;
  if (!stats.length) {
    el.innerHTML = '<div class="unavail">No explorers registered</div>';
    return;
  }
  el.innerHTML = stats.map(renderExplorerCard).join("");
}

function renderExplorerCard(s: ExplorerStats): string {
  const statusCls = s.running ? "running" : "stopped";
  const statusLabel = s.running ? "Running" : "Stopped";
  const initTime = fmtTime(s.startedAt);
  const lastAct = s.lastActivityAt ? fmtTime(s.lastActivityAt) : "Never";
  const rate = s.rate.toFixed(1);

  return `<div class="explorer-card">
    <div class="explorer-header">
      <div class="health-dot ${s.health}"></div>
      <div class="explorer-name">${s.name}</div>
    </div>
    <div class="explorer-meta">
      <span class="k">Status</span><span class="v ${statusCls}">${statusLabel}</span>
      <span class="k">Initialized</span><span class="v">${initTime}</span>
      <span class="k">Last Activity</span><span class="v">${lastAct}</span>
      <span class="k">Observations</span><span class="v">${s.totalObservations}</span>
      <span class="k">Rate</span><span class="v rate">${rate} obs/sec</span>
    </div>
  </div>`;
}

function updateObsSummary(stats: ObsStats) {
  setText("obs-total", String(stats.total));
  setText("obs-rate", `${stats.globalRate.toFixed(1)} obs/sec`);
  setText("obs-active", stats.mostActive ? sourceToName(stats.mostActive) : "--");
  setText("obs-last", stats.lastTimestamp ? fmtTime(stats.lastTimestamp) : "--");
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
      const cls = i.ok ? "ok" : "err";
      const label = i.ok ? "Running" : "Stopped";
      return `<div class="recorder-item"><span class="k">${i.label}</span><span class="v ${cls}">${label}</span></div>`;
    })
    .join("");
}

function updateRuntime(info: RuntimeInfo, obsStats: ObsStats) {
  const elapsed = Date.now() - info.sessionStartedAt;
  setText("rt-session", fmtDuration(elapsed));
  setText("rt-visibility", document.visibilityState === "visible" ? "Visible" : "Hidden");
  setText("rt-memory", fmtMemory());
  setText("rt-updated", fmtTime(Date.now()));
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// --- Formatting Helpers ---

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtMemory(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (performance as any).memory;
  if (!mem) return "N/A";
  const mb = Math.round(mem.usedJSHeapSize / 1024 / 1024);
  return `${mb} MB`;
}

function sourceToName(source: string): string {
  const map: Record<string, string> = {
    RuntimeSpy: "Runtime Explorer",
    DOMInspector: "DOM Explorer",
    StorageInspector: "Storage Explorer",
    NetworkSpy: "Network Explorer",
    EventSpy: "Event Explorer",
  };
  return map[source] ?? source;
}

function tsShort(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

function tsFull(ms: number): string {
  return new Date(ms).toLocaleString("sv-SE").replace(" ", " ");
}

// --- Clipboard & Toast ---

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function showToast(message: string) {
  const toast = document.getElementById("toast")!;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// --- Export Formatting ---

function formatDiagnostics(d: DiagnosticData): string {
  const lines: string[] = [];
  const hr = "-".repeat(40);
  const NL = "\n";

  lines.push("AgencyBooster DevToolkit Diagnostics");
  lines.push(hr);
  lines.push(`Timestamp: ${tsFull(Date.now())}`);
  lines.push("");
  lines.push("Extension");
  lines.push(`  Version: ${d.runtimeInfo.extensionVersion}`);
  lines.push(`  Manifest: ${d.runtimeInfo.manifestVersion}`);
  lines.push("");
  lines.push(`Browser: ${d.runtimeInfo.userAgent}`);
  lines.push(`Page: ${d.runtimeInfo.pageUrl}`);
  lines.push(`Session: ${d.runtimeInfo.sessionId}`);
  lines.push("");
  lines.push(hr);
  lines.push("Explorers");
  lines.push("");
  for (const e of d.explorerStats) {
    const icon = e.running ? "\u2713" : "\u2717";
    const status = e.running ? "Running" : "Stopped";
    lines.push(`${icon} ${e.name}`);
    lines.push(`  Status: ${status}`);
    lines.push(`  Initialized: ${fmtTime(e.startedAt)}`);
    lines.push(`  Last Activity: ${e.lastActivityAt ? fmtTime(e.lastActivityAt) : "Never"}`);
    lines.push(`  Observations: ${e.totalObservations}`);
    lines.push(`  Rate: ${e.rate.toFixed(1)} obs/sec`);
    lines.push(`  Health: ${e.health}`);
    lines.push("");
  }
  lines.push(hr);
  lines.push("Recorder");
  lines.push(`  Recorder: ${d.recorderStatus.recorderInitialized ? "Running" : "Stopped"}`);
  lines.push(`  Collectors: ${d.recorderStatus.collectorInitialized ? "Running" : "Stopped"}`);
  lines.push(`  EventBus: ${d.recorderStatus.eventBusConnected ? "Running" : "Stopped"}`);
  lines.push("");
  lines.push(hr);
  lines.push("Observations");
  lines.push(`  Total: ${d.obsStats.total}`);
  lines.push(`  Rate: ${d.obsStats.globalRate.toFixed(1)} obs/sec`);
  lines.push(`  Most Active: ${d.obsStats.mostActive ? sourceToName(d.obsStats.mostActive) : "none"}`);
  lines.push(`  Last: ${d.obsStats.lastTimestamp ? tsFull(d.obsStats.lastTimestamp) : "none"}`);
  for (const [name, count] of Object.entries(d.obsStats.perExplorer)) {
    lines.push(`  ${sourceToName(name)}: ${count}`);
  }
  lines.push("");
  lines.push(hr);
  lines.push("Copied from AgencyBooster DevToolkit");

  return lines.join(NL);
}

function formatRecentObs(observations: RecentObsItem[]): string {
  if (!observations.length) return "No observations recorded yet.";

  const lines: string[] = [];
  const hr = "-".repeat(40);

  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i];
    lines.push(`[${tsShort(obs.timestamp)}]`);
    lines.push(sourceToName(obs.source));
    lines.push(obs.summary);
    if (i < observations.length - 1) lines.push(hr);
  }

  return lines.join("\n");
}

// --- Init ---

async function poll() {
  const data = await sendMessage<DiagnosticData>({ type: "GET_DATA" });
  updateAll(data);
}

document.getElementById("btn-copy-diag")!.addEventListener("click", async () => {
  if (!cachedData) {
    showToast("No data available yet.");
    return;
  }
  await copyText(formatDiagnostics(cachedData));
  showToast("Diagnostics copied.");
});

document.getElementById("btn-copy-obs")!.addEventListener("click", async () => {
  const observations = await sendMessage<RecentObsItem[]>({ type: "GET_RECENT_OBS" });
  await copyText(formatRecentObs(observations ?? []));
  showToast("Recent observations copied.");
});

poll();
setInterval(poll, 2000);
