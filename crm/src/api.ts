import { supabase } from "./cloud";

/** Calls one of the CRM's own /api endpoints as the signed-in user. */
export async function callApi<T = Record<string, unknown>>(path: string, payload: Record<string, unknown>): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Sign in again.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const out = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(out.error ?? `Request failed (${res.status})`);
  return out;
}
