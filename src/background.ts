chrome.runtime.onInstalled.addListener(() => {
  console.log("[AgencyBooster] Extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ type: "PONG", source: "background", content: "error" });
        } else {
          sendResponse({ type: "PONG", source: "background", content: response });
        }
      });
      return true;
    }
    sendResponse({ type: "PONG", source: "background", content: "no-tab" });
  }
});
