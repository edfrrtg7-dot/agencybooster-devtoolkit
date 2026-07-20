import { ObservationRecorder } from "../../core";
import { collectRuntimeSnapshot } from "../../collectors";

/**
 * Runtime Explorer — captures a one-time snapshot of window globals at startup.
 *
 * Records all window property names and categorizes global objects.
 * This is a single observation, not a continuous watcher.
 *
 * What is observed:
 * - All window property names (own properties)
 * - Global objects categorized by constructor name
 * - Snapshot timestamp
 *
 * What is intentionally ignored:
 * - Property values (to avoid holding live references)
 * - Prototype chain
 * - Property descriptors
 * - Ownership analysis
 * - Dependency analysis
 *
 * How to extend:
 * 1. Extend collectRuntimeSnapshot() in collectors/runtime-collector.ts.
 * 2. The payload is `unknown` on the Observation — no schema changes needed.
 */
export class RuntimeExplorer {
  private running = false;

  constructor(private readonly recorder: ObservationRecorder) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.recorder.record(collectRuntimeSnapshot());
  }

  stop(): void {
    this.running = false;
  }
}
