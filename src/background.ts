chrome.runtime.onInstalled.addListener(() => {
  console.log("[AgencyBooster] Extension installed");
});

function queryContent<T>(tabId: number, message: Record<string, unknown>): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);
    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError || !response) {
        resolve(null);
        return;
      }
      resolve(response as T);
    });
  });
}

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

  if (message.type === "GET_DATA" || message.type === "GET_RECENT_OBS") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse(null);
        return;
      }
      const data = await queryContent(tabId, { type: message.type });
      sendResponse(data);
    });
    return true;
  }
});
