import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Paged reads ──────────────────────────────────────────────────────────────
// PostgREST clamps every response to the project's `db.max_rows` (1000 on this
// project). A `.limit(5000)` is therefore silently cut to 1000 with no error and
// no signal — the caller just receives a short list and treats it as the whole
// table. That is how the CRM lost its oldest leads and would shortly have lost
// its oldest follow-ups. Anything that must read a whole table has to page.

export const DB_PAGE_SIZE = 1000;

// Runs `build` over successive ranges until a short page comes back, which is
// the only reliable end-of-table signal (a full page could be the last one, so
// we ask once more and get zero rows). `maxRows` is a backstop so a query whose
// row count keeps growing under us can never loop forever.
export async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  maxRows = 50_000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += DB_PAGE_SIZE) {
    const { data, error } = await build(from, from + DB_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < DB_PAGE_SIZE) break;
  }
  return out;
}
