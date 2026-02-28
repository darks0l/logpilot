import { LogContext, PilotConfig } from "./types.js";

export function createChildContext(parent: LogContext, child: LogContext): LogContext {
  return { ...parent, ...child };
}

export function mergeContext(config: PilotConfig, scopedContext: LogContext, local?: LogContext): LogContext {
  return {
    ...config.context,
    ...scopedContext,
    ...(local ?? {})
  };
}
