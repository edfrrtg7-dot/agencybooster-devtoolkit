import { ObservationRecorder } from "../../core";
import {
  collectRuntimeSnapshot,
  collectNavigation,
  collectHistoryChange,
  collectHashChange,
  collectVisibilityChange,
} from "../../collectors";

/**
 * Runtime Explorer — observes runtime lifecycle events.
 *
 * Captures:
 * 1. Startup snapshot — all window property names and global object types (one-time).
 * 2. Navigation — when location.href changes (polls every 500ms).
 * 3. History — popstate events (back/forward navigation).
 * 4. Hash — hashchange events.
 * 5. Visibility — visibilitychange events (tab switch, minimize).
 *
 * Browser APIs used:
 * - Object.getOwnPropertyNames(window) — startup snapshot
 * - window.location.href — navigation detection
 * - window.addEventListener("popstate") — history changes
 * - window.addEventListener("hashchange") — hash changes
 * - document.addEventListener("visibilitychange") — visibility
 *
 * Limitations:
 * - Navigation detection uses polling (500ms interval), not a live event.
 *   pushState/replaceState are NOT detected by popstate — only user-initiated
 *   back/forward navigation triggers popstate. A future enhancement could
 *   monkey-patch history.pushState/replaceState for full coverage.
 * - Service Worker navigations are not visible from the page context.
 * - Cross-origin navigations (full page reload) reset the content script,
 *   so the observation is lost unless the new page also starts the explorer.
 *
 * How to extend:
 * 1. Add new trigger types in collectors/runtime-collector.ts.
 * 2. Register new event listeners in start().
 */
export class RuntimeExplorer {
  private running = false;
  private navigationTimer: ReturnType<typeof setInterval> | null = null;
  private lastUrl = "";

  private boundOnPopState: (() => void) | null = null;
  private boundOnHashChange: (() => void) | null = null;
  private boundOnVisibilityChange: (() => void) | null = null;

  constructor(private readonly recorder: ObservationRecorder) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    this.recorder.record(collectRuntimeSnapshot());

    this.lastUrl = window.location.href;
    this.navigationTimer = setInterval(() => {
      if (!this.running) return;
      const current = window.location.href;
      if (current !== this.lastUrl) {
        this.recorder.record(collectNavigation(this.lastUrl, current));
        this.lastUrl = current;
      }
    }, 500);

    this.boundOnPopState = () => {
      this.recorder.record(collectHistoryChange());
    };
    window.addEventListener("popstate", this.boundOnPopState);

    this.boundOnHashChange = () => {
      // Note: old/new hash not available in event, re-read from location
      this.recorder.record(collectHashChange("", window.location.hash));
    };
    window.addEventListener("hashchange", this.boundOnHashChange);

    this.boundOnVisibilityChange = () => {
      this.recorder.record(collectVisibilityChange(document.visibilityState));
    };
    document.addEventListener("visibilitychange", this.boundOnVisibilityChange);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.navigationTimer) {
      clearInterval(this.navigationTimer);
      this.navigationTimer = null;
    }
    if (this.boundOnPopState) {
      window.removeEventListener("popstate", this.boundOnPopState);
      this.boundOnPopState = null;
    }
    if (this.boundOnHashChange) {
      window.removeEventListener("hashchange", this.boundOnHashChange);
      this.boundOnHashChange = null;
    }
    if (this.boundOnVisibilityChange) {
      document.removeEventListener("visibilitychange", this.boundOnVisibilityChange);
      this.boundOnVisibilityChange = null;
    }
  }
}
