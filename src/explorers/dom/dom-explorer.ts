import { ObservationRecorder, ObservationType, ObservationSource, Confidence } from "../../core";
import { processMutationRecord } from "./dom-events";

/**
 * DOM Explorer — passively observes DOM mutations via MutationObserver.
 *
 * Reports immutable Observations through the Observation Recorder.
 * Must never modify the page. Only observe.
 *
 * What is observed:
 * - childList mutations (nodes added/removed)
 * - subtree mutations (changes anywhere in the document)
 * - attribute mutations (attribute changes on elements)
 *
 * What is intentionally ignored:
 * - characterData mutations (text content changes)
 * - internal browser mutations
 *
 * How to add new DOM observations:
 * 1. Extend processMutationRecord() in dom-events.ts to extract new payload fields.
 * 2. The payload is stored as `unknown` on the Observation — no schema changes needed.
 * 3. Future processors interpret the payload by checking `source === ObservationSource.DOMInspector`.
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
          const payload = processMutationRecord(record);
          this.recorder.record({
            type: ObservationType.DOM,
            source: ObservationSource.DOMInspector,
            confidence: Confidence.Observed,
            page: {
              url: window.location.href,
              title: document.title,
            },
            trigger: record.type,
            payload,
          });
        }
      } catch (err) {
        console.error("[DOMExplorer] Error processing mutations:", err);
      }
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.observer?.disconnect();
    this.observer = null;
  }
}
