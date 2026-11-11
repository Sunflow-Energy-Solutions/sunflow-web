import { createHmac, timingSafeEqual } from "node:crypto";
import { env, sb } from "./_lib.js";

/** Shared Xero helpers (standard OAuth 2.0). Tokens live in the private_settings table, readable only with the service-role key. */

export const AUTHORIZE = "https://login.xero.com/identity/connect/authorize";
const TOKEN = "https://identity.xero.com/connect/token";
const API = "https://api.xero.com/api.xro/2.0";
// Apps created after 2 March 2026 must use granular scopes. Set XERO_SCOPES to override (older apps may need accounting.transactions).
export const SCOPES = process.env.XERO_SCOPES ?? "offline_access accounting.contacts accounting.invoices";

export type Tokens = { access_token: string; refresh_token: string; expires_at: number; tenant_id: string; tenant_name: string };
export type Auth = { token: string; tenant: string };
export type ContactIn = { name: string; email?: string; phone?: string; address?: string; suburb?: string; postcode?: string };

export const configured = () => !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
export const redirectUri = () => `${env("APP_URL").replace(/\/$/, "")}/api/xero-callback`;
const basic = () => `Basic ${Buffer.from(`${env("XERO_CLIENT_ID")}:${env("XERO_CLIENT_SECRET")}`).toString("base64")}`;

export const stateFor = (ts: string) => createHmac("sha256", env("UNSUBSCRIBE_SECRET")).update(`xero.${ts}`).digest("hex");

export function validState(state: string): boolean {
  const [ts, sig] = state.split(".");
  if (!ts || !sig || Date.now() - Number(ts) > 15 * 60_000) return false;
  const a = Buffer.from(stateFor(ts));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function loadTokens(): Promise<Tokens | null> {
  const res = await sb("private_settings?key=eq.xero&select=value");
  const rows = (await res.json().catch(() => [])) as { value: Tokens }[];
  return res.ok && rows[0] ? rows[0].value : null;
}

export async function saveTokens(t: Tokens): Promise<void> {
  const res = await sb("private_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: "xero", value: t }),
  });
  if (!res.ok) throw new Error(`Could not save the Xero connection (${res.status})`);
}

export async function exchange(params: Record<string, string>): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { Authorization: basic(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const out = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !out.access_token || !out.refresh_token) throw new Error(`Xero sign-in failed: ${out.error ?? res.status}`);
  return out as { access_token: string; refresh_token: string; expires_in: number };
}

/** Refresh tokens are single-use in Xero, so the new one is saved straight away. */
export async function accessToken(): Promise<Auth | null> {
  const t = await loadTokens();
  if (!t) return null;
  if (t.expires_at - 60_000 > Date.now()) return { token: t.access_token, tenant: t.tenant_id };
  const r = await exchange({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  await saveTokens({ ...t, access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Date.now() + r.expires_in * 1000 });
  return { token: r.access_token, tenant: t.tenant_id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

export async function xero(path: string, auth: Auth, init: RequestInit = {}): Promise<Json> {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${auth.token}`, "xero-tenant-id": auth.tenant, Accept: "application/json", "Content-Type": "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
    const msgs: string[] = (body.Elements ?? []).flatMap((e: Json) => (e.ValidationErrors ?? []).map((v: Json) => v.Message));
    throw new Error(msgs.join("; ") || body.Message || body.Detail || `Xero error ${res.status}`);
  }
  return body;
}

export async function findOrCreateContact(auth: Auth, c: ContactIn): Promise<string> {
  const q = (field: string, value: string) => encodeURIComponent(`${field}=="${value.replace(/"/g, "")}"`);
  if (c.email) {
    const r = await xero(`Contacts?where=${q("EmailAddress", c.email)}`, auth);
    if (r.Contacts?.[0]) return r.Contacts[0].ContactID;
  }
  const byName = await xero(`Contacts?where=${q("Name", c.name)}`, auth);
  // Same name but a different email is probably a different person, so only reuse a name match when there's no email to compare.
  if (byName.Contacts?.[0] && !c.email) return byName.Contacts[0].ContactID;

  const unique = byName.Contacts?.[0] ? `${c.name} (${c.suburb || c.email || c.phone || "customer"})` : c.name;
  const created = await xero("Contacts", auth, {
    method: "POST",
    body: JSON.stringify({
      Contacts: [{
        Name: unique,
        EmailAddress: c.email || undefined,
        Phones: c.phone ? [{ PhoneType: "MOBILE", PhoneNumber: c.phone }] : undefined,
        Addresses: c.address || c.suburb
          ? [{ AddressType: "STREET", AddressLine1: c.address, City: c.suburb, Region: "VIC", PostalCode: c.postcode, Country: "Australia" }]
          : undefined,
      }],
    }),
  });
  return created.Contacts[0].ContactID;
}
