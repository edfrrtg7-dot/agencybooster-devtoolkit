chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ type: "PONG" });
  }

  if (message.type === "PING_CONTENT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ type: "PONG", error: "no_active_tab" });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: "PING" }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ type: "PONG", error: "content_script_unreachable" });
        } else {
          sendResponse(response);
        }
      });
    });
    return true;
  }
});
