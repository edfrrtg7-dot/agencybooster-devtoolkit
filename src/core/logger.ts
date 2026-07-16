export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerOptions {
  prefix?: string;
  minLevel?: LogLevel;
}

export class Logger {
  private prefix: string;
  private minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ?? "AgencyBooster";
    this.minLevel = options.minLevel ?? "debug";
  }

  debug(message: string, ...args: unknown[]): void {
    this.log("debug", message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log("info", message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log("warn", message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log("error", message, args);
  }

  child(prefix: string): Logger {
    return new Logger({
      prefix: `${this.prefix}:${prefix}`,
      minLevel: this.minLevel,
    });
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private log(level: LogLevel, message: string, args: unknown[]): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const tag = `[${this.prefix}]`;
    const styled = `${tag} ${message}`;

    switch (level) {
      case "debug":
        console.debug(styled, ...args);
        break;
      case "info":
        console.info(styled, ...args);
        break;
      case "warn":
        console.warn(styled, ...args);
        break;
      case "error":
        console.error(styled, ...args);
        break;
    }
  }
}
