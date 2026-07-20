import { ObservationRecorder } from "../../core";
import { collectStorageChange } from "../../collectors";

/**
 * Storage Explorer — passively observes localStorage and sessionStorage.
 *
 * Monkey-patches Storage.prototype.setItem and Storage.prototype.removeItem
 * to intercept all storage writes from page scripts. Does NOT modify storage
 * itself — only wraps the methods to observe before calling the original.
 *
 * Browser APIs used:
 * - Storage.prototype.setItem (patched) — intercepts setItem calls
 * - Storage.prototype.removeItem (patched) — intercepts removeItem calls
 * - Storage.prototype.getItem (read only) — reads old value before change
 *
 * Observation types produced:
 * - "set" — setItem called (key, oldValue, newValue, storageType)
 * - "remove" — removeItem called (key, oldValue, storageType)
 *
 * Coverage:
 * - localStorage: ✅ observed via prototype patch
 * - sessionStorage: ✅ observed via prototype patch
 *
 * Known limitations:
 * - Storage.clear() is NOT observed. When clear() is called, all keys are
 *   removed at once with no per-key oldValue data available. A future
 *   enhancement could enumerate all keys before calling clear().
 * - Cross-tab storage changes: the "storage" event only fires in OTHER
 *   windows/tabs that share the same storage area. This explorer uses
 *   prototype patching which captures the CURRENT page's writes directly.
 *   Changes from other tabs/windows are NOT observed.
 * - The storage event fires AFTER the write. Our prototype patch fires
 *   BEFORE the write (to capture oldValue), which is more reliable.
 * - In MV3 service workers, there is no access to localStorage/sessionStorage.
 *   This explorer runs in the content script context only.
 * - Prototype patching may conflict with other libraries that also patch
 *   Storage.prototype (rare in practice).
 *
 * How to extend:
 * 1. Extend collectStorageChange() in collectors/storage-collector.ts.
 * 2. To observe clear(), add a patched Storage.prototype.clear method.
 */
export class StorageExplorer {
  private running = false;

  private readonly originalSetItem: (key: string, value: string) => void;
  private readonly originalRemoveItem: (key: string) => void;

  constructor(
    private readonly recorder: ObservationRecorder,
    private readonly keyUpdates?: Map<string, number>,
  ) {
    this.originalSetItem = Storage.prototype.setItem;
    this.originalRemoveItem = Storage.prototype.removeItem;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    const recorder = this.recorder;
    const origSetItem = this.originalSetItem;
    const origRemoveItem = this.originalRemoveItem;
    const keyUpdates = this.keyUpdates;

    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      try {
        const oldValue = this.getItem(key);
        if (keyUpdates && this === window.localStorage) {
          keyUpdates.set(key, Date.now());
        }
        recorder.record(
          collectStorageChange({
            storageType:
              this === window.localStorage ? "localStorage" : "sessionStorage",
            key,
            oldValue,
            newValue: value,
          })
        );
      } catch {
        // Observation must not break storage
      }
      return origSetItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function (this: Storage, key: string) {
      try {
        const oldValue = this.getItem(key);
        recorder.record(
          collectStorageChange({
            storageType:
              this === window.localStorage ? "localStorage" : "sessionStorage",
            key,
            oldValue,
            newValue: null,
          })
        );
      } catch {
        // Observation must not break storage
      }
      return origRemoveItem.call(this, key);
    };
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    Storage.prototype.setItem = this.originalSetItem;
    Storage.prototype.removeItem = this.originalRemoveItem;
  }
}
