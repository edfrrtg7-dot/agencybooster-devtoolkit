import { ObservationRecorder } from "../../core";
import { collectNetworkRequest } from "../../collectors";

type FetchFn = typeof fetch;

/**
 * Network Explorer — passively observes fetch and XMLHttpRequest.
 *
 * Wraps window.fetch and XHR open/send to record network requests.
 * Does NOT capture request or response bodies.
 * Does NOT modify requests or responses — original functions are always called.
 *
 * Browser APIs used:
 * - window.fetch (patched) — intercepts fetch() calls
 * - XMLHttpRequest.prototype.open (patched) — captures request method + URL
 * - XMLHttpRequest.prototype.send (patched) — captures timing + status
 * - XMLHttpRequest.status — response status code
 * - performance.now() — high-resolution timing for duration
 * - WeakMap — associates XHR data without modifying the XHR object
 *
 * Observation types produced:
 * - Fetch: url, method, status, duration (on success and failure)
 * - XHR: url, method, status, duration (on loadend)
 *
 * Coverage:
 * - fetch(): ✅ observed via window.fetch patch
 * - XMLHttpRequest: ✅ observed via open/send patches
 * - Request bodies: ❌ NOT captured (would require reading ReadableStream)
 * - Response bodies: ❌ NOT captured (would require tee() on Response body)
 * - Request headers: ❌ NOT captured
 * - Response headers: ❌ NOT captured
 * - WebSocket: ❌ NOT observed (different protocol, not interceptable via prototype)
 * - Server-Sent Events (EventSource): ❌ NOT observed
 * - Beacon API (navigator.sendBeacon): ❌ NOT observed
 *
 * MV3 / Chrome Extension limitations:
 * - The "webRequest" permission would allow observing requests at the browser
 *   level, but it requires broad permissions and is read-only in MV3 (no
 *   blocking). The current approach (prototype patching) is sufficient for
 *   page-initiated requests and requires only "activeTab" permission.
 * - Requests initiated by browser internals (e.g. navigation, image preloads
 *   before content script injection) are NOT observed because the explorer
 *   hasn't started yet.
 * - In MV3 service workers, fetch/XHR are available but the service worker
 *   lifecycle is short. This explorer runs in the content script context
 *   where it persists for the page lifetime.
 * - Content Security Policy (CSP) does not affect prototype patching.
 *
 * How to extend:
 * 1. Extend collectNetworkRequest() in collectors/network-collector.ts.
 * 2. To capture request bodies, read the body from the Request/Response objects
 *    (note: body streams are single-use — would need to clone).
 * 3. To observe WebSocket, patch WebSocket.prototype.send and add an
 *    onmessage handler (out of scope for this task).
 */
export class NetworkExplorer {
  private running = false;

  private readonly originalFetch: FetchFn;
  private readonly originalXhrOpen: typeof XMLHttpRequest.prototype.open;
  private readonly originalXhrSend: typeof XMLHttpRequest.prototype.send;

  private readonly xhrData = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

  constructor(private readonly recorder: ObservationRecorder) {
    this.originalFetch = window.fetch.bind(window);
    this.originalXhrOpen = XMLHttpRequest.prototype.open;
    this.originalXhrSend = XMLHttpRequest.prototype.send;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    const recorder = this.recorder;
    const originalFetch = this.originalFetch;
    const originalXhrOpen = this.originalXhrOpen;
    const originalXhrSend = this.originalXhrSend;
    const xhrData = this.xhrData;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const start = performance.now();
      try {
        const response = await originalFetch(input, init);
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const method = init?.method ?? "GET";
        recorder.record(
          collectNetworkRequest({
            url,
            method,
            status: response.status,
            duration: performance.now() - start,
          })
        );
        return response;
      } catch (err) {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        recorder.record(
          collectNetworkRequest({
            url,
            method: init?.method ?? "GET",
            duration: performance.now() - start,
          })
        );
        throw err;
      }
    } as FetchFn;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      xhrData.set(this, {
        method,
        url: typeof url === "string" ? url : url.toString(),
      });
      return originalXhrOpen.call(this, method, url, async ?? true, username, password);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest) {
      const start = performance.now();
      const data = xhrData.get(this);
      this.addEventListener("loadend", () => {
        recorder.record(
          collectNetworkRequest({
            url: data?.url ?? "unknown",
            method: data?.method ?? "unknown",
            status: this.status,
            duration: performance.now() - start,
          })
        );
      });
      return originalXhrSend.call(this);
    };
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXhrOpen;
    XMLHttpRequest.prototype.send = this.originalXhrSend;
  }
}
