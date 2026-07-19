chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INJECT_SCRIPT") {
    sendResponse({ status: "ok" });
  }
});
