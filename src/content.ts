import { createPipeline } from "./setup";
import { DOMExplorer } from "./explorers/dom";
import { StorageExplorer } from "./explorers/storage";
import { NetworkExplorer } from "./explorers/network";
import { RuntimeExplorer } from "./explorers/runtime";

const { sessionManager, recorder } = createPipeline();
sessionManager.start();

new RuntimeExplorer(recorder).start();
new DOMExplorer(recorder).start();
new StorageExplorer(recorder).start();
new NetworkExplorer(recorder).start();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ type: "PONG", source: "content" });
  }
});
