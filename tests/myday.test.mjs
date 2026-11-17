// My Day rules. Run with: npm test
// Fixtures only: nothing here talks to the database.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMyDay, applyOutcome, outcomeProblem, snoozeTask, reconcileTasks, followUpDatesToTasks,
  istDayDiff, istDayStart, fromIstInput, laterToday, tomorrowAt, balanceOf, MYDAY_RULES,
} from "../src/components/crm-v2/myday.js";

// 17 Nov 2026, 2:00 PM IST
const NOW = new Date("2026-11-17T08:30:00Z");
const ist = (s) => new Date(`${s}+05:30`);
const lead = (id, extra = {}) => ({
  id, name: `Lead ${id}`, phone: "9000000000", stage: "Qualified", careKind: "B",
  createdAt: ist("2026-11-16T10:00:00"), stageSince: ist("2026-11-16T10:00:00"),
  lastActivity: { type: "Call", at: ist("2026-11-16T11:00:00"), none: false }, ...extra,
});
const task = (id, leadId, due, extra = {}) => ({ id, leadId, type: "Call", action: "Call back", due, status: "open", createdAt: ist("2026-11-16T09:00:00"), ...extra });
const ids = (rows) => rows.map((r) => r.id);
const day = (args) => buildMyDay({ now: NOW, ...args });

test("a task due later today is under Today, a past one under Overdue", () => {
  const leads = [lead("a"), lead("b")];
  const fus = [task("t1", "a", ist("2026-11-17T17:00:00")), task("t2", "b", ist("2026-11-17T10:00:00"))];
  const { queue } = day({ leads, followups: fus });
  assert.deepEqual(ids(queue.today), ["task:t1"]);
  assert.deepEqual(ids(queue.overdue), ["task:t2"]);
  assert.equal(queue.scheduling.length, 0);
});

test("an active lead with no next action is under Needs scheduling, never Overdue", () => {
  const { queue } = day({ leads: [lead("a", { stageSince: ist("2026-10-01T10:00:00") })], rules: { stuckDays: { Qualified: 3 } } });
  assert.deepEqual(ids(queue.scheduling), ["plan:a"]);
  assert.equal(queue.overdue.length + queue.today.length, 0);
  assert.equal(queue.scheduling[0].stale, true);
  assert.match(queue.scheduling[0].reason, /Qualified lead with no next action/);
});

test("Lost and Won leads are not asked for a next action; Won keeps payment tasks", () => {
  const leads = [lead("l", { stage: "Lost" }), lead("w", { stage: "Won" })];
  const fus = [task("p", "w", ist("2026-11-17T09:00:00"), { type: "Payment" }), task("x", "l", ist("2026-11-17T09:00:00"))];
  const { queue } = day({ leads, followups: fus });
  assert.deepEqual(ids(queue.overdue), ["task:p"]);
  assert.equal(queue.scheduling.length, 0);
});

test("a valid waiting state (automation or manual) creates no task until its review time", () => {
  const waiting = { reason: "Bot is collecting the due date", reviewAt: ist("2026-11-19T10:00:00"), by: "automation" };
  const before = day({ leads: [lead("a", { waiting })] });
  assert.equal(before.queue.today.length + before.queue.overdue.length + before.queue.scheduling.length, 0);
  const onTheDay = buildMyDay({ leads: [lead("a", { waiting })], now: ist("2026-11-19T11:00:00") });
  assert.deepEqual(ids(onTheDay.queue.overdue), ["review:a"]);
});

test("a deferred lead stays quiet until its return time, then needs a step", () => {
  const deferred = lead("d", { stage: "Deferred", deferredUntil: ist("2026-11-20T10:00:00") });
  assert.equal(day({ leads: [deferred] }).queue.scheduling.length, 0);
  const later = buildMyDay({ leads: [deferred], now: ist("2026-11-20T12:00:00") });
  assert.deepEqual(ids(later.queue.scheduling), ["plan:d"]);
  // with the reconnect task Deferred creates, it shows as that task instead
  const withTask = buildMyDay({ leads: [deferred], followups: [task("r", "d", ist("2026-11-20T10:00:00"), { auto: "Deferred" })], now: ist("2026-11-20T09:00:00") });
  assert.deepEqual(ids(withTask.queue.today), ["task:r"]);
});

test("new leads needing first contact are under Today; a first-call task is shown once", () => {
  const fresh = lead("n", { stage: "New", createdAt: ist("2026-11-17T09:00:00"), lastActivity: { none: true } });
  const withTask = lead("m", { stage: "New", createdAt: ist("2026-11-17T09:00:00"), lastActivity: { none: true } });
  const { queue, cards } = day({ leads: [fresh, withTask], followups: [task("f", "m", ist("2026-11-17T16:00:00"))] });
  assert.deepEqual(ids(queue.today).sort(), ["new:n", "task:f"]);
  assert.equal(queue.today.find((r) => r.id === "task:f").kind, "newLead");
  assert.equal(cards.newLeads.received, 2);
  assert.equal(cards.newLeads.needContact, 2);
  // an old uncontacted backlog lead is not today's work
  const old = lead("o", { stage: "New", createdAt: ist("2026-09-01T09:00:00"), lastActivity: { none: true } });
  assert.deepEqual(ids(day({ leads: [old] }).queue.scheduling), ["plan:o"]);
});

test("counts are the lengths of the filtered lists", () => {
  const leads = [lead("a"), lead("b"), lead("c")];
  const fus = [task("1", "a", ist("2026-11-17T18:00:00")), task("2", "b", ist("2026-11-16T10:00:00"))];
  const { queue, cards } = day({ leads, followups: fus });
  assert.equal(cards.followups.dueToday, queue.today.filter((r) => r.taskId).length);
  assert.equal(cards.followups.overdue, queue.overdue.filter((r) => r.taskId).length);
  // each lead lands in exactly one tab
  const all = [...queue.today, ...queue.overdue, ...queue.scheduling].map((r) => r.leadId).sort();
  assert.deepEqual(all, ["a", "b", "c"]);
});

test("distinct tasks for one customer are separate actions", () => {
  const fus = [task("1", "a", ist("2026-11-17T18:00:00")), task("2", "a", ist("2026-11-17T19:00:00"), { type: "Payment" })];
  assert.equal(day({ leads: [lead("a")], followups: fus }).queue.today.length, 2);
});

test("midnight IST is the day boundary, whatever the device time zone", () => {
  const justBefore = ist("2026-11-17T23:59:00");
  const justAfter = ist("2026-11-18T00:01:00");
  assert.equal(istDayDiff(justAfter, justBefore), 1);
  assert.equal(istDayStart(justBefore).toISOString(), "2026-11-16T18:30:00.000Z");
  // a task at 00:30 tomorrow is not today's, even at 11:50 PM
  const late = buildMyDay({ leads: [lead("a")], followups: [task("t", "a", ist("2026-11-18T00:30:00"))], now: ist("2026-11-17T23:50:00") });
  assert.equal(late.queue.today.length, 0);
  assert.equal(late.queue.overdue.length, 0);
  assert.equal(fromIstInput("2026-11-18T10:00").toISOString(), "2026-11-18T04:30:00.000Z");
  assert.equal(istDayDiff(tomorrowAt(NOW), NOW), 1);
  assert.ok(laterToday(NOW) > NOW);
});

test("snoozing moves the existing task, keeps history and updates the counts", () => {
  const fus = [task("t", "a", ist("2026-11-17T10:00:00"))];
  const until = ist("2026-11-18T10:00:00");
  const moved = snoozeTask(fus, "t", until, NOW);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].due.getTime(), until.getTime());
  assert.equal(moved[0].snoozes.length, 1);
  assert.throws(() => snoozeTask(fus, "t", ist("2026-11-17T09:00:00"), NOW));
  assert.equal(day({ leads: [lead("a")], followups: moved }).cards.followups.overdue, 0);
});

test("recording an outcome closes the task and plans the next one in the same records", () => {
  const fus = [task("t", "a", ist("2026-11-17T10:00:00"))];
  const l = lead("a");
  const row = day({ leads: [l], followups: fus }).queue.overdue[0];
  const next = { kind: "task", type: "WhatsApp", action: "Send the package", due: ist("2026-11-18T11:00:00") };
  assert.equal(outcomeProblem({ outcome: "Connected", next, now: NOW }), null);
  const res = applyOutcome({ followups: fus, lead: l, row, outcome: "Connected", next, now: NOW, nextId: "n1" });
  assert.equal(res.followups.find((f) => f.id === "t").status, "done");
  assert.equal(res.followups.find((f) => f.id === "n1").status, "open");
  assert.ok(res.leadPatch.lastContact);
  // submitting twice does not duplicate the next task
  const again = applyOutcome({ followups: res.followups, lead: l, row, outcome: "Connected", next, now: NOW, nextId: "n1" });
  assert.equal(again.followups.filter((f) => f.id === "n1").length, 1);
  // My Day (and Follow-ups, same list) now show tomorrow's task, nothing overdue
  const after = buildMyDay({ leads: [{ ...l, ...res.leadPatch }], followups: res.followups, now: NOW });
  assert.equal(after.queue.overdue.length + after.queue.today.length + after.queue.scheduling.length, 0);
});

test("no answer is an attempt, not customer contact; a next step is required", () => {
  const l = lead("a");
  const row = { id: "task:t", taskId: "t", kind: "contact", type: "Call" };
  assert.equal(outcomeProblem({ outcome: "No answer", next: null, now: NOW }), "Choose the next step.");
  assert.equal(outcomeProblem({ outcome: "No answer", next: { kind: "task", action: "Call", due: ist("2026-11-17T09:00:00") }, now: NOW }), "Pick a time in the future.");
  const res = applyOutcome({ followups: [task("t", "a", NOW)], lead: l, row, outcome: "No answer", next: { kind: "wait", reason: "Asked to call after delivery", reviewAt: ist("2026-11-25T10:00:00") }, now: NOW });
  assert.equal(res.leadPatch.lastContact, undefined);
  assert.equal(res.leadPatch.waiting.reason, "Asked to call after delivery");
  // "Not interested" never needs a next step here: the lost-reason form follows
  assert.equal(outcomeProblem({ outcome: "Not interested", next: null, now: NOW }), null);
});

test("a booking resolves the obsolete booking task, once", () => {
  const l = lead("a", { stage: "Qualified" });
  const fus = [task("rb", "a", ist("2026-11-17T12:00:00"), { auto: "Consult no-show", action: "Call to rebook consult" })];
  const consults = [{ id: "c1", leadId: "a", status: "scheduled", start: ist("2026-11-19T11:00:00"), duration: 30, bookedAt: NOW }];
  const once = reconcileTasks(fus, [l], consults, NOW);
  assert.equal(once.find((f) => f.id === "rb").status, "done");
  assert.equal(reconcileTasks(once, [l], consults, NOW), once); // nothing more to do
  // a consultation booked before the task was created doesn't count
  const old = [{ ...consults[0], start: ist("2026-11-15T11:00:00"), bookedAt: ist("2026-11-14T10:00:00") }];
  assert.equal(reconcileTasks(fus, [l], old, NOW), fus);
});

test("a part payment keeps one payment follow-up for the balance; full payment closes it", () => {
  const won = lead("w", { stage: "Won", dealValue: 50000, amountPaid: 20000, lastWin: { at: NOW, paid: 20000 } });
  assert.deepEqual(balanceOf(won), { known: true, total: 50000, paid: 20000, due: 30000 });
  const once = reconcileTasks([], [won], [], NOW);
  assert.equal(once.length, 1);
  assert.equal(once[0].type, "Payment");
  assert.match(once[0].action, /30,000/);
  // running again (or a duplicate event) does not add a second task
  assert.equal(reconcileTasks(once, [won], [], NOW), once);
  const closed = once.map((f) => ({ ...f, status: "done" }));
  assert.equal(reconcileTasks(closed, [won], [], NOW), closed);
  // paying the rest closes the open payment task
  const paid = { ...won, amountPaid: 50000, paymentStatus: "Paid" };
  assert.equal(reconcileTasks(once, [paid], [], NOW)[0].status, "done");
  // recording a part payment through Record outcome leaves the balance due
  const res = applyOutcome({ followups: once, lead: won, row: { taskId: once[0].id, kind: "payment", type: "Payment" }, outcome: "Payment received", payment: { amount: 10000 }, next: { kind: "task", type: "Payment", action: "Collect the rest", due: ist("2026-11-20T10:00:00") }, now: NOW, nextId: "n" });
  assert.equal(res.leadPatch.amountPaid, 30000);
  assert.equal(res.leadPatch.paymentStatus, "Partial");
  assert.equal(outcomeProblem({ outcome: "Payment received", payment: { amount: 40000 }, balance: balanceOf(won), next: null, now: NOW }), "That's more than the balance due.");
});

test("outstanding payments: unknown amounts are counted as unknown, not zero", () => {
  const leads = [lead("p", { stage: "Payment pending" }), lead("w", { stage: "Won", dealValue: 10000, amountPaid: 4000 }), lead("x", { stage: "Won", dealValue: 5000, amountPaid: 5000 })];
  const { cards, queue } = day({ leads });
  assert.equal(cards.payments.customers, 2);
  assert.equal(cards.payments.amount, 6000);
  assert.equal(cards.payments.unknown, 1);
  // a payment with no follow-up due is not in today's queue (it needs scheduling instead)
  assert.equal(queue.today.length + queue.overdue.length, 0);
});

test("a follow-up date set on the lead becomes a real task (moved or created, never doubled)", () => {
  const when = ist("2026-11-19T10:00:00");
  const l = lead("a", { nextFollowUp: when });
  const created = followUpDatesToTasks([], [l], [], NOW);
  assert.equal(created.length, 1);
  assert.equal(created[0].due.getTime(), when.getTime());
  assert.equal(followUpDatesToTasks(created, [l], [], NOW), created);
  const moved = followUpDatesToTasks([task("t", "a", ist("2026-11-17T10:00:00"))], [l], [], NOW);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].due.getTime(), when.getTime());
  // a consultation booked at that time is the next action already
  const consult = [{ id: "c", leadId: "a", status: "scheduled", start: when }];
  assert.deepEqual(followUpDatesToTasks([], [l], consult, NOW), []);
});

test("consultations: completed only when they all are; past ones without outcome are listed, never auto-completed", () => {
  const leads = [lead("a"), lead("b")];
  const none = day({ leads });
  assert.equal(none.consultations.length, 0);
  assert.equal(none.cards.consultations.total, 0);
  const consults = [
    { id: "c1", leadId: "a", status: "done", outcome: "Interested", start: ist("2026-11-17T10:00:00"), duration: 30 },
    { id: "c2", leadId: "b", status: "scheduled", start: ist("2026-11-17T12:00:00"), duration: 30 },
    { id: "c3", leadId: "b", status: "scheduled", start: ist("2026-11-15T12:00:00"), duration: 30 },
  ];
  const d = day({ leads, consults });
  assert.deepEqual(d.consultations.map((c) => c.status), ["completed", "needsOutcome"]);
  assert.equal(d.cards.consultations.toRecord, 1);
  assert.equal(d.cards.consultations.completed, 1);
  assert.deepEqual(ids(d.queue.overdue), ["consult:c3"]);
  assert.equal(consults[1].status, "scheduled"); // nothing was changed just because time passed
});

test("rules are explicit and overridable", () => {
  assert.ok(MYDAY_RULES.newLeadsSince instanceof Date);
  const l = lead("a", { stage: "Consult done", stageSince: ist("2026-11-10T10:00:00") });
  assert.equal(day({ leads: [l], rules: { stuckDays: { "Consult done": 2 } } }).queue.scheduling[0].stale, true);
  assert.equal(day({ leads: [l], rules: { stuckDays: {} } }).queue.scheduling[0].stale, false);
});

test("needs scheduling lists recently active leads first; the old backlog is kept but grouped", () => {
  const recent = lead("r", { stageSince: ist("2026-11-10T10:00:00"), createdAt: ist("2026-11-01T10:00:00"), lastActivity: { at: ist("2026-11-10T10:00:00"), none: false } });
  const old = lead("o", { stage: "Payment pending", stageSince: ist("2026-06-01T10:00:00"), createdAt: ist("2026-05-01T10:00:00"), lastActivity: { at: ist("2026-06-01T10:00:00"), none: false } });
  const rows = day({ leads: [old, recent] }).queue.scheduling;
  assert.deepEqual(ids(rows), ["plan:r", "plan:o"]);
  assert.deepEqual(rows.map((r) => r.recent), [true, false]);
  // nothing is marked lost or dropped
  assert.equal(rows.length, 2);
});
