# logpilot

Zero-config function-level structured logging for JavaScript and TypeScript.

## Install

```bash
npm install logpilot
```

## Quick Start

```ts
import { pilot } from "logpilot";
const sum = pilot((a: number, b: number) => a + b);
await sum(2, 3);
```

## Full API Reference

### `pilot(fn, options?)`
Wrap any function and auto-log function name, args, result, duration, timestamp, and errors.

```ts
const wrapped = pilot(async (id: string) => ({ id }));
const user = await wrapped("u_1");
```

### `pilot.configure(opts)`
Global runtime configuration.

```ts
pilot.configure({
  level: "info",
  format: "auto",
  output: console,
  redact: ["password", "token", "secret", "key", "authorization"],
  context: { service: "my-api", version: "1.0" },
  onError: (err, ctx) => {
    // global hook
  },
  silent: false
});
```

### `pilot.child(context)`
Create scoped logger with inherited global config.

```ts
const log = pilot.child({ requestId: "abc-123" });
await log(async () => "ok")();
```

### `pilot.middleware()`
Express/Fastify-compatible request middleware.

```ts
app.use(pilot.middleware());
```

### `pilot.wrap(obj)`
Wrap object/class methods for automatic logging.

```ts
const db = pilot.wrap(database);
await db.findUser("u_1");
```

### Direct Logging

```ts
pilot.info("message", { extra: "data" });
pilot.warn("something weird");
pilot.error("failed", { err });
pilot.debug("verbose stuff");
```

## Middleware Example

```ts
import express from "express";
import { pilot } from "logpilot";

const app = express();
app.use(pilot.middleware());
```

## Object Wrapping Example

```ts
class Service {
  getOrder(id: string) {
    return { id };
  }
}

const service = pilot.wrap(new Service());
service.getOrder("o-1");
```

## Redaction Example

```ts
pilot.configure({ redact: ["password", "token", "secret", "key", "authorization"] });
await pilot(async (body: unknown) => body)({ email: "a@b.com", password: "123" });
```

## Child Logger Example

```ts
const requestLog = pilot.child({ requestId: "req-42" });
requestLog.info("request started", { route: "/users" });
```

## Configuration Reference

- `level`: `debug | info | warn | error`
- `format`: `auto | pretty | json` (`auto` = pretty unless `NODE_ENV=production`)
- `output`: console-like object with `info/warn/error/debug/log` or a `.write()` method
- `redact`: case-insensitive key match list for sensitive field masking
- `context`: global structured fields merged into every log event
- `onError`: callback for wrapper and middleware errors
- `silent`: disable all log output when `true`

## Pretty vs JSON Output

Pretty (development):

```text
2026-02-28T10:00:00.000Z INFO function:success {"functionName":"fetchUser","durationMs":2.1}
```

JSON (production):

```json
{"timestamp":"2026-02-28T10:00:00.000Z","level":"info","event":"function:success","functionName":"fetchUser","durationMs":2.1}
```

## Contributing

1. Fork and clone.
2. Run `npm install`.
3. Run `npm test` before opening a PR.
4. Keep runtime dependency count at zero.
