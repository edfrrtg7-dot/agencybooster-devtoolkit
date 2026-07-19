import type { EventBus } from "../core/event-bus";
import type { Logger } from "../core/logger";
import type { Config } from "../core/config";

export interface ToolkitModuleContext {
  eventBus: EventBus;
  logger: Logger;
  config: Config;
}

export interface ToolkitModule {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  init(ctx: ToolkitModuleContext): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  getStatus(): ModuleStatus;
}

export type ModuleStatus = "idle" | "running" | "stopped" | "error";
