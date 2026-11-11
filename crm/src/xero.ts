import { useEffect, useState } from "react";
import { cloudEnabled, supabase } from "./cloud";

export type XeroStatus = { configured: boolean; connected: boolean; org?: string };

/** Calls the CRM's own /api/xero endpoint as the signed-in user. */
export async function xeroCall<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Sign in again.");
  const res = await fetch("/api/xero", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const out = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(out.error ?? `Xero request failed (${res.status})`);
  return out;
}

let cached: XeroStatus | null = null;

export function useXeroStatus(refresh = 0): XeroStatus {
  const [s, setS] = useState<XeroStatus>(cached ?? { configured: false, connected: false });
  useEffect(() => {
    if (!cloudEnabled) return;
    let live = true;
    xeroCall<XeroStatus>("status")
      .then((r) => { cached = r; if (live) setS(r); })
      .catch(() => {});
    return () => { live = false; };
  }, [refresh]);
  return s;
}
