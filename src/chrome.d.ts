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
          sender: unknown,
          sendResponse: (response: unknown) => void
        ) => void
      ): void;
    };
  }
  namespace tabs {
    function query(
      queryInfo: { active?: boolean; currentWindow?: boolean },
      callback: (tabs: Array<{ id?: number }>) => void
    ): void;
    function sendMessage(
      tabId: number,
      message: Record<string, unknown>,
      callback?: (response: unknown) => void
    ): void;
  }
}
