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
  updateExplorers(data.explorerStatus);
  updateObservations(data.obsStats);
  updateRecorder(data.recorderStatus);
  updateRuntime(data.runtimeInfo);
}

function setUnavailable() {
  const msg = '<div class="item"><span class="item-value unavail">Content script not connected</span></div>';
  document.getElementById("explorers")!.innerHTML = msg;
  document.getElementById("observations")!.innerHTML = msg;
  document.getElementById("recorder")!.innerHTML = msg;
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

// --- Formatting ---

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

function sourceToExplorer(source: string): string {
  const map: Record<string, string> = {
    RuntimeSpy: "Runtime Explorer",
    DOMInspector: "DOM Explorer",
    StorageInspector: "Storage Explorer",
    NetworkSpy: "Network Explorer",
    EventSpy: "Event Explorer",
  };
  return map[source] ?? source;
}

function obsSummary(obs: RecentObsItem): string {
  if (obs.type === "Runtime") return "Runtime initialized";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = obs as unknown as { summary: string };
  return p.summary || obs.type;
}

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
  for (const e of d.explorerStatus) {
    const icon = e.running ? "\u2713" : "\u2717";
    const status = e.running ? "Running" : "Stopped";
    lines.push(`${icon} ${e.name}`);
    lines.push(`  ${status}`);
  }
  lines.push("");
  lines.push(hr);
  lines.push("Recorder");
  lines.push(`  Recorder: ${d.recorderStatus.recorderInitialized ? "Running" : "Stopped"}`);
  lines.push(`  Collectors: ${d.recorderStatus.collectorInitialized ? "Running" : "Stopped"}`);
  lines.push(`  EventBus: ${d.recorderStatus.eventBusConnected ? "Running" : "Stopped"}`);
  lines.push("");
  lines.push(hr);
  lines.push("Observations");
  lines.push(`  Total: ${d.obsStats.total}`);
  for (const [name, count] of Object.entries(d.obsStats.perExplorer)) {
    lines.push(`  ${name}: ${count}`);
  }
  lines.push(`  Last Observation: ${d.obsStats.lastTimestamp ? tsFull(d.obsStats.lastTimestamp) : "none"}`);
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
    const ts = tsShort(obs.timestamp);
    const explorer = sourceToExplorer(obs.source);
    const summary = obsSummary(obs);

    lines.push(`[${ts}]`);
    lines.push(explorer);
    lines.push(summary);
    if (i < observations.length - 1) lines.push(hr);
  }

  return lines.join("\n");
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
