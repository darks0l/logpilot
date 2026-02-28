import test from "node:test";
import assert from "node:assert/strict";
import { pilot } from "../src/index.js";

function createCapture() {
  const logs: string[] = [];
  return {
    logs,
    output: {
      log: (line: unknown) => logs.push(String(line)),
      info: (line: unknown) => logs.push(String(line)),
      warn: (line: unknown) => logs.push(String(line)),
      error: (line: unknown) => logs.push(String(line)),
      debug: (line: unknown) => logs.push(String(line))
    }
  };
}

test("pilot wraps sync function and logs success", () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "debug", context: {}, silent: false });

  const fn = pilot((a: number, b: number) => a + b);
  const result = fn(2, 3);

  assert.equal(result, 5);
  assert.ok(capture.logs.some((line) => line.includes('"event":"function:success"')));
});

test("pilot wraps async function and logs result", async () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "info" });

  const fn = pilot(async (a: string) => `${a}-ok`);
  const result = await fn("x");

  assert.equal(result, "x-ok");
  const successLog = capture.logs.find((line) => line.includes('"event":"function:success"'));
  assert.ok(successLog);
  assert.ok(successLog?.includes('"durationMs"'));
});

test("pilot captures thrown errors", () => {
  const capture = createCapture();
  let onErrorCalled = false;

  pilot.configure({
    output: capture.output,
    format: "json",
    level: "debug",
    onError: () => {
      onErrorCalled = true;
    }
  });

  const fn = pilot(() => {
    throw new Error("boom");
  });

  assert.throws(() => fn(), /boom/);
  assert.equal(onErrorCalled, true);
  assert.ok(capture.logs.some((line) => line.includes('"event":"function:error"')));
});

test("pilot captures async rejected errors", async () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "debug" });

  const fn = pilot(async () => {
    throw new Error("reject");
  });

  await assert.rejects(() => fn(), /reject/);
  assert.ok(capture.logs.some((line) => line.includes('"event":"function:error"')));
});

test("pilot child context is merged", () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", context: { service: "api" }, level: "info" });

  const child = pilot.child({ requestId: "abc" });
  child.info("hello", { route: "/x" });

  const entry = capture.logs.at(-1) ?? "";
  assert.ok(entry.includes('"service":"api"'));
  assert.ok(entry.includes('"requestId":"abc"'));
  assert.ok(entry.includes('"route":"/x"'));
});

test("configure level filters debug logs", () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "warn" });

  pilot.debug("not shown");
  pilot.warn("shown");

  assert.equal(capture.logs.length, 1);
  assert.ok(capture.logs[0].includes('"level":"warn"'));
});

test("silent mode suppresses output", () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", silent: true, level: "debug" });

  pilot.info("hidden");
  assert.equal(capture.logs.length, 0);

  pilot.configure({ silent: false });
});

test("wrap object methods", async () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "info" });

  const db = {
    async getUser(id: string) {
      return { id };
    }
  };

  const wrapped = pilot.wrap(db);
  const result = await wrapped.getUser("42");

  assert.deepEqual(result, { id: "42" });
  assert.ok(capture.logs.some((line) => line.includes("Object.getUser")));
});

test("wrapper preserves this binding", () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "info" });

  class Counter {
    value = 1;
    inc(step: number) {
      this.value += step;
      return this.value;
    }
  }

  const wrapped = pilot.wrap(new Counter());
  const value = wrapped.inc(2);

  assert.equal(value, 3);
});

test("wrap options allow custom function name", () => {
  const capture = createCapture();
  pilot.configure({ output: capture.output, format: "json", level: "info" });

  const fn = pilot((x: number) => x * 2, { name: "doubleFn" });
  fn(3);

  assert.ok(capture.logs.some((line) => line.includes('"functionName":"doubleFn"')));
});
