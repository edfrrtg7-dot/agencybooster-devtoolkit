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

interface SnapshotData {
  snapshotCount: number;
  latestTimestamp: number | null;
  lastCaptureTime: number | null;
  storageKey: string | null;
  objectSize: number | null;
  diffAvailable: boolean;
}

interface SnapshotCaptureResult {
  snapshot?: {
    id: string;
    timestamp: number;
    storageKey: string;
    size: number;
    fieldCount: number;
  };
  error?: string;
}

interface SnapshotExportResult {
  text?: string;
  error?: string;
}

interface SnapshotCompareResult {
  text?: string;
  summary?: {
    fieldsAdded: number;
    fieldsRemoved: number;
    fieldsModified: number;
    arraysModified: number;
  };
  error?: string;
}

interface InvestigationData {
  lastRun: number | null;
  duration: number | null;
  profile: string | null;
  domMatches: number;
  runtimeMatches: number;
  storageMatches: number;
  relationships: number;
  reportSize: number;
  traceAnchorCount: number;
  tracePrimaryAnchor: string | null;
  traceRuntimePaths: number;
  traceStorageCorrelations: number;
  traceHighConfidence: number;
  traceLastTime: number | null;
  storageExported: number;
  parsedJsonObjects: number;
  generatedSchemas: number;
  truncatedObjects: number;
  exportPolicy: string;
}

interface InvestigationRunResult {
  report?: {
    timestamp: number;
    profile: string;
    duration: number;
    truncated: boolean;
    summary: {
      domMatches: number;
      runtimeMatches: number;
      storageMatches: number;
      relationships: number;
    };
  };
  error?: string;
}

interface InvestigationExportResult {
  text?: string;
  error?: string;
}

interface DiffData {
  hasDiff: boolean;
  hasChanges: boolean;
  domAdded: number;
  domRemoved: number;
  domModified: number;
  storageChangedKeys: number;
  storageChangedProperties: number;
  runtimeChanged: number;
  relationshipAdded: number;
  relationshipRemoved: number;
  relationshipModified: number;
  traceChanges: number;
  noiseIgnored: number;
  hasBefore: boolean;
  hasAfter: boolean;
}

interface DiffRunResult {
  report?: { summary?: { hasChanges: boolean }; statistics?: Record<string, number> };
  error?: string;
}

interface DiffExportResult {
  text?: string;
  error?: string;
}

interface SemanticData {
  hasReport: boolean;
  events: number;
  ignored: number;
  focusedContainers: number;
  groupedDom: number;
  storageEvents: number;
  runtimeEvents: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  analysisDuration: number;
  headline: string | null;
}

interface SemanticRunResult {
  report?: { statistics?: { semanticEvents: number; ignoredChanges: number; analysisDuration: number }; summary?: { headline: string } };
  error?: string;
}

interface SemanticExportResult {
  text?: string;
  error?: string;
}

let cachedData: DiagnosticData | null = null;
let autoScroll = true;
let firstObsLoad = true;
const seenObs = new Set<string>();
const MAX_VISIBLE = 100;

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

// --- Live Observations ---

function updateLiveObs(observations: RecentObsItem[]) {
  const list = document.getElementById("obs-list")!;
  const empty = list.querySelector(".obs-empty");

  if (firstObsLoad) {
    firstObsLoad = false;
    list.innerHTML = "";
    if (!observations.length) {
      list.innerHTML = '<div class="obs-empty">No observations yet.</div>';
      return;
    }
    for (let i = observations.length - 1; i >= 0; i--) {
      list.appendChild(createObsEl(observations[i]));
      seenObs.add(obsKey(observations[i]));
    }
    trimObsList(list);
    if (autoScroll) list.scrollTop = 0;
    return;
  }

  let added = 0;
  for (let i = observations.length - 1; i >= 0; i--) {
    const obs = observations[i];
    const key = obsKey(obs);
    if (seenObs.has(key)) continue;
    seenObs.add(key);
    const el = createObsEl(obs);
    if (list.firstChild && !list.querySelector(".obs-empty")) {
      list.insertBefore(el, list.firstChild);
    } else {
      list.innerHTML = "";
      list.appendChild(el);
    }
    added++;
  }

  if (added > 0) {
    trimObsList(list);
    if (autoScroll) list.scrollTop = 0;
  }
}

function createObsEl(obs: RecentObsItem): HTMLElement {
  const el = document.createElement("div");
  el.className = "obs-item";
  el.innerHTML = `<div class="obs-ts">${tsShort(obs.timestamp)}</div><div class="obs-source">${sourceToName(obs.source)}</div><div class="obs-summary">${escapeHtml(obs.summary)}</div>`;
  return el;
}

function obsKey(obs: RecentObsItem): string {
  return `${obs.timestamp}:${obs.source}:${obs.type}:${obs.summary}`;
}

function trimObsList(list: HTMLElement) {
  while (list.children.length > MAX_VISIBLE) {
    const last = list.lastElementChild;
    if (last) {
      seenObs.delete(itemKey(last));
      list.removeChild(last);
    }
  }
}

function itemKey(el: Element): string {
  const ts = el.querySelector(".obs-ts")?.textContent ?? "";
  const src = el.querySelector(".obs-source")?.textContent ?? "";
  const sum = el.querySelector(".obs-summary")?.textContent ?? "";
  return `${ts}:${src}:${sum}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clearLiveObs() {
  const list = document.getElementById("obs-list")!;
  list.innerHTML = '<div class="obs-empty">View cleared.</div>';
  seenObs.clear();
  firstObsLoad = true;
}

function setupLiveObsControls() {
  document.getElementById("btn-clear-obs")!.addEventListener("click", clearLiveObs);

  const btn = document.getElementById("btn-auto-scroll")!;
  btn.addEventListener("click", () => {
    autoScroll = !autoScroll;
    btn.classList.toggle("active", autoScroll);
  });
}

// --- Clipboard Buttons ---

function setupClipboardButtons() {
  document.getElementById("btn-copy-diag")!.addEventListener("click", async () => {
    if (!cachedData) {
      showToast("No data available yet");
      return;
    }
    const text = formatDiagnostics(cachedData);
    try {
      const ok = await copyText(text);
      if (ok) {
        showToast("Diagnostics copied.");
      } else {
        showToast("Failed to copy — check clipboard permissions");
        console.error("ABDT: clipboard write failed for diagnostics");
      }
    } catch (err) {
      showToast("Clipboard error — see console");
      console.error("ABDT: clipboard error during diagnostics copy", err);
    }
  });

  document.getElementById("btn-copy-obs")!.addEventListener("click", async () => {
    const obs = await sendMessage<RecentObsItem[]>({ type: "GET_RECENT_OBS" });
    if (!obs || !obs.length) {
      showToast("No observations to copy");
      return;
    }
    const text = formatRecentObs(obs);
    try {
      const ok = await copyText(text);
      if (ok) {
        showToast("Recent observations copied.");
      } else {
        showToast("Failed to copy — check clipboard permissions");
        console.error("ABDT: clipboard write failed for recent observations");
      }
    } catch (err) {
      showToast("Clipboard error — see console");
      console.error("ABDT: clipboard error during observations copy", err);
    }
  });
}

// --- Snapshot UI ---

function updateSnapshotStats(data: SnapshotData | null) {
  if (!data) return;
  setText("snap-latest", data.latestTimestamp ? tsFull(data.latestTimestamp) : "--");
  setText("snap-count", String(data.snapshotCount));
  setText("snap-key", data.storageKey ?? "--");
  setText("snap-size", data.objectSize !== null ? `${data.objectSize} bytes` : "--");
  setText("snap-capture", data.lastCaptureTime ? fmtTime(data.lastCaptureTime) : "--");
  setText("snap-diff", data.diffAvailable ? "Yes" : "No");
}

function setupSnapshotButtons() {
  document.getElementById("btn-capture-snapshot")!.addEventListener("click", async () => {
    const result = await sendMessage<SnapshotCaptureResult>({ type: "CAPTURE_SNAPSHOT" });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    if (result?.snapshot) {
      showToast(`Snapshot captured: ${result.snapshot.storageKey} (${result.snapshot.size} bytes)`);
    }
  });

  document.getElementById("btn-export-snapshot")!.addEventListener("click", async () => {
    const result = await sendMessage<SnapshotExportResult>({ type: "EXPORT_LATEST_SNAPSHOT" });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    if (result?.text) {
      try {
        const ok = await copyText(result.text);
        showToast(ok ? "Latest snapshot copied." : "Failed to copy — check clipboard permissions");
      } catch (err) {
        showToast("Clipboard error — see console");
        console.error("ABDT: clipboard error during snapshot export", err);
      }
    }
  });

  document.getElementById("btn-export-history")!.addEventListener("click", async () => {
    const result = await sendMessage<SnapshotExportResult>({ type: "EXPORT_SNAPSHOT_HISTORY" });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    if (result?.text) {
      try {
        const ok = await copyText(result.text);
        showToast(ok ? "Snapshot history copied." : "Failed to copy — check clipboard permissions");
      } catch (err) {
        showToast("Clipboard error — see console");
        console.error("ABDT: clipboard error during history export", err);
      }
    }
  });

  document.getElementById("btn-compare-snapshots")!.addEventListener("click", async () => {
    const result = await sendMessage<SnapshotCompareResult>({ type: "COMPARE_SNAPSHOTS" });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    if (result?.text) {
      try {
        const ok = await copyText(result.text);
        showToast(ok ? "Comparison copied." : "Failed to copy — check clipboard permissions");
      } catch (err) {
        showToast("Clipboard error — see console");
        console.error("ABDT: clipboard error during comparison export", err);
      }
    }
  });
}

// --- Investigation UI ---

function updateInvestigationStats(data: InvestigationData | null) {
  if (!data) return;
  setText("inv-last", data.lastRun ? tsFull(data.lastRun) : "--");
  setText("inv-duration", data.duration !== null ? `${data.duration}ms` : "--");
  setText("inv-profile", data.profile ?? "--");
  setText("inv-dom", String(data.domMatches));
  setText("inv-runtime", String(data.runtimeMatches));
  setText("inv-storage", String(data.storageMatches));
  setText("inv-relations", String(data.relationships));
  setText("inv-size", data.reportSize > 0 ? `${Math.round(data.reportSize / 1024)}kb` : "--");
  setText("trace-anchors", String(data.traceAnchorCount));
  setText("trace-primary", data.tracePrimaryAnchor ?? "--");
  setText("trace-paths", String(data.traceRuntimePaths));
  setText("trace-correlations", String(data.traceStorageCorrelations));
  setText("trace-high", String(data.traceHighConfidence));
  setText("trace-time", data.traceLastTime ? fmtTime(data.traceLastTime) : "--");
  setText("se-exported", String(data.storageExported));
  setText("se-parsed", String(data.parsedJsonObjects));
  setText("se-schemas", String(data.generatedSchemas));
  setText("se-truncated", String(data.truncatedObjects));
  setText("se-report-size", data.reportSize > 0 ? `${Math.round(data.reportSize / 1024)}kb` : "--");
  setText("se-policy", data.exportPolicy ?? "--");
}

// --- Diff UI ---

function updateDiffStats(data: DiffData | null) {
  if (!data) return;
  setText("diff-before", data.hasBefore ? "Yes" : "No");
  setText("diff-after", data.hasAfter ? "Yes" : "No");
  setText("diff-changes", data.hasChanges ? "Yes" : "No");
  setText("diff-dom", String(data.domAdded + data.domRemoved + data.domModified));
  setText("diff-storage", String(data.storageChangedKeys + data.storageChangedProperties));
  setText("diff-runtime", String(data.runtimeChanged));
  setText("diff-relations", String(data.relationshipAdded + data.relationshipRemoved + data.relationshipModified));
  setText("diff-trace", String(data.traceChanges));
  setText("diff-noise", String(data.noiseIgnored));
}

// --- Semantic Analysis UI ---

function updateSemanticStats(data: SemanticData | null) {
  if (!data) return;
  setText("sem-headline", data.headline ?? "--");
  setText("sem-events", String(data.events));
  setText("sem-ignored", String(data.ignored));
  setText("sem-containers", String(data.focusedContainers));
  setText("sem-grouped-dom", String(data.groupedDom));
  setText("sem-storage-events", String(data.storageEvents));
  setText("sem-runtime-events", String(data.runtimeEvents));
  setText("sem-high", String(data.highConfidence));
  setText("sem-medium", String(data.mediumConfidence));
  setText("sem-low", String(data.lowConfidence));
  setText("sem-duration", data.analysisDuration > 0 ? `${data.analysisDuration}ms` : "--");
}

function setupSemanticButtons() {
  document.getElementById("btn-run-semantic")!.addEventListener("click", async () => {
    const result = await sendMessage<SemanticRunResult>({ type: "RUN_SEMANTIC" });
    if (result?.error) { showToast(result.error); return; }
    if (result?.report?.summary?.headline) {
      showToast(result.report.summary.headline);
    } else {
      showToast("Semantic analysis complete.");
    }
  });

  document.getElementById("btn-export-semantic")!.addEventListener("click", async () => {
    const result = await sendMessage<SemanticExportResult>({ type: "EXPORT_SEMANTIC", format: "detailed" });
    if (result?.error) { showToast(result.error); return; }
    if (result?.text) {
      try {
        const ok = await copyText(result.text);
        showToast(ok ? "Semantic report copied." : "Failed to copy — check clipboard permissions");
      } catch (err) {
        showToast("Clipboard error — see console");
        console.error("ABDT: clipboard error during semantic export", err);
      }
    }
  });
}

function setupDiffButtons() {
  document.getElementById("btn-set-before")!.addEventListener("click", async () => {
    const result = await sendMessage<{ hasBefore?: boolean; error?: string }>({ type: "SET_BEFORE_REPORT" });
    if (result?.error) { showToast(result.error); return; }
    showToast(result?.hasBefore ? "Before report set." : "No investigation report available. Run investigation first.");
  });

  document.getElementById("btn-set-after")!.addEventListener("click", async () => {
    const result = await sendMessage<{ hasAfter?: boolean; error?: string }>({ type: "SET_AFTER_REPORT" });
    if (result?.error) { showToast(result.error); return; }
    showToast(result?.hasAfter ? "After report set." : "No investigation report available. Run investigation first.");
  });

  document.getElementById("btn-run-diff")!.addEventListener("click", async () => {
    const result = await sendMessage<DiffRunResult>({ type: "RUN_DIFF" });
    if (result?.error) { showToast(result.error); return; }
    if (result?.report?.summary?.hasChanges) {
      showToast("Diff complete: changes detected.");
    } else {
      showToast("Diff complete: no changes detected.");
    }
  });

  document.getElementById("btn-export-diff")!.addEventListener("click", async () => {
    const result = await sendMessage<DiffExportResult>({ type: "EXPORT_DIFF" });
    if (result?.error) { showToast(result.error); return; }
    if (result?.text) {
      try {
        const ok = await copyText(result.text);
        showToast(ok ? "Diff report copied." : "Failed to copy — check clipboard permissions");
      } catch (err) {
        showToast("Clipboard error — see console");
        console.error("ABDT: clipboard error during diff export", err);
      }
    }
  });
}

function setupInvestigationButtons() {
  document.getElementById("btn-run-investigation")!.addEventListener("click", async () => {
    const result = await sendMessage<InvestigationRunResult>({ type: "RUN_INVESTIGATION", profile: "Finance" });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    if (result?.report) {
      const s = result.report.summary;
      showToast(`Investigation complete: ${s.domMatches} DOM, ${s.runtimeMatches} runtime, ${s.storageMatches} storage`);
    }
  });

  document.getElementById("btn-export-investigation")!.addEventListener("click", async () => {
    const result = await sendMessage<InvestigationExportResult>({ type: "EXPORT_INVESTIGATION" });
    if (result?.error) {
      showToast(result.error);
      return;
    }
    if (result?.text) {
      try {
        const ok = await copyText(result.text);
        showToast(ok ? "Investigation report copied." : "Failed to copy — check clipboard permissions");
      } catch (err) {
        showToast("Clipboard error — see console");
        console.error("ABDT: clipboard error during investigation export", err);
      }
    }
  });
}

// --- Init ---

async function poll() {
  const data = await sendMessage<DiagnosticData>({ type: "GET_DATA" });
  updateAll(data);
  const obs = await sendMessage<RecentObsItem[]>({ type: "GET_RECENT_OBS" });
  if (obs) updateLiveObs(obs);
  const snapData = await sendMessage<SnapshotData>({ type: "GET_SNAPSHOT_DATA" });
  updateSnapshotStats(snapData);
  const invData = await sendMessage<InvestigationData>({ type: "GET_INVESTIGATION_DATA" });
  updateInvestigationStats(invData);
  const diffData = await sendMessage<DiffData>({ type: "GET_DIFF_DATA" });
  updateDiffStats(diffData);
  const semData = await sendMessage<SemanticData>({ type: "GET_SEMANTIC_DATA" });
  updateSemanticStats(semData);
}

setupLiveObsControls();
setupClipboardButtons();
setupSnapshotButtons();
setupInvestigationButtons();
setupDiffButtons();
setupSemanticButtons();
poll();
setInterval(poll, 2000);
