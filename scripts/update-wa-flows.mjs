/**
 * Updates the JSON of existing WhatsApp Flows and republishes them.
 * Run with the existing flow IDs already in .env:
 *   WHATSAPP_ACCESS_TOKEN=... node scripts/update-wa-flows.mjs
 */

import "dotenv/config";

const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;
const FLOW_DUE_DATE   = process.env.WHATSAPP_FLOW_DUE_DATE_ID;
const FLOW_CARE_DATE  = process.env.WHATSAPP_FLOW_CARE_DATE_ID;

if (!ACCESS_TOKEN || !FLOW_DUE_DATE || !FLOW_CARE_DATE) {
  console.error("Missing WHATSAPP_ACCESS_TOKEN, WHATSAPP_FLOW_DUE_DATE_ID, or WHATSAPP_FLOW_CARE_DATE_ID in env");
  process.exit(1);
}

const BASE = "https://graph.facebook.com/v21.0";

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
                  label: "Confirm Date",
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

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, ...(options.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function uploadFlowJson(flowId, screenJson) {
  const blob = new Blob([JSON.stringify(screenJson)], { type: "application/json" });
  const form = new FormData();
  form.append("file", blob, "flow.json");
  form.append("name", "flow.json");
  form.append("asset_type", "FLOW_JSON");
  return apiJson(`${BASE}/${flowId}/assets`, { method: "POST", body: form });
}

async function publishFlow(flowId) {
  return apiJson(`${BASE}/${flowId}/publish`, { method: "POST" });
}

async function updateFlow(flowId, name, fieldName, label) {
  console.log(`\nUpdating flow: ${name} (${flowId})...`);
  const result = await uploadFlowJson(flowId, makeDatePickerScreen(fieldName, label));
  console.log(`  Upload result:`, JSON.stringify(result));
  if (result.validation_errors?.length) {
    console.error("  Validation errors:", result.validation_errors);
    return;
  }
  console.log(`  Publishing...`);
  await publishFlow(flowId);
  console.log(`  Done.`);
}

(async () => {
  try {
    await updateFlow(FLOW_DUE_DATE, "Cradlewell Due Date", "due_date", "Expected due date");
    await updateFlow(FLOW_CARE_DATE, "Cradlewell Care Start Date", "care_start_date", "Care start date");
    console.log("\n✅ Both flows updated successfully.");
  } catch (err) {
    console.error("\n❌ Failed:", err.message);
    process.exit(1);
  }
})();
