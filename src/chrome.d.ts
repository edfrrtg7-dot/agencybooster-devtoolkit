export {};

declare namespace chrome {
  namespace runtime {
    function sendMessage(
      message: Record<string, unknown>,
      callback?: (response: unknown) => void
    ): void;
    const lastError: { message?: string } | null;
    const onMessage: {
      addListener(
        callback: (
          message: Record<string, unknown>,
          sender: { tab?: { id?: number } },
          sendResponse: (response: unknown) => void
        ) => void
      ): void;
    };
    function onInstalled.addListener(callback: () => void): void;
  }
  namespace tabs {
    function sendMessage(
      tabId: number,
      message: Record<string, unknown>,
      callback?: (response: unknown) => void
    ): void;
    function query(
      options: { active?: boolean; currentWindow?: boolean },
      callback: (tabs: Array<{ id?: number }>) => void
    ): void;
  }
}

interface ServiceWorkerGlobalScope {
  skipWaiting(): void;
  clients: { claim(): Promise<void> };
}
