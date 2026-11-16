// CRM data-layer tests. Run with: npm test
// Uses Node's built-in runner, so there is nothing extra to install.
import { test } from "node:test";
import assert from "node:assert/strict";
import { settleTasks, stageKey, phoneDigits, uiLeadToDb } from "../src/components/crm-v2/data.js";

const NOW = new Date("2026-11-16T10:00:00Z");
const task = (id, extra = {}) => ({ id, leadId: "L1", type: "Call", action: "Call", due: NOW, status: "open", ...extra });
const lead = (stage, extra = {}) => ({ id: "L1", stage, owner: "Asha", ...extra });
const before = (stage) => new Map([["L1", stage]]);

test("Lost cancels the lead's open tasks and leaves other leads alone", () => {
  const fs = [task("a"), task("b", { leadId: "L2" }), task("c", { status: "done" })];
  const out = settleTasks(fs, [lead("Lost")], before("Qualified"), NOW);
  assert.equal(out.find((f) => f.id === "a").status, "cancelled");
  assert.equal(out.find((f) => f.id === "b").status, "open");
  assert.equal(out.find((f) => f.id === "c").status, "done");
});

test("Won keeps payment tasks open", () => {
  const fs = [task("a"), task("p", { type: "Payment" })];
  const out = settleTasks(fs, [lead("Won")], before("Payment pending"), NOW);
  assert.equal(out.find((f) => f.id === "a").status, "cancelled");
  assert.equal(out.find((f) => f.id === "p").status, "open");
});

test("Deferred replaces open tasks with one reconnect call on the date", () => {
  const until = new Date("2026-12-01T10:00:00");
  const out = settleTasks([task("a")], [lead("Deferred", { deferredUntil: until, deferNote: "In-laws visiting" })], before("Qualified"), NOW);
  const open = out.filter((f) => f.status === "open");
  assert.equal(open.length, 1);
  assert.equal(open[0].auto, "Deferred");
  assert.equal(open[0].due.getTime(), until.getTime());
  assert.equal(open[0].owner, "Asha");
  assert.match(open[0].action, /In-laws visiting/);
});

test("Undoing a Lost soon after reopens the tasks it cancelled", () => {
  const lost = settleTasks([task("a")], [lead("Lost")], before("Qualified"), NOW);
  const back = settleTasks(lost, [lead("Qualified")], before("Lost"), new Date(NOW.getTime() + 60000));
  assert.equal(back.find((f) => f.id === "a").status, "open");
});

test("Reviving a long-lost lead does not bring back its old tasks", () => {
  const lost = settleTasks([task("a")], [lead("Lost")], before("Qualified"), NOW);
  const later = settleTasks(lost, [lead("Qualified")], before("Lost"), new Date(NOW.getTime() + 30 * 86400000));
  assert.equal(later.find((f) => f.id === "a").status, "cancelled");
});

test("Leaving Deferred drops the pending reconnect call", () => {
  const until = new Date("2026-12-01T10:00:00");
  const deferred = settleTasks([], [lead("Deferred", { deferredUntil: until })], before("Qualified"), NOW);
  const back = settleTasks(deferred, [lead("Qualified")], before("Deferred"), NOW);
  assert.equal(back.filter((f) => f.status === "open").length, 0);
});

test("stageKey changes when a deferred lead gets a new date", () => {
  const a = stageKey(lead("Deferred", { deferredUntil: new Date("2026-12-01") }));
  const b = stageKey(lead("Deferred", { deferredUntil: new Date("2026-12-05") }));
  assert.notEqual(a, b);
  assert.equal(stageKey(lead("Qualified", { deferredUntil: new Date("2026-12-01") })), stageKey(lead("Qualified")));
});

test("phones are stored as the bare 10-digit mobile", () => {
  for (const raw of ["+91 98450 12345", "919845012345", "09845012345", "98450-12345", "9845012345"]) assert.equal(phoneDigits(raw), "9845012345");
  assert.equal(phoneDigits("12345"), "12345");
  assert.equal(phoneDigits(""), "");
});

test("a lead saved from the CRM matches the website form's phone format", () => {
  const row = uiLeadToDb({ id: "L1", name: "Asha", phone: "+91 98450 12345", stage: "New", createdAt: NOW, lastActivity: { none: true } }, { packageValue: () => 0, serviceDays: () => 0 });
  assert.equal(row.phone, "9845012345");
  assert.equal(row.whatsapp, "9845012345");
});

/* ---------- Partial updates and refresh merging (H5) ---------- */
import { leadPatch, mergeOp, applyMetaPatch, mergeRemote, mergeRemoteMap, isRemote, diffById } from "../src/components/crm-v2/data.js";

test("a lead edit sends only the changed columns and meta keys", () => {
  const a = { id: "L1", name: "Asha", stage: "New", meta: { tag: "Hot", keyNotes: ["x"], careKind: "B" } };
  const b = { id: "L1", name: "Asha", stage: "Qualified", meta: { tag: "Hot", keyNotes: ["x", "y"] } };
  assert.deepEqual(leadPatch(a, b), { row: { stage: "Qualified" }, meta: { set: { keyNotes: ["x", "y"] }, unset: ["careKind"] } });
  assert.equal(leadPatch(a, { ...a, meta: { ...a.meta } }), null);
});

test("two queued patches for one lead keep both changes", () => {
  const p1 = { coll: "leads", op: "patch", id: "L1", row: { stage: "Qualified" }, meta: { set: { tag: "Hot" }, unset: ["a"] } };
  const p2 = { coll: "leads", op: "patch", id: "L1", row: { owner: "Ravi" }, meta: { set: { a: 1 }, unset: ["tag"] } };
  const m = mergeOp(p1, p2);
  assert.deepEqual(m.row, { stage: "Qualified", owner: "Ravi" });
  assert.deepEqual(m.meta, { set: { a: 1 }, unset: ["tag"] });
});

test("a patch on a new lead not yet sent is folded into its full row", () => {
  const up = { coll: "leads", op: "upsert", id: "L1", row: { name: "Asha", stage: "New", meta: { tag: "Hot" } } };
  const m = mergeOp(up, { coll: "leads", op: "patch", id: "L1", row: { stage: "Qualified" }, meta: { set: { x: 1 }, unset: ["tag"] } });
  assert.equal(m.op, "upsert");
  assert.deepEqual(m.row, { name: "Asha", stage: "Qualified", meta: { x: 1 } });
  assert.deepEqual(applyMetaPatch({ a: 1, b: 2 }, { set: { c: 3 }, unset: ["a"] }), { b: 2, c: 3 });
});

test("diffById emits patches for edits and full rows for new records", () => {
  const toRow = (l) => ({ id: l.id, name: l.name, meta: { note: l.note } });
  const a = { id: "1", name: "A", note: "x" };
  const ops = diffById([a], [{ ...a, note: "y" }, { id: "2", name: "B", note: "" }], "leads", toRow, { patch: leadPatch });
  assert.deepEqual(ops.map((o) => o.op), ["patch", "upsert"]);
  assert.deepEqual(ops[0].meta.set, { note: "y" });
});

test("a refresh takes the server's version except for records still being saved", () => {
  const local = [{ id: "1", v: "mine" }, { id: "2", v: "old" }, { id: "3", v: "new here" }, { id: "4", v: "gone" }];
  const remote = [{ id: "1", v: "theirs" }, { id: "2", v: "updated" }, { id: "5", v: "website lead" }];
  const busy = new Set(["1", "3"]);
  const gone = [];
  const out = mergeRemote(local, remote, (id) => !busy.has(id), (id) => gone.push(id));
  assert.deepEqual(out.map((x) => `${x.id}:${x.v}`).sort(), ["1:mine", "2:updated", "3:new here", "5:website lead"]);
  assert.deepEqual(gone, ["4"]);
  assert.ok(isRemote(out.find((x) => x.id === "2")));
  assert.ok(!isRemote(out.find((x) => x.id === "1")));
});

test("a refresh with nothing new returns the same array, and a pending delete stays deleted", () => {
  const local = [{ id: "1", v: 1 }];
  assert.equal(mergeRemote(local, [{ id: "1", v: 1 }], () => true), local);
  const afterDelete = mergeRemote([], [{ id: "9", v: 1 }], (id) => id !== "9");
  assert.deepEqual(afterDelete, []);
  const tl = { a: [{ id: "e1" }] };
  assert.equal(mergeRemoteMap(tl, { a: [{ id: "e1" }] }, () => true), tl);
});
