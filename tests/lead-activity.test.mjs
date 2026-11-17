// Last interaction for leads that come from the website form. Run with: npm test
// Fixtures only: nothing here talks to the database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dbLeadToUi, uiLeadToDb } from "../src/components/crm-v2/data.js";
import { neverContacted } from "../src/components/crm-v2/myday.js";

const ctx = { wonClosure: new Map(), lostClosure: new Map(), nextFollowUp: new Map(), stageSince: new Map(), customerNo: new Map() };
const fx = { packageValue: () => 0, serviceDays: () => null };
const T0 = "2026-11-17T05:00:00.000Z"; // form submitted
const row = (extra = {}) => ({ id: "3f2c-uuid", name: "Asha", phone: "9876543210", stage: "New", source: "Website", created_at: T0, lead_date: T0, last_activity_at: T0, meta: {}, ...extra });

test("a new website enquiry shows the submission date and time as last interaction", () => {
  const l = dbLeadToUi(row(), ctx);
  assert.equal(l.lastActivity.none, false);
  assert.equal(l.lastActivity.type, "Website form");
  assert.equal(l.lastActivity.at.toISOString(), T0);
  // ...but it is still a new lead nobody has called
  assert.equal(neverContacted(l), true);
});

test("a lead created inside the CRM still has no interaction", () => {
  const l = dbLeadToUi(row({ id: "N1794900000000" }), ctx);
  assert.equal(l.lastActivity.none, true);
});

test("a repeat form submission replaces an older CRM interaction, and the next CRM save keeps it", () => {
  const callAt = new Date("2026-11-10T06:00:00Z");
  const first = dbLeadToUi(row(), ctx);
  // a rep called; the CRM saves its copy in meta and in the column
  const called = { ...first, lastActivity: { type: "Call", by: "Priya", at: callAt, none: false } };
  const saved = uiLeadToDb(called, fx);
  const T1 = "2026-11-17T09:15:00.000Z"; // the customer submits the form again
  const again = dbLeadToUi({ ...row(), meta: saved.meta, last_activity_at: T1 }, ctx);
  assert.equal(again.lastActivity.at.toISOString(), T1);
  assert.equal(again.lastActivity.type, "Website form");
  assert.equal(neverContacted(again), false); // the rep had already called
  assert.equal(uiLeadToDb(again, fx).last_activity_at, T1);
});

test("the CRM's own newer interaction is kept when the column is not newer", () => {
  const callAt = new Date("2026-11-17T10:00:00Z");
  const saved = uiLeadToDb({ ...dbLeadToUi(row(), ctx), lastActivity: { type: "Call", by: "Priya", at: callAt, none: false } }, fx);
  const l = dbLeadToUi({ ...row(), meta: saved.meta, last_activity_at: callAt.toISOString() }, ctx);
  assert.equal(l.lastActivity.type, "Call");
  assert.equal(neverContacted(l), false);
});
