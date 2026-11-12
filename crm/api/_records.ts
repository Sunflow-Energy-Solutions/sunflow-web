import { createHmac, timingSafeEqual } from "node:crypto";
import { sb } from "./_lib.js";

/** Server-side helpers for creating and updating CRM records outside the app (inbound leads, Pylon). */

export type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Row = { id: string; kind: string; data: Rec; deleted: boolean; updated_at: string; owner: string | null };

export const nowIso = () => new Date().toISOString();
export const melbourneToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
export const addDays = (n: number, from = melbourneToday()) => {
  const [y, m, d] = from.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/**
 * `owner` is the staff id of whoever looks after the customer this record belongs to (null = nobody yet). The database
 * uses it to decide who may see the record, so every customer-related row must carry its customer's owner.
 */
export const row = (kind: string, data: Rec, deleted = false, owner: string | null = null): Row => ({
  id: String(data.id), kind, data, deleted, updated_at: String(data.updatedAt ?? nowIso()), owner,
});

export const ownerOf = (customer: Rec | null | undefined): string | null => (customer?.assignedTo ? String(customer.assignedTo) : null);

/** Saves records. The phones pick them up on their next sync because updated_at is new. */
export async function saveRows(rows: Row[]): Promise<void> {
  if (!rows.length) return;
  const post = (body: unknown) => sb("records", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(body) });
  let res = await post(rows);
  // Database update with the owner column not run yet: save without it rather than lose the lead.
  if (!res.ok && /owner/i.test(await res.clone().text())) res = await post(rows.map((r) => { const c: Rec = { ...r }; delete c.owner; return c; }));
  if (!res.ok) throw new Error(`Could not save to the CRM database (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

export async function getRecord(kind: string, id: string): Promise<Rec | null> {
  const res = await sb(`records?id=eq.${encodeURIComponent(id)}&kind=eq.${kind}&deleted=eq.false&select=data`);
  if (!res.ok) return null;
  return ((await res.json()) as { data: Rec }[])[0]?.data ?? null;
}

/** Email match is case-insensitive; PostgREST's ilike is filtered again in code so "_" in an address can't over-match. */
export async function findCustomerByEmail(email: string): Promise<Rec | null> {
  const e = email.trim();
  if (!e) return null;
  const res = await sb(`records?kind=eq.customer&deleted=eq.false&select=data&data->>email=ilike.${encodeURIComponent(e)}`);
  if (!res.ok) return null;
  return ((await res.json()) as { data: Rec }[]).map((r) => r.data).find((c) => String(c.email ?? "").trim().toLowerCase() === e.toLowerCase()) ?? null;
}

export async function dealsFor(customerId: string): Promise<Rec[]> {
  const res = await sb(`records?kind=eq.deal&deleted=eq.false&select=data&data->>customerId=eq.${encodeURIComponent(customerId)}`);
  return res.ok ? ((await res.json()) as { data: Rec }[]).map((r) => r.data) : [];
}

export async function openAutoTasks(dealId: string): Promise<Rec[]> {
  const res = await sb(`records?kind=eq.task&deleted=eq.false&select=data&data->>dealId=eq.${encodeURIComponent(dealId)}`);
  return res.ok ? ((await res.json()) as { data: Rec }[]).map((r) => r.data).filter((t) => t.auto && !t.done) : [];
}

const emptySystem = () => ({ solarKw: null, panelBrand: "", batteryKwh: null, batteryBrand: "", inverterBrand: "", evCharger: "" });

export function newCustomer(c: { name: string; phone?: string; email?: string; address?: string; suburb?: string; state?: string; postcode?: string; source: string; consent?: boolean; notes?: string }): Rec {
  const [first = "", ...rest] = c.name.trim().split(/\s+/);
  const t = nowIso();
  return {
    id: crypto.randomUUID(), firstName: first, lastName: rest.join(" "), phone: (c.phone ?? "").trim(), email: (c.email ?? "").trim(),
    address: c.address ?? "", suburb: c.suburb ?? "", state: c.state || "VIC", postcode: c.postcode ?? "", kind: "Residential", source: c.source, notes: c.notes ?? "",
    marketingConsent: !!c.consent, unsubscribed: false, createdAt: t, updatedAt: t,
  };
}

export function newDeal(customerId: string, patch: Rec = {}): Rec {
  const t = nowIso();
  return {
    id: crypto.randomUUID(), customerId, title: "", stage: "new", system: emptySystem(), quotes: [], value: null, installDate: null,
    installedOn: null, lostReason: "", createdAt: t, updatedAt: t, ...patch,
  };
}

export function newTask(customerId: string, dealId: string | null, kind: string, due: string, note: string): Rec {
  const t = nowIso();
  return { id: crypto.randomUUID(), customerId, dealId, kind, due, note, done: false, doneAt: null, auto: true, createdAt: t, updatedAt: t };
}

export function newNote(customerId: string, dealId: string | null, text: string): Rec {
  const t = nowIso();
  return { id: crypto.randomUUID(), customerId, dealId, kind: "system", text, createdAt: t, updatedAt: t };
}

/** Constant-time string comparison for secrets. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const hmacHex = (secret: string, message: string) => createHmac("sha256", secret).update(message).digest("hex");
