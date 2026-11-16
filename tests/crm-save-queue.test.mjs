// Save-queue behaviour when the server can't be reached (M3/M4). Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal browser stand-ins
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
globalThis.window = { location: { href: "/crm" } };
let mode = "down";
const sent = [];
globalThis.fetch = async (_url, init) => {
  if (mode === "down") throw new Error("offline");
  if (mode === "expired") return { status: 401, ok: false, json: async () => ({}) };
  sent.push(...JSON.parse(init.body).ops);
  return { status: 200, ok: true, json: async () => ({ ok: true, failed: [], assigned: {} }) };
};

const q = await import("../src/components/crm-v2/data.js");

test("an edit made offline is kept, survives a reload, and is sent when back online", { timeout: 20000 }, async () => {
  const errors = [];
  q.setSaveErrorHandler((m) => errors.push(m));
  q.enqueue([{ coll: "leads", op: "patch", id: "L1", row: { stage: "Qualified" }, meta: { set: {}, unset: [] } }]);
  await q.flush();
  assert.ok(q.hasPending(), "the change is still pending");
  assert.match(errors.at(-1), /kept/);
  const saved = JSON.parse(store.get("cw-crm-unsaved"));
  assert.equal(saved[0].op.id, "L1");

  // A second edit to the same lead while offline is merged, not lost
  q.enqueue([{ coll: "leads", op: "patch", id: "L1", row: { owner: "Ravi" }, meta: { set: {}, unset: [] } }]);
  await q.flush();

  // Back online: one write carrying both changes
  mode = "up";
  await q.retryStash();
  const l1 = sent.filter((o) => o.id === "L1");
  assert.equal(l1.length, 1);
  assert.deepEqual(l1[0].row, { stage: "Qualified", owner: "Ravi" });
  assert.ok(!q.hasPending());
  assert.equal(store.get("cw-crm-unsaved"), undefined);
});

test("an expired session keeps the change and asks to sign in again", async () => {
  mode = "expired";
  q.enqueue([{ coll: "followups", op: "upsert", id: "F1", row: { note: "call back" } }]);
  await q.flush();
  assert.equal(window.location.href, "/crm/login?expired=1");
  assert.equal(JSON.parse(store.get("cw-crm-unsaved"))[0].op.id, "F1");
  // Next visit, signed in again: restored and sent before anything loads
  mode = "up";
  assert.equal(q.restoreStash(), 1);
  await q.retryStash();
  assert.ok(sent.some((o) => o.id === "F1"));
  assert.ok(!q.hasPending());
});
