const bgEl = document.getElementById("bg-status")!;
const contentEl = document.getElementById("content-status")!;

bgEl.textContent = "checking...";
contentEl.textContent = "checking...";

chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError || !response || response.type !== "PONG") {
    bgEl.textContent = "NOT RUNNING";
    bgEl.className = "disconnected";
    contentEl.textContent = "unknown";
    contentEl.className = "disconnected";
    return;
  }

  bgEl.textContent = "running";
  bgEl.className = "connected";

  chrome.runtime.sendMessage({ type: "PING_CONTENT" }, (resp) => {
    if (chrome.runtime.lastError || !resp || resp.type !== "PONG" || resp.error) {
      contentEl.textContent = "not connected";
      contentEl.className = "disconnected";
    } else {
      contentEl.textContent = "connected";
      contentEl.className = "connected";
    }
  });
});
