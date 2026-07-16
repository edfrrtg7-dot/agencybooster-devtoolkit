import { EventBus } from "./event-bus";
import { Logger } from "./logger";
import { Config } from "./config";
import { ModuleManager } from "./module-manager";
import { RuntimeSpy } from "../modules/runtime-spy";
import { NetworkSpy } from "../modules/network-spy";
import { DOMInspector } from "../modules/dom-inspector";
import { StorageInspector } from "../modules/storage-inspector";
import { EventSpy } from "../modules/event-spy";
import { Dashboard } from "../modules/dashboard";

import type { ToolkitModule } from "../interfaces/toolkit-module";

export interface Toolkit {
  eventBus: EventBus;
  logger: Logger;
  config: Config;
  moduleManager: ModuleManager;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
}

export function createToolkit(configOverrides?: Partial<import("../core/config").ToolkitConfig>): Toolkit {
  const eventBus = new EventBus();
  const logger = new Logger({ prefix: "AgencyBooster" });
  const config = new Config(configOverrides);
  const moduleManager = new ModuleManager(eventBus, logger, config);

  const modules: ToolkitModule[] = [
    new RuntimeSpy(),
    new NetworkSpy(),
    new DOMInspector(),
    new StorageInspector(),
    new EventSpy(),
    new Dashboard(),
  ];

  for (const mod of modules) {
    moduleManager.register(mod);
  }

  return {
    eventBus,
    logger,
    config,
    moduleManager,
    async start() {
      logger.info("Initializing all modules...");
      await moduleManager.initAll();
      logger.info("Starting all modules...");
      await moduleManager.startAll();
      logger.info("Toolkit is running.");
    },
    async stop() {
      logger.info("Stopping all modules...");
      await moduleManager.stopAll();
      logger.info("Toolkit stopped.");
    },
    async destroy() {
      logger.info("Destroying toolkit...");
      await moduleManager.destroyAll();
      logger.info("Toolkit destroyed.");
    },
  };
}
