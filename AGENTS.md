# AGENTS.md — AgencyBooster Developer Toolkit

## What This Is

Standalone Chrome Extension (Manifest V3) for development insights.
No external dependencies on AgencyBooster Manager or any other project.

## Project Structure

```
agencybooster-devtoolkit/
├── manifest.json              # MV3 extension manifest
├── package.json               # esbuild + typescript
├── build.mjs                  # esbuild bundler (3 entrypoints)
├── tsconfig.json              # strict, ES2020, bundler resolution
├── popup.html                 # extension popup shell
├── src/
│   ├── background.ts          # service worker — boots toolkit
│   ├── content.ts             # content script — message bridge
│   ├── popup.ts               # popup UI — queries toolkit status
│   ├── chrome.d.ts            # minimal chrome.* type stubs
│   ├── core/
│   │   ├── bootstrap.ts       # createToolkit() — wires everything
│   │   ├── event-bus.ts       # pub/sub (on/once/emit/off)
│   │   ├── logger.ts          # leveled logger with prefix/child
│   │   ├── config.ts          # typed config + per-module toggles
│   │   ├── module-manager.ts  # lifecycle: init→start→stop→destroy
│   │   └── index.ts           # barrel re-exports
│   ├── interfaces/
│   │   └── toolkit-module.ts  # ToolkitModule interface
│   └── modules/
│       ├── runtime-spy.ts     # stub
│       ├── network-spy.ts     # stub
│       ├── dom-inspector.ts   # stub
│       ├── storage-inspector.ts # stub
│       ├── event-spy.ts       # stub
│       ├── dashboard.ts       # stub
│       └── index.ts           # barrel re-exports
```

## Build

```bash
npm install
npm run build        # esbuild → dist/{background,content,popup}.js
npm run typecheck    # tsc --noEmit (type-check only)
```

Output: `dist/background.js`, `dist/content.js`, `dist/popup.js`.

## Architecture Rules

1. **Standalone** — this repo has zero dependencies on AgencyBooster Manager
   or any external AgencyBooster code. Never import from outside `src/`.
2. **Dependency inversion** — modules receive `ToolkitModuleContext`
   (EventBus, Logger, Config) via `init()`, never construct their own.
3. **Module lifecycle** — every module implements `ToolkitModule`:
   `init(ctx) → start() → stop() → destroy()` + `getStatus()`.
4. **No spying logic yet** — all modules are stubs. Inspection logic
   will be added in a later step.
5. **Three entrypoints** — `background.ts`, `content.ts`, `popup.ts`.
   Each is bundled independently by esbuild.
6. **MV3 service worker** — `background.ts` runs as a service worker
   (`"type": "module"` in manifest). It cannot use DOM APIs.
7. **Content script** — `content.ts` runs in the page context. It has
   access to DOM and page JS but communicates with background via
   `chrome.runtime.sendMessage`.

## Key Interfaces

```typescript
// src/interfaces/toolkit-module.ts
interface ToolkitModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  init(ctx: ToolkitModuleContext): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  getStatus(): ModuleStatus;
}

type ModuleStatus = "idle" | "running" | "stopped" | "error";
```

## Adding a New Module

1. Create `src/modules/<name>.ts` implementing `ToolkitModule`.
2. Export it from `src/modules/index.ts`.
3. Import and register it in `src/core/bootstrap.ts`.
4. Add a default entry in `src/core/config.ts` `DEFAULT_CONFIG.modules`.
5. Run `npm run typecheck` and `npm run build`.

## Do NOT

- Import from `node_modules` at runtime (only devDependencies).
- Add DOM access in `background.ts` (service worker).
- Add chrome.* API calls in modules without wrapping in try/catch.
- Change the module lifecycle contract without updating all modules.
- Add external AgencyBooster Manager imports.
