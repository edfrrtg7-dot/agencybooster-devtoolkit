import { ObservationRecorder } from "../../core";
import { collectStorageChange } from "../../collectors";

/**
 * Storage Explorer — passively observes localStorage and sessionStorage.
 *
 * Monkey-patches Storage.prototype.setItem and Storage.prototype.removeItem
 * to intercept all storage writes. Does NOT modify storage itself.
 *
 * What is observed:
 * - setItem calls (new key or overwrite)
 * - removeItem calls
 *
 * What is intentionally ignored:
 * - clear() calls (no per-key data available)
 * - getItem reads (not mutations)
 *
 * How to add new storage observations:
 * 1. Extend collectStorageChange() in collectors/storage-collector.ts.
 * 2. The payload is `unknown` on the Observation — no schema changes needed.
 */
export class StorageExplorer {
  private running = false;

  private readonly originalSetItem: (key: string, value: string) => void;
  private readonly originalRemoveItem: (key: string) => void;

  constructor(private readonly recorder: ObservationRecorder) {
    this.originalSetItem = Storage.prototype.setItem;
    this.originalRemoveItem = Storage.prototype.removeItem;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    const recorder = this.recorder;
    const origSetItem = this.originalSetItem;
    const origRemoveItem = this.originalRemoveItem;

    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      try {
        const oldValue = this.getItem(key);
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
