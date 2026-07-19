const statusEl = document.getElementById("status")!;

statusEl.textContent = "Connecting...";

chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError) {
    statusEl.textContent = "Background: unreachable";
    return;
  }
  const res = response as Record<string, unknown> | null;
  const content = res?.content as Record<string, unknown> | undefined;
  statusEl.textContent = `Background: ${res?.source === "background" ? "connected" : "error"}\nContent: ${content?.source === "content" ? "connected" : "unreachable"}`;
});
