import test from "node:test";
import assert from "node:assert/strict";
import { redactValue } from "../src/index.js";

test("redactValue masks configured keys", () => {
  const input = {
    user: "a",
    password: "secret",
    nested: {
      token: "123"
    }
  };

  const output = redactValue(input, ["password", "token"]);
  assert.equal(output.password, "[REDACTED]");
  assert.equal(output.nested.token, "[REDACTED]");
});

test("redactValue handles arrays", () => {
  const input = [{ apiKey: "abc" }, { value: 2 }];
  const output = redactValue(input, ["key"]);

  assert.equal(output[0].apiKey, "[REDACTED]");
  assert.equal(output[1].value, 2);
});

test("redactValue handles circular objects", () => {
  const input: { name: string; self?: unknown } = { name: "x" };
  input.self = input;

  const output = redactValue(input, []);
  assert.equal(output.self, "[Circular]");
});
