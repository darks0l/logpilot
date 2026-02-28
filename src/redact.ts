const REDACTED = "[REDACTED]";

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shouldRedact(key: string, redactList: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return redactList.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
}

function redactRecursive(value: unknown, redactList: string[], seen: WeakSet<object>): unknown {
  if (!isObjectLike(value)) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactRecursive(item, redactList, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (shouldRedact(key, redactList)) {
      output[key] = REDACTED;
      continue;
    }
    output[key] = redactRecursive(entry, redactList, seen);
  }

  return output;
}

export function redactValue<T>(value: T, redactList: string[]): T {
  const seen = new WeakSet<object>();
  return redactRecursive(value, redactList, seen) as T;
}
