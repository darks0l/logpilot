import test from "node:test";
import assert from "node:assert/strict";
import { formatEvent, resolveFormat } from "../src/index.js";

test("resolveFormat uses pretty in development", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  assert.equal(resolveFormat("auto"), "pretty");
  process.env.NODE_ENV = previous;
});

test("resolveFormat uses json in production", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert.equal(resolveFormat("auto"), "json");
  process.env.NODE_ENV = previous;
});

test("formatEvent produces JSON", () => {
  const line = formatEvent(
    {
      timestamp: new Date("2026-01-01").toISOString(),
      level: "info",
      event: "log",
      message: "hello",
      context: { a: 1 }
    },
    "json"
  );

  const parsed = JSON.parse(line) as { message: string; context: { a: number } };
  assert.equal(parsed.message, "hello");
  assert.equal(parsed.context.a, 1);
});

test("formatEvent produces pretty output", () => {
  const line = formatEvent(
    {
      timestamp: new Date("2026-01-01").toISOString(),
      level: "warn",
      event: "log",
      message: "warn-msg",
      context: { id: "1" }
    },
    "pretty"
  );

  assert.ok(line.includes("WARN"));
  assert.ok(line.includes("warn-msg"));
  assert.ok(line.includes("\u001b[33m"));
});
