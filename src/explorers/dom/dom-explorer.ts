import { ObservationRecorder } from "../../core";
import { collectDOMMutation } from "../../collectors";

/**
 * DOM Explorer — passively observes DOM mutations via MutationObserver.
 *
 * Reports immutable Observations through the Observation Recorder.
 * Must never modify the page. Only observe.
 *
 * What is observed:
 * - childList mutations (nodes added/removed)
 * - subtree mutations (changes anywhere in the document tree)
 * - attribute mutations (attribute changes on elements, with old values)
 * - characterData mutations (text content changes, with old values)
 *
 * Browser APIs used:
 * - MutationObserver — observes DOM mutations
 * - document.documentElement — root node for observation (always available at document_start)
 *
 * Observation types produced:
 * - "childList" — nodes added/removed (addedCount, removedCount, targetTag)
 * - "attributes" — attribute changed (attributeName, targetTag, oldValue)
 * - "characterData" — text changed (targetTag, oldValue)
 *
 * Limitations:
 * - Observes document.documentElement only. Shadow DOM inside other roots
 *   is not observed unless those roots are descendants of <html>.
 * - attributeOldValue and characterDataOldValue are enabled, so oldValue is
 *   populated for attribute and characterData mutations.
 * - Performance: on pages with very high mutation rates (e.g. animation
 *   frameworks), this may produce many observations. The observation pipeline
 *   is designed to handle this, but storage may grow quickly.
 *
 * How to extend:
 * 1. Extend collectDOMMutation() in collectors/dom-collector.ts to extract
 *    new payload fields (e.g. added node names, removed node names).
 * 2. The payload is `unknown` on the Observation — no schema changes needed.
 * 3. Future processors interpret by checking source === ObservationSource.DOMInspector.
 */
export class DOMExplorer {
  private observer: MutationObserver | null = null;
  private running = false;

  constructor(private readonly recorder: ObservationRecorder) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    this.observer = new MutationObserver((records) => {
      try {
        for (const record of records) {
          this.recorder.record(collectDOMMutation(record));
        }
      } catch (err) {
        console.error("[DOMExplorer] Error processing mutations:", err);
      }
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.observer?.disconnect();
    this.observer = null;
  }
}
