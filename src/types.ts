export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFormat = "auto" | "pretty" | "json";

export interface LogContext {
  [key: string]: unknown;
}

export interface LoggerOutput {
  write?: (line: string) => void;
  log?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
}

export interface LogErrorContext {
  level: LogLevel;
  event: LogEvent;
}

export interface PilotConfig {
  level: LogLevel;
  format: LogFormat;
  output: LoggerOutput;
  redact: string[];
  context: LogContext;
  onError?: (error: unknown, context: LogErrorContext) => void;
  silent: boolean;
}

export interface WrapOptions {
  name?: string;
  context?: LogContext;
}

export interface MiddlewareRequestLike {
  method?: string;
  url?: string;
  originalUrl?: string;
  path?: string;
}

export interface MiddlewareResponseLike {
  statusCode?: number;
  on?: (event: string, callback: () => void) => void;
  addListener?: (event: string, callback: () => void) => void;
}

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  message?: string;
  event: string;
  functionName?: string;
  args?: unknown[];
  result?: unknown;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: LogContext;
  method?: string;
  path?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export type AnyFunction = (...args: any[]) => any;

export interface PilotInstance {
  <F extends AnyFunction>(fn: F, options?: WrapOptions): (...args: Parameters<F>) => ReturnType<F>;
  configure: (opts: Partial<PilotConfig>) => void;
  child: (context: LogContext) => PilotInstance;
  middleware: () => (
    req: MiddlewareRequestLike,
    res: MiddlewareResponseLike,
    next?: (error?: unknown) => void
  ) => void;
  wrap: <T extends object>(obj: T, options?: WrapOptions) => T;
  debug: (message: string, data?: LogContext) => void;
  info: (message: string, data?: LogContext) => void;
  warn: (message: string, data?: LogContext) => void;
  error: (message: string, data?: LogContext) => void;
}
