import type { ToolkitModule, ToolkitModuleContext, ModuleStatus } from "../interfaces/toolkit-module";

export class ContentScript {
  readonly id = "content-script";
  private ctx?: ToolkitModuleContext;
  private status: ModuleStatus = "idle";

  async init(ctx: ToolkitModuleContext): Promise<void> {
    this.ctx = ctx;
    this.ctx.logger.debug("Content script initialized");
  }

  async start(): Promise<void> {
    this.status = "running";
    this.ctx?.logger.info("Content script started");
  }

  async stop(): Promise<void> {
    this.status = "stopped";
  }

  async destroy(): Promise<void> {
    this.status = "idle";
    this.ctx = undefined;
  }

  getStatus(): ModuleStatus {
    return this.status;
  }
}

const content = new ContentScript();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "INJECT_SCRIPT") {
    sendResponse({ status: "ok" });
  }
});
