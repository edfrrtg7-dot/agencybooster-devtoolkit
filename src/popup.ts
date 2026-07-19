const statusEl = document.getElementById("status")!;

statusEl.textContent = "Connecting...";

chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError) {
    statusEl.textContent = "Background: unreachable";
    return;
  }
  statusEl.textContent = `Background: ${response?.source === "background" ? "connected" : "error"}\nContent: ${response?.content?.source === "content" ? "connected" : "unreachable"}`;
});
