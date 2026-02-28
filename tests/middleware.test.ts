import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { pilot } from "../src/index.js";

class ResponseStub extends EventEmitter {
  statusCode = 200;
}

test("middleware logs request on finish", () => {
  const logs: string[] = [];
  pilot.configure({
    output: { info: (line: unknown) => logs.push(String(line)) },
    format: "json",
    level: "info",
    context: { service: "svc" }
  });

  const req = { method: "GET", originalUrl: "/health" };
  const res = new ResponseStub();
  const mw = pilot.middleware();

  mw(req, res, () => {
    res.emit("finish");
  });

  assert.equal(logs.length, 1);
  assert.ok(logs[0].includes('"event":"request"'));
  assert.ok(logs[0].includes('"path":"/health"'));
});

test("middleware logs only once for finish+close", () => {
  const logs: string[] = [];
  pilot.configure({
    output: { info: (line: unknown) => logs.push(String(line)) },
    format: "json",
    level: "info"
  });

  const req = { method: "POST", url: "/items" };
  const res = new ResponseStub();
  const mw = pilot.middleware();

  mw(req, res, () => {
    res.emit("finish");
    res.emit("close");
  });

  assert.equal(logs.length, 1);
});

test("middleware rethrows next errors", () => {
  const logs: string[] = [];
  pilot.configure({
    output: {
      info: (line: unknown) => logs.push(String(line)),
      error: (line: unknown) => logs.push(String(line))
    },
    format: "json",
    level: "debug"
  });

  const req = { method: "GET", url: "/err" };
  const res = new ResponseStub();
  const mw = pilot.middleware();

  assert.throws(
    () =>
      mw(req, res, () => {
        throw new Error("fail");
      }),
    /fail/
  );

  assert.ok(logs.some((line) => line.includes('"event":"request:error"')));
});
