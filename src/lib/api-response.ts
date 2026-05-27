import { NextResponse } from "next/server";

// Replaces the 127 copies of:
//   if (error) { console.error("[route]", error); return NextResponse.json({ error: "..." }, { status: 500 }); }

type SupabaseError = { message?: string; code?: string } | null;

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function err(
  message: string,
  status = 500,
  context?: string,
  cause?: SupabaseError
): NextResponse {
  if (cause) {
    console.error(`[${context ?? "api"}]`, cause.message ?? cause);
  }
  return NextResponse.json({ error: message }, { status });
}

export function dbErr(context: string, cause: SupabaseError): NextResponse {
  return err("Internal server error", 500, context, cause);
}

// Usage in route handlers:
//
//   const { data, error } = await supabase.from("leads").select("*");
//   if (error) return dbErr("leads GET", error);
//   return ok(data);
