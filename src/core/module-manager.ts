import type { ToolkitModule, ToolkitModuleContext, ModuleStatus } from "../interfaces/toolkit-module";
import type { EventBus } from "./event-bus";
import type { Logger } from "./logger";
import type { Config } from "./config";

export class ModuleManager {
  private modules = new Map<string, ToolkitModule>();
  private initOrder: string[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly config: Config
  ) {}

  register(module: ToolkitModule): void {
    if (this.modules.has(module.id)) {
      this.logger.warn(`Module "${module.id}" is already registered. Skipping.`);
      return;
    }

    this.modules.set(module.id, module);
    this.initOrder.push(module.id);
    this.logger.info(`Module registered: ${module.id} (${module.name} v${module.version})`);
  }

  async initAll(): Promise<void> {
    const ctx: ToolkitModuleContext = {
      eventBus: this.eventBus,
      logger: this.logger,
      config: this.config,
    };

    for (const id of this.initOrder) {
      const mod = this.modules.get(id)!;

      if (!this.config.isModuleEnabled(id)) {
        this.logger.info(`Module "${id}" is disabled. Skipping init.`);
        continue;
      }

      try {
        await mod.init(ctx);
        this.logger.info(`Module initialized: ${id}`);
      } catch (err) {
        this.logger.error(`Failed to initialize module "${id}"`, err);
      }
    }
  }

  async startAll(): Promise<void> {
    for (const id of this.initOrder) {
      const mod = this.modules.get(id)!;

      if (!this.config.isModuleEnabled(id)) continue;
      if (mod.getStatus() === "running") continue;

      try {
        await mod.start();
        this.logger.info(`Module started: ${id}`);
        this.eventBus.emit("module:started", { moduleId: id });
      } catch (err) {
        this.logger.error(`Failed to start module "${id}"`, err);
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const id of [...this.initOrder].reverse()) {
      const mod = this.modules.get(id)!;
      if (mod.getStatus() !== "running") continue;

      try {
        await mod.stop();
        this.logger.info(`Module stopped: ${id}`);
        this.eventBus.emit("module:stopped", { moduleId: id });
      } catch (err) {
        this.logger.error(`Failed to stop module "${id}"`, err);
      }
    }
  }

  async destroyAll(): Promise<void> {
    for (const id of [...this.initOrder].reverse()) {
      const mod = this.modules.get(id)!;

      try {
        await mod.destroy();
        this.logger.info(`Module destroyed: ${id}`);
      } catch (err) {
        this.logger.error(`Failed to destroy module "${id}"`, err);
      }
    }

    this.modules.clear();
    this.initOrder = [];
    this.eventBus.removeAllListeners();
  }

  getModule(id: string): ToolkitModule | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ToolkitModule[] {
    return this.initOrder.map((id) => this.modules.get(id)!);
  }

  getStatusMap(): Record<string, ModuleStatus> {
    const map: Record<string, ModuleStatus> = {};
    for (const [id, mod] of this.modules) {
      map[id] = mod.getStatus();
    }
    return map;
  }
}
