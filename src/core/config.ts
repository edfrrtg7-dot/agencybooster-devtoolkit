export interface ToolkitConfig {
  enabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  modules: Record<string, ModuleConfig>;
}

export interface ModuleConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

const DEFAULT_CONFIG: ToolkitConfig = {
  enabled: true,
  logLevel: "debug",
  modules: {
    "runtime-spy": { enabled: true },
    "network-spy": { enabled: true },
    "dom-inspector": { enabled: true },
    "storage-inspector": { enabled: true },
    "event-spy": { enabled: true },
    dashboard: { enabled: true },
  },
};

export class Config {
  private config: ToolkitConfig;

  constructor(initial?: Partial<ToolkitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initial };
  }

  get<K extends keyof ToolkitConfig>(key: K): ToolkitConfig[K] {
    return this.config[key];
  }

  set<K extends keyof ToolkitConfig>(key: K, value: ToolkitConfig[K]): void {
    this.config[key] = value;
  }

  getModuleConfig(moduleId: string): ModuleConfig | undefined {
    return this.config.modules[moduleId];
  }

  isModuleEnabled(moduleId: string): boolean {
    return this.config.modules[moduleId]?.enabled ?? false;
  }

  setModuleEnabled(moduleId: string, enabled: boolean): void {
    if (!this.config.modules[moduleId]) {
      this.config.modules[moduleId] = { enabled };
    } else {
      this.config.modules[moduleId].enabled = enabled;
    }
  }

  getAll(): ToolkitConfig {
    return structuredClone(this.config);
  }

  merge(overrides: Partial<ToolkitConfig>): void {
    this.config = { ...this.config, ...overrides };
  }

  static fromJSON(json: string): Config {
    return new Config(JSON.parse(json));
  }

  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }
}
