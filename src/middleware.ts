import { LogContext, LogEvent, MiddlewareRequestLike, MiddlewareResponseLike, PilotConfig } from "./types.js";
import { startTimer } from "./timer.js";

function readMethod(req: MiddlewareRequestLike): string {
  return String(req.method ?? (req as { raw?: { method?: string } }).raw?.method ?? "UNKNOWN");
}

function readPath(req: MiddlewareRequestLike): string {
  return String(
    req.originalUrl ?? req.path ?? req.url ?? (req as { raw?: { url?: string } }).raw?.url ?? "unknown"
  );
}

function subscribe(res: MiddlewareResponseLike, event: "finish" | "close", callback: () => void): void {
  if (typeof res.on === "function") {
    res.on(event, callback);
    return;
  }

  if (typeof res.addListener === "function") {
    res.addListener(event, callback);
  }
}

export function createMiddleware(
  emit: (event: LogEvent) => void,
  contextFactory: () => LogContext,
  config: PilotConfig
): (req: MiddlewareRequestLike, res: MiddlewareResponseLike, next?: (error?: unknown) => void) => void {
  return (req, res, next) => {
    const timer = startTimer();
    let logged = false;

    const logRequest = () => {
      if (logged) {
        return;
      }
      logged = true;

      emit({
        timestamp: new Date().toISOString(),
        level: "info",
        event: "request",
        method: readMethod(req),
        path: readPath(req),
        statusCode: Number((res as { statusCode?: number }).statusCode ?? 0),
        durationMs: timer.stop(),
        context: contextFactory()
      });
    };

    subscribe(res, "finish", logRequest);
    subscribe(res, "close", logRequest);

    if (typeof next === "function") {
      try {
        next();
      } catch (error) {
        emit({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "request:error",
          method: readMethod(req),
          path: readPath(req),
          statusCode: Number((res as { statusCode?: number }).statusCode ?? 500),
          durationMs: timer.stop(),
          context: contextFactory(),
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { name: "Error", message: String(error) }
        });

        config.onError?.(error, {
          level: "error",
          event: {
            timestamp: new Date().toISOString(),
            level: "error",
            event: "request:error",
            context: contextFactory()
          }
        });

        throw error;
      }
    }
  };
}
