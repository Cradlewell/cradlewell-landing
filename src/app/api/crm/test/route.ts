import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: "Missing env vars",
      SUPABASE_URL: url ? "SET" : "MISSING",
      SUPABASE_ANON_KEY: key ? "SET" : "MISSING",
    });
  }

  try {
    const res = await fetch(`${url}/rest/v1/leads?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const data = await res.json();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      SUPABASE_URL: "SET",
      SUPABASE_ANON_KEY: "SET",
      result: data,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
