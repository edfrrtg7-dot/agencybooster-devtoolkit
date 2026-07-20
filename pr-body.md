# ABDT-003A through ABDT-016: AgencyBooster Developer Toolkit - Complete Build

## Overview
This PR fixes the broken build scaffold and adds a full Observation Core, four Explorer modules, a Collector layer, a Diagnostics Dashboard, Storage Snapshot & Object Diff, a Runtime Investigation Framework, and DOM Anchor Runtime Trace — producing a fully buildable, installable MV3 Chrome Extension.

## Commits (oldest to newest)

### ABDT-003A — Fix Broken Build
- Replaced broken `tsc && node build.js` with esbuild bundler (`build.mjs`)
- Fixed `manifest.json`: correct `service_worker` path (`dist/background.js`), `content_scripts` at `document_start`
- Fixed `tsconfig.json`: `moduleResolution: "bundler"`, removed premature `outDir`/`declaration`/`sourceMap`
- Fixed PING/PONG bridge: content.ts sends, background.ts listens
- Added `chrome.d.ts` global declarations
- Deleted premature scaffold (`src/entities/`, `src/services/session-manager.ts`, etc.)
- `npm run typecheck` and `npm run build` both pass

### ABDT-004 — Observation Core
- `src/core/` module: observation-types.ts, entity.ts, session.ts, event-bus.ts, observation.ts, observation-registry.ts, observation-recorder.ts
- Immutable Observation objects (Object.freeze), UUID v4 generation
- Session management (active/inactive state, session ID)
- EventBus (typed pub/sub, max listener guard)
- ObservationRegistry (in-memory storage, query/filter)
- ObservationRecorder (session-enforced recording, auto-emit to registry + EventBus)
- SCHEMA_VERSION = 1

### ABDT-004A — Observation Core Invariant Hardening
- Deep freeze for nested objects (page, entity, metadata)
- Registry.freezeOnAdd() — records freeze immutably on add
- Recorder throws on missing session

### ABDT-005 — Core Explorers MVP + Collector Layer
- `src/collectors/`: dom-collector.ts, storage-collector.ts, network-collector.ts, runtime-collector.ts, page-info.ts
- `src/explorers/`: DOM (MutationObserver), Storage (patched Storage.prototype), Network (fetch + XHR hooks), Runtime (startup snapshot)
- `src/setup.ts` — createPipeline() factory wiring Explorer → Collector → ObservationRecorder
- `src/content.ts` — boots all 4 explorers on content script load

### ABDT-006 — Diagnostics Dashboard
- `popup.html`: Explorer Status, Observation Statistics, Recorder Status, Runtime Information
- `popup.ts`: polls GET_DATA every 2s, renders stats
- `background.ts`: relays PING/PONG + GET_DATA to content script

### ABDT-007 — Diagnostics Export
- "Copy Diagnostics" and "Copy Recent Observations" buttons
- Plaintext export format, clipboard API, toast confirmation

### ABDT-008 — Explorer Activity & Observation Health
- Per-explorer stats: startedAt, lastActivityAt, totalObservations, rolling rate (10s window)
- Health states: healthy/idle/silent/error
- Observation summary with source breakdown, runtime health

### ABDT-009 — Live Observation Viewer
- Scrollable list, incremental append (seenObs Set), MAX_VISIBLE = 100
- Auto Scroll toggle, Clear View (UI only)

### ABDT-010 — Explorer Verification & Coverage
- DOM Explorer: `attributeOldValue: true`, `characterData: true`, `characterDataOldValue: true`
- Runtime Explorer: navigation polling (500ms), popstate, hashchange, visibilitychange listeners
- 4 new collector functions: collectNavigation, collectHistoryChange, collectHashChange, collectVisibilityChange
- JSDoc coverage for all 4 explorers

### ABDT-011 — Restore Clipboard Actions
- Wired `btn-copy-diag` and `btn-copy-obs` click handlers (regression fix)
- Error handling with toast + console.error

### ABDT-012 — Explorer Capability Audit & Freeze
- Fixed summarizeObs for Runtime events (trigger-specific summaries)
- Fixed "NetworkExplorer" → "Network Explorer" display name
- `docs/explorer-capabilities.md`: complete capability matrix

### ABDT-013 — Generic Storage Snapshot & Object Diff
- `src/services/object-diff.ts`: recursive semantic diff engine (diff(), formatDiffReport())
- `src/services/storage-snapshot-service.ts`: 20-entry history ring buffer, capture/export/compare
- Storage Explorer accepts optional `keyUpdates` Map for snapshot service
- 5 new message handlers: CAPTURE_SNAPSHOT, GET_SNAPSHOT_DATA, EXPORT_LATEST_SNAPSHOT, EXPORT_SNAPSHOT_HISTORY, COMPARE_SNAPSHOTS
- Popup: Sender State Snapshot section (4 buttons + 6 stats)

### ABDT-014 — Fix Sender Snapshot Key Discovery
- findKey() filters out `-backup-` keys, selects active keys
- Removed keyUpdates dependency from StorageSnapshotService constructor
- Single active key auto-selects; zero reports error; multiple reports error with list

### ABDT-015 — Runtime Investigation Framework
- `src/services/investigation/`: 8 files — types.ts, profiles.ts, dom-module.ts, runtime-module.ts, storage-module.ts, relationships.ts, investigator.ts, index.ts
- RuntimeInvestigator orchestrator, 5 profiles (Finance, Sender, IceBreaker, Storage, Custom)
- Config: maxRecursionDepth=5, maxObjects=200, maxProperties=50, maxReportSize=100kb
- 3 message handlers: RUN_INVESTIGATION, EXPORT_INVESTIGATION, GET_INVESTIGATION_DATA
- Popup: Runtime Investigation section with Run/Export buttons + 8 diagnostic stat boxes

### ABDT-016 — DOM Anchor Runtime Trace
- `src/services/investigation/anchor-selector.ts`: scores DOM matches (id > selector > text > tag), returns top 3 anchors
- `src/services/investigation/dom-anchor-trace.ts`: traces from anchor — sibling/nearby elements matching keywords, visibility scoring
- `src/services/investigation/runtime-trace.ts`: runtime discovery around anchor, anchorRelation tagging
- `src/services/investigation/storage-correlation.ts`: correlates storage keys with anchor + runtime keys
- `src/services/investigation/trace-confidence.ts`: High/Medium/Low/Unverified classification, builds TraceRelationship[]
- Extended TraceReport interface (anchors, runtimePaths, storageCorrelations, relationships, confidenceSummary)
- Investigator integrates trace pipeline: selectAnchors → traceRuntime → correlateStorage → buildTraceRelationships → classifyConfidence
- Content script returns 6 new trace diagnostics fields (traceAnchorCount, tracePrimaryAnchor, traceRuntimePaths, traceStorageCorrelations, traceHighConfidence, traceLastTime)
- Popup: new "DOM Anchor Trace" diagnostics section (6 stat boxes)
- 5 new trace modules, 835 lines added

## Architecture
```
Explorers → Collectors → ObservationRecorder → ObservationRegistry → EventBus
                                                              ↓
                                                        Popup (diagnostics)
                                                          - Explorer status
                                                          - Observation stats
                                                          - Live viewer
                                                          - Storage snapshots
                                                          - Object diff
                                                          - Runtime investigation
                                                          - DOM anchor trace
```

## Verification
- `npm run typecheck` passes (0 errors) after each ABDT task
- `npm run build` produces clean output after each ABDT task
- Final build sizes: content.js ~63.2kb, popup.js ~16.5kb, background.js ~2.4kb
- 11 source files changed, 835 insertions in ABDT-016 alone

## Key Files
- `src/core/` — Observation Core (7 files)
- `src/collectors/` — Browser API collectors (5 files)
- `src/explorers/` — Explorer modules (4 modules)
- `src/services/investigation/` — Runtime Investigation + Trace (13 files)
- `src/content.ts` — Content script wiring all explorers, collectors, snapshot service, investigator
- `src/popup.ts` — Full diagnostics dashboard
- `popup.html` — Dashboard layout
- `build.mjs` — esbuild bundler
- `docs/explorer-capabilities.md` — Capability matrix

## No Browser APIs in `src/core/`
- Core is pure TypeScript; browser APIs only in explorers, collectors, and content script

## Installation
1. Clone repo, checkout `fix/abdt-003a-buildable`
2. `npm install`
3. `npm run build`
4. Chrome → `chrome://extensions` → Enable Developer Mode
5. Load Unpacked → select project root
6. Click extension icon on any page → diagnostics dashboard opens
