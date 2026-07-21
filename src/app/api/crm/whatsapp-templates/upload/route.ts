import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export const runtime = "nodejs";

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const APP_ID_ENV   = process.env.WHATSAPP_APP_ID ?? process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID;
const GRAPH        = "https://graph.facebook.com/v21.0";

// Meta requires an "example" media handle when a template header is IMAGE / VIDEO /
// DOCUMENT. That handle comes from the Resumable Upload API:
//   1. resolve the App ID (from env, else derive it from the access token),
//   2. start an upload session,
//   3. upload the bytes → returns the handle (`h:...`).
async function resolveAppId(): Promise<string | null> {
  if (APP_ID_ENV) return APP_ID_ENV;
  // Derive from the token itself — debug_token returns the owning app id.
  const res = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(ACCESS_TOKEN)}&access_token=${encodeURIComponent(ACCESS_TOKEN)}`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data?.app_id ?? null;
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const appId = await resolveAppId();
  if (!appId) {
    return NextResponse.json({ error: "Could not resolve Meta App ID — set WHATSAPP_APP_ID in the environment." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileType = file.type || "application/octet-stream";

  // 1) Start a resumable upload session.
  const startRes = await fetch(
    `${GRAPH}/${appId}/uploads?file_name=${encodeURIComponent(file.name)}&file_length=${bytes.length}&file_type=${encodeURIComponent(fileType)}&access_token=${encodeURIComponent(ACCESS_TOKEN)}`,
    { method: "POST" }
  );
  const startJson = await startRes.json().catch(() => ({}));
  if (!startRes.ok || !startJson.id) {
    console.error("[whatsapp-templates upload:start] Meta error", JSON.stringify(startJson?.error ?? startJson));
    return NextResponse.json({ error: startJson?.error?.message || "Failed to start upload" }, { status: 400 });
  }

  // 2) Upload the bytes → returns the header handle.
  const upRes = await fetch(`${GRAPH}/${startJson.id}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${ACCESS_TOKEN}`,
      file_offset: "0",
    },
    body: bytes,
  });
  const upJson = await upRes.json().catch(() => ({}));
  if (!upRes.ok || !upJson.h) {
    console.error("[whatsapp-templates upload:bytes] Meta error", JSON.stringify(upJson?.error ?? upJson));
    return NextResponse.json({ error: upJson?.error?.message || "Failed to upload media" }, { status: 400 });
  }

  return NextResponse.json({ handle: upJson.h });
}
