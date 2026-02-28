import { startTimer } from "./timer.js";
import { createChildContext, mergeContext } from "./context.js";
import { emitEvent } from "./formatter.js";
import { createMiddleware } from "./middleware.js";
import {
  AnyFunction,
  LogContext,
  LogEvent,
  LogLevel,
  MiddlewareRequestLike,
  MiddlewareResponseLike,
  PilotConfig,
  PilotInstance,
  WrapOptions
} from "./types.js";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const DEFAULT_CONFIG: PilotConfig = {
  level: "info",
  format: "auto",
  output: console,
  redact: ["password", "token", "secret", "key", "authorization"],
  context: {},
  silent: false
};

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === "object" && value !== null && typeof (value as Promise<unknown>).then === "function";
}

function shouldLog(currentLevel: LogLevel, threshold: LogLevel): boolean {
  return LEVEL_WEIGHT[currentLevel] >= LEVEL_WEIGHT[threshold];
}

function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  if (typeof error === "string") {
    return { name: "Error", message: error };
  }

  return { name: "Error", message: "Unknown error", stack: JSON.stringify(error) };
}

function createEvent(level: LogLevel, event: string, context: LogContext, message?: string): LogEvent {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    context
  };
}

export function createPilot(baseConfig: PilotConfig = DEFAULT_CONFIG, scopedContext: LogContext = {}): PilotInstance {
  const configRef = baseConfig;

  const logEvent = (event: LogEvent): void => {
    if (configRef.silent || !shouldLog(event.level, configRef.level)) {
      return;
    }
    emitEvent(configRef.output, event, configRef.format, configRef.redact);
  };

  const wrapper = (<F extends AnyFunction>(fn: F, options?: WrapOptions) => {
    const wrapped = ((...args: Parameters<F>): ReturnType<F> => {
      const timer = startTimer();
      const mergedContext = mergeContext(configRef, scopedContext, options?.context);
      const functionName = options?.name ?? fn.name ?? "anonymous";

      logEvent({
        ...createEvent("debug", "function:start", mergedContext),
        functionName,
        args
      });

      try {
        const result = fn(...args);

        if (isPromiseLike(result)) {
          return result
            .then((value) => {
              const durationMs = timer.stop();
              logEvent({
                ...createEvent("info", "function:success", mergedContext),
                functionName,
                args,
                result: value,
                durationMs
              });
              return value;
            })
            .catch((error) => {
              const durationMs = timer.stop();
              const normalized = normalizeError(error);
              const payload = {
                ...createEvent("error", "function:error", mergedContext),
                functionName,
                args,
                durationMs,
                error: normalized
              };
              logEvent(payload);
              configRef.onError?.(error, { level: "error", event: payload });
              throw error;
            }) as ReturnType<F>;
        }

        const durationMs = timer.stop();
        logEvent({
          ...createEvent("info", "function:success", mergedContext),
          functionName,
          args,
          result,
          durationMs
        });
        return result;
      } catch (error) {
        const durationMs = timer.stop();
        const normalized = normalizeError(error);
        const payload = {
          ...createEvent("error", "function:error", mergedContext),
          functionName,
          args,
          durationMs,
          error: normalized
        };
        logEvent(payload);
        configRef.onError?.(error, { level: "error", event: payload });
        throw error;
      }
    }) as (...args: Parameters<F>) => ReturnType<F>;

    return wrapped;
  }) as PilotInstance;

  wrapper.configure = (opts: Partial<PilotConfig>): void => {
    if (opts.context) {
      configRef.context = { ...configRef.context, ...opts.context };
    }

    const next: Partial<PilotConfig> = { ...opts };
    delete next.context;

    Object.assign(configRef, next);
  };

  wrapper.child = (context: LogContext): PilotInstance => {
    const childContext = createChildContext(scopedContext, context);
    return createPilot(configRef, childContext);
  };

  wrapper.middleware = () => {
    return createMiddleware(
      (event) => logEvent({ ...event, context: mergeContext(configRef, scopedContext, event.context) }),
      () => mergeContext(configRef, scopedContext),
      configRef
    ) as (req: MiddlewareRequestLike, res: MiddlewareResponseLike, next?: (error?: unknown) => void) => void;
  };

  wrapper.wrap = <T extends object>(obj: T, options?: WrapOptions): T => {
    const cache = new Map<PropertyKey, AnyFunction>();

    return new Proxy(obj, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        if (typeof value !== "function") {
          return value;
        }

        if (cache.has(prop)) {
          return cache.get(prop);
        }

        const boundFn = (...args: unknown[]) => value.apply(target, args);
        const wrapped = wrapper(boundFn, {
          ...options,
          name: `${target.constructor?.name ?? "Object"}.${String(prop)}`,
          context: options?.context
        });

        cache.set(prop, wrapped as AnyFunction);
        return wrapped;
      }
    });
  };

  wrapper.debug = (message: string, data?: LogContext): void => {
    logEvent({ ...createEvent("debug", "log", mergeContext(configRef, scopedContext, data), message) });
  };

  wrapper.info = (message: string, data?: LogContext): void => {
    logEvent({ ...createEvent("info", "log", mergeContext(configRef, scopedContext, data), message) });
  };

  wrapper.warn = (message: string, data?: LogContext): void => {
    logEvent({ ...createEvent("warn", "log", mergeContext(configRef, scopedContext, data), message) });
  };

  wrapper.error = (message: string, data?: LogContext): void => {
    logEvent({ ...createEvent("error", "log", mergeContext(configRef, scopedContext, data), message) });
  };

  return wrapper;
}

export const pilot = createPilot({ ...DEFAULT_CONFIG }, {});
