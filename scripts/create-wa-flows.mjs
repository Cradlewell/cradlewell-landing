/**
 * Creates and publishes two WhatsApp Flows:
 *   1. Due-date picker  (for Expecting moms)
 *   2. Care-start-date picker  (for Born babies)
 *
 * Run once:
 *   WHATSAPP_ACCESS_TOKEN=... WHATSAPP_WABA_ID=... node scripts/create-wa-flows.mjs
 *
 * Copy the printed IDs into your .env:
 *   WHATSAPP_FLOW_DUE_DATE_ID=...
 *   WHATSAPP_FLOW_CARE_DATE_ID=...
 */

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID      = process.env.WHATSAPP_WABA_ID;

if (!ACCESS_TOKEN || !WABA_ID) {
  console.error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_WABA_ID");
  process.exit(1);
}

const BASE = "https://graph.facebook.com/v21.0";

// ── Flow screen definitions ───────────────────────────────────────────────────

function makeDatePickerScreen(fieldName, label) {
  return {
    version: "6.0",
    screens: [
      {
        id: "MAIN",
        title: "Select Date",
        terminal: true,
        success: true,
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "Form",
              name: "date_form",
              children: [
                {
                  type: "DatePicker",
                  name: fieldName,
                  label,
                  required: true,
                },
                {
                  type: "Footer",
                  label: "Confirm",
                  "on-click-action": {
                    name: "complete",
                    payload: {
                      [fieldName]: `\${form.${fieldName}}`,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(options?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function createFlow(name) {
  const data = await apiJson(`${BASE}/${WABA_ID}/flows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, categories: ["OTHER"] }),
  });
  return data.id;
}

async function uploadFlowJson(flowId, screenJson) {
  const blob = new Blob([JSON.stringify(screenJson)], { type: "application/json" });
  const form = new FormData();
  form.append("file", blob, "flow.json");
  form.append("name", "flow.json");
  form.append("asset_type", "FLOW_JSON");

  const data = await apiJson(`${BASE}/${flowId}/assets`, {
    method: "POST",
    body: form,
  });
  return data;
}

async function publishFlow(flowId) {
  return apiJson(`${BASE}/${flowId}/publish`, { method: "POST" });
}

async function buildFlow(name, fieldName, label) {
  console.log(`\nCreating flow: ${name}...`);
  const flowId = await createFlow(name);
  console.log(`  Created → flow_id=${flowId}`);

  console.log(`  Uploading screen JSON...`);
  await uploadFlowJson(flowId, makeDatePickerScreen(fieldName, label));
  console.log(`  Uploaded.`);

  console.log(`  Publishing...`);
  await publishFlow(flowId);
  console.log(`  Published.`);

  return flowId;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const dueDateId   = await buildFlow("Cradlewell Due Date",       "due_date",        "Expected due date");
    const careDateId  = await buildFlow("Cradlewell Care Start Date", "care_start_date", "When would you like care to start?");

    console.log("\n✅ Done! Add these to your .env:\n");
    console.log(`WHATSAPP_FLOW_DUE_DATE_ID=${dueDateId}`);
    console.log(`WHATSAPP_FLOW_CARE_DATE_ID=${careDateId}`);
  } catch (err) {
    console.error("\n❌ Failed:", err.message);
    process.exit(1);
  }
})();
