import { createToolkit } from "./core/bootstrap";

const toolkit = createToolkit();

toolkit.start().catch((err) => {
  console.error("[AgencyBooster] Failed to start toolkit:", err);
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const { type } = event.data;

  switch (type) {
    case "TOOLKIT_STATUS":
      event.ports[0]?.postMessage({
        type: "TOOLKIT_STATUS_RESPONSE",
        payload: toolkit.moduleManager.getStatusMap(),
      });
      break;

    case "TOOLKIT_STOP":
      toolkit.stop();
      break;

    case "TOOLKIT_START":
      toolkit.start();
      break;

    case "TOOLKIT_DESTROY":
      toolkit.destroy();
      break;
  }
});
