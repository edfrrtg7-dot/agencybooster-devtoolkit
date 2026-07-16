const statusEl = document.getElementById("status");

chrome.runtime.sendMessage({ type: "TOOLKIT_STATUS" }, (response) => {
  if (chrome.runtime.lastError) {
    statusEl!.textContent = "Unable to connect to background service.";
    return;
  }

  if (response?.payload) {
    const modules = Object.entries(response.payload)
      .map(([id, status]) => `${id}: ${status}`)
      .join("\n");
    statusEl!.textContent = modules;
  } else {
    statusEl!.textContent = "No status available.";
  }
});
