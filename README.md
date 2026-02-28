<p align="center">
  <img src="./assets/darksol-logo.png" alt="DARKSOL" width="140" />
</p>

# logpilot

Zero-config function-level structured logging for JavaScript and TypeScript services.

[![npm version](https://img.shields.io/npm/v/%40darksol%2Flogpilot)](https://www.npmjs.com/package/@darksol/logpilot)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node >=18](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](https://nodejs.org)

## Why this exists

Most app logs are either too noisy or not structured enough to debug production issues quickly. `logpilot` wraps your functions and emits consistent events (args, duration, result/error, context) without forcing a logger migration.

## What it does

- Wraps sync/async functions with structured success/error events
- Adds timestamps, duration, and function metadata automatically
- Supports redaction of sensitive keys (`password`, `token`, etc.)
- Offers global config + scoped child loggers
- Includes Express/Fastify-compatible middleware helper
- Can wrap object/class methods for bulk instrumentation

## Quickstart

```bash
npm install @darksol/logpilot
```

```ts
import { pilot } from "@darksol/logpilot";

pilot.configure({
  level: "info",
  format: "auto",
  context: { service: "billing-api" }
});

const sum = pilot((a: number, b: number) => a + b);
const result = await sum(2, 3);
```

## Real examples

```ts
import { pilot } from "@darksol/logpilot";

const getUser = pilot(async (id: string) => ({ id, role: "admin" }));
await getUser("u_1");

const reqLog = pilot.child({ requestId: "req-42" });
reqLog.info("request started", { route: "/users/:id" });
```

```ts
// Wrap methods on an existing object
class Service {
  getOrder(id: string) {
    return { id, status: "ok" };
  }
}

const service = pilot.wrap(new Service());
service.getOrder("o_100");
```

## Config / options

| Option | Type | Default | Description |
|---|---|---|---|
| `level` | `"debug" \| "info" \| "warn" \| "error"` | `"info"` | Minimum log level |
| `format` | `"auto" \| "pretty" \| "json"` | `"auto"` | Output format (`auto` picks pretty unless `NODE_ENV=production`) |
| `output` | logger-like object | `console` | Destination with `info/warn/error/debug/log` or `.write()` |
| `redact` | `string[]` | sensible defaults | Case-insensitive key masking list |
| `context` | `Record<string, unknown>` | `{}` | Global fields merged into each event |
| `onError` | callback | `undefined` | Hook invoked when wrapper/middleware catches errors |
| `silent` | `boolean` | `false` | Disable log output entirely |

## Architecture / flow

1. `pilot(fn)` creates a thin wrapper around your function.
2. On invocation, it captures start time + context.
3. On success/failure, it emits one structured event with metadata.
4. Formatter renders event as pretty text or JSON.
5. Output is written to configured destination.

## Benchmarks / perf notes

`logpilot` is intentionally lightweight (zero runtime dependencies). It adds small wrapper overhead from timing, serialization, and output I/O. For latency-sensitive paths, prefer JSON output and conservative payload sizes.

## Limitations + roadmap

### Current limitations

- No built-in log shipping (expects host platform/collector)
- Redaction is key-based (not full PII detection)
- Middleware helper targets common Express/Fastify request shapes

### Roadmap

- Optional custom serializer hooks
- Additional middleware adapters with typed helpers
- Extended docs for high-throughput production setups

## License + links

- License: [MIT](./LICENSE)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- npm: <https://www.npmjs.com/package/@darksol/logpilot>
- Issues: <https://github.com/darks0l/logpilot/issues>
