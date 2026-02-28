import { redactValue } from "./redact.js";
import { LogEvent, LogFormat, LogLevel, LoggerOutput } from "./types.js";

const COLORS: Record<LogLevel, string> = {
  debug: "\u001b[36m",
  info: "\u001b[32m",
  warn: "\u001b[33m",
  error: "\u001b[31m"
};

const RESET = "\u001b[0m";

export function resolveFormat(format: LogFormat): Exclude<LogFormat, "auto"> {
  if (format === "auto") {
    return process.env.NODE_ENV === "production" ? "json" : "pretty";
  }
  return format;
}

function stringifyMeta(event: LogEvent): string {
  const meta: Record<string, unknown> = { ...event };
  delete meta.timestamp;
  delete meta.level;
  delete meta.message;
  delete meta.event;

  const keys = Object.keys(meta);
  if (keys.length === 0) {
    return "";
  }

  return ` ${JSON.stringify(meta)}`;
}

export function formatPretty(event: LogEvent): string {
  const color = COLORS[event.level];
  const headline = `${event.timestamp} ${event.level.toUpperCase()} ${event.message ?? event.event}`;
  return `${color}${headline}${RESET}${stringifyMeta(event)}`;
}

export function formatJson(event: LogEvent): string {
  return JSON.stringify(event);
}

export function formatEvent(event: LogEvent, format: LogFormat): string {
  const resolved = resolveFormat(format);
  return resolved === "json" ? formatJson(event) : formatPretty(event);
}

function pickMethod(output: LoggerOutput, level: LogLevel): ((line: string) => void) | undefined {
  const selected =
    (output[level] as ((...args: unknown[]) => void) | undefined) ??
    output.log;

  if (selected) {
    return (line: string) => selected(line);
  }

  if (output.write) {
    return (line: string) => output.write?.(line);
  }

  return undefined;
}

export function emitEvent(
  output: LoggerOutput,
  event: LogEvent,
  format: LogFormat,
  redactList: string[]
): void {
  const redactedEvent = redactValue(event, redactList);
  const line = formatEvent(redactedEvent, format);
  const method = pickMethod(output, event.level);
  if (method) {
    method(line);
  }
}
