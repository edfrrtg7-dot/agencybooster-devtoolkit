import { ObservationRecorder } from "../../core";
import { collectNetworkRequest } from "../../collectors";

type FetchFn = typeof fetch;

/**
 * Network Explorer — passively observes fetch and XMLHttpRequest.
 *
 * Wraps window.fetch and XHR open/send to record network requests.
 * Does NOT capture request or response bodies.
 * Does NOT modify requests or responses.
 *
 * What is observed:
 * - fetch calls (URL, method, status, duration)
 * - XMLHttpRequest (URL, method, status, duration)
 *
 * What is intentionally ignored:
 * - request/response bodies
 * - request headers
 * - streaming responses
 * - WebSocket connections
 *
 * How to add new network observations:
 * 1. Extend collectNetworkRequest() in collectors/network-collector.ts.
 * 2. The payload is `unknown` on the Observation — no schema changes needed.
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
