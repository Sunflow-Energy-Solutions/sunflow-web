import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Db, Kind } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase is configured. Otherwise the app runs in "this device only" mode. */
export const cloudEnabled = !!(url && key);

export const supabase: SupabaseClient | null = cloudEnabled ? createClient(url!, key!) : null;

/** `owner` is the staff id looking after the record (null = unassigned). The database uses it to decide who may see the row. */
export type Row = { id: string; kind: Kind; data: Record<string, unknown>; deleted: boolean; updated_at: string; owner?: string | null };

export const COLLECTION_KIND: Record<keyof Db, Kind> = {
  customers: "customer",
  deals: "deal",
  tasks: "task",
  notes: "note",
  campaigns: "campaign",
  staff: "staff",
  files: "file",
  settings: "setting",
};

export async function pushRows(rows: Row[]): Promise<void> {
  if (!supabase || rows.length === 0) return;
  let { error } = await supabase.from("records").upsert(rows, { onConflict: "id" });
  // The database update that adds the owner column hasn't been run yet: save without it rather than stop syncing.
  if (error && /owner/i.test(error.message)) {
    const plain = rows.map((r) => { const c: Record<string, unknown> = { ...r }; delete c.owner; return c; });
    ({ error } = await supabase.from("records").upsert(plain, { onConflict: "id" }));
  }
  if (error) throw new Error(error.message);
}

/** Ids of the customer-related records this login is allowed to see. Used to drop records that were reassigned to someone else. */
export async function pullVisibleIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!supabase) return ids;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("records")
      .select("id")
      .in("kind", ["customer", "deal", "task", "note", "file"])
      .eq("deleted", false)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    (data ?? []).forEach((r: { id: string }) => ids.add(r.id));
    if (!data || data.length < PAGE) break;
  }
  return ids;
}

export async function pullRows(since: string | null): Promise<Row[]> {
  if (!supabase) return [];
  const PAGE = 1000;
  const all: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from("records").select("*").order("updated_at", { ascending: true }).range(from, from + PAGE - 1);
    if (since) q = q.gt("updated_at", since);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    all.push(...(data as Row[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

/* ------------------------------------------------------------ file storage */

export const BUCKET = "job-files";

export async function uploadStored(path: string, blob: Blob, mime: string): Promise<void> {
  if (!supabase) throw new Error("Shared database not connected");
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
}

export async function removeStored(path: string): Promise<void> {
  try {
    await supabase?.storage.from(BUCKET).remove([path]);
  } catch {
    /* the record is already gone; an orphaned file is harmless */
  }
}

/** Short-lived private links. The bucket is not public: only signed-in staff can ever get one. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!supabase || paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  data.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}
