import type { ToolkitModule, ToolkitModuleContext, ModuleStatus } from "../interfaces/toolkit-module";

export class RuntimeSpy implements ToolkitModule {
  readonly id = "runtime-spy";
  readonly name = "Runtime Spy";
  readonly version = "0.1.0";

  private ctx?: ToolkitModuleContext;
  private status: ModuleStatus = "idle";

  async init(ctx: ToolkitModuleContext): Promise<void> {
    this.ctx = ctx;
    this.ctx.logger.debug(`${this.id}: initialized`);
  }

  async start(): Promise<void> {
    this.status = "running";
    this.ctx?.logger.info(`${this.id}: started`);
  }

  async stop(): Promise<void> {
    this.status = "stopped";
    this.ctx?.logger.info(`${this.id}: stopped`);
  }

  async destroy(): Promise<void> {
    this.status = "idle";
    this.ctx = undefined;
  }

  getStatus(): ModuleStatus {
    return this.status;
  }
}
