import { env } from "./_lib.js";
import { CATALOGUE_BRANDS } from "../src/catalogue.generated.js";
import { hmacHex, safeEqual, type Rec } from "./_records.js";

/**
 * Pylon helpers. Pylon API: https://app.getpylon.com/docs/api - JSON:API format, Bearer token from Pylon's API settings.
 * The attribute names used below (summary.dc_output_kw, summary.storage_kwh, pricing.total in cents, module_types[],
 * inverter_types[], storage_types[], ev_charger_types[]) are the ones Pylon documents; everything is read defensively
 * because a missing field must never stop a signed job from reaching the CRM.
 */

const API = "https://api.getpylon.com/v1";

/** Webhook signature: HMAC-SHA256 of `${timestamp}.${rawBody}` with the destination secret, sent as `hs256=<hex>`. */
export function verifySignature(secret: string, timestamp: string, rawBody: string, header: string): boolean {
  const given = header.replace(/^hs256=/i, "").trim();
  if (!given || !timestamp) return false;
  const hex = hmacHex(secret, `${timestamp}.${rawBody}`);
  return safeEqual(given.toLowerCase(), hex);
}

async function pylonGet(path: string): Promise<{ ok: boolean; status: number; body: Rec }> {
  const res = await fetch(`${API}/${path}`, {
    headers: { Authorization: `Bearer ${env("PYLON_API_TOKEN")}`, Accept: "application/vnd.api+json" },
  });
  return { ok: res.ok, status: res.status, body: ((await res.json().catch(() => ({}))) as Rec) ?? {} };
}

const attrs = (b: Rec): Rec => (b.data?.attributes ?? b.attributes ?? {}) as Rec;

export type PylonProject = {
  reference: string; name: string; email: string; phone: string; address: string; suburb: string; state: string; postcode: string;
  /** The design the customer signed, when Pylon says there is one (relationship latest_signed_design) */
  signedDesignId?: string;
  createdAt?: string;
};

const idOf = (rel: unknown): string => String(((rel as Rec)?.data as Rec | undefined)?.id ?? "");

/** Reads one project resource (JSON:API {id, attributes, relationships}) into the fields the CRM uses. */
export function toProject(resource: Rec): PylonProject {
  const a = (resource.attributes ?? {}) as Rec;
  const cd = (a.customer_details ?? {}) as Rec;
  const sa = (a.site_address ?? {}) as Rec;
  const rel = (resource.relationships ?? {}) as Rec;
  return {
    reference: String(a.reference_number ?? "").trim(),
    name: String(cd.name ?? "").trim(),
    email: String(cd.email ?? "").trim(),
    phone: String(cd.phone ?? "").trim(),
    address: [sa.line1, sa.line2].filter(Boolean).join(", "),
    suburb: String(sa.city ?? ""),
    state: String(sa.state ?? "").trim().toUpperCase(),
    postcode: String(sa.zip ?? ""),
    signedDesignId: idOf(rel.latest_signed_design) || undefined,
    createdAt: typeof a.created_at === "string" ? a.created_at : undefined,
  };
}

export async function getProject(id: string): Promise<PylonProject> {
  // Some Pylon endpoints insist on an explicit field list, so retry with one if the plain request is refused.
  let r = await pylonGet(`solar_projects/${encodeURIComponent(id)}`);
  if (!r.ok && r.status === 400) r = await pylonGet(`solar_projects/${encodeURIComponent(id)}?fields[solar_projects]=reference_number,customer_details,site_address`);
  if (!r.ok) throw new Error(`Pylon project lookup failed (${r.status})`);
  return toProject((r.body.data ?? r.body) as Rec);
}

/**
 * Every project the customer has accepted (signed) since a date, newest first, following Pylon's own `links.next`
 * (Pylon asks that paginated URLs are not built by hand). Capped so one request can't run away.
 */
export async function listAcceptedProjects(sinceIso: string | null, cap = 300): Promise<(PylonProject & { id: string })[]> {
  const filters = [`filter[acceptance]=is_accepted`, `filter[is_archived]=any`, `sort=created_at.desc`];
  if (sinceIso) filters.push(`filter[created_at.gte]=${encodeURIComponent(sinceIso)}`);
  let url: string | null = `${API}/solar_projects?${filters.join("&")}`;
  const out: (PylonProject & { id: string })[] = [];
  let guard = 0;
  while (url && out.length < cap && guard++ < 20) {
    if (!url.startsWith(`${API}/`)) throw new Error("Unexpected pagination link from Pylon");
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${env("PYLON_API_TOKEN")}`, Accept: "application/vnd.api+json" } });
    const body: Rec = ((await res.json().catch(() => ({}))) as Rec) ?? {};
    if (!res.ok) throw new Error(`Pylon project list failed (${res.status})`);
    for (const item of (body.data as Rec[] | undefined) ?? []) out.push({ id: String(item.id), ...toProject(item) });
    url = (body.links as Rec | undefined)?.next ? String((body.links as Rec).next) : null;
  }
  return out.slice(0, cap);
}

type Part = { description: string; sku: string; quantity: number };
export type PylonDesign = {
  kw: number | null;
  kwh: number | null;
  /** AUD as Pylon states it on the proposal */
  total: number | null;
  panels: Part[];
  inverters: Part[];
  batteries: Part[];
  evChargers: Part[];
};

const parts = (v: unknown): Part[] =>
  (Array.isArray(v) ? v : []).map((p: Rec) => ({ description: String(p?.description ?? ""), sku: String(p?.sku ?? ""), quantity: Number(p?.quantity ?? 1) || 1 }));
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

export async function getDesign(id: string): Promise<PylonDesign> {
  const full = "summary,pricing,module_types,inverter_types,storage_types,ev_charger_types";
  const short = "summary,pricing,module_types,inverter_types";
  let r = await pylonGet(`solar_designs/${encodeURIComponent(id)}?fields[solar_designs]=${full}`);
  if (!r.ok && r.status === 400) r = await pylonGet(`solar_designs/${encodeURIComponent(id)}?fields[solar_designs]=${short}`);
  if (!r.ok) throw new Error(`Pylon design lookup failed (${r.status})`);
  const a = attrs(r.body);
  const cents = num((a.pricing as Rec | undefined)?.total);
  return {
    kw: num((a.summary as Rec | undefined)?.dc_output_kw),
    kwh: num((a.summary as Rec | undefined)?.storage_kwh),
    total: cents == null ? null : Math.round(cents) / 100,
    panels: parts(a.module_types),
    inverters: parts(a.inverter_types),
    batteries: parts(a.storage_types),
    evChargers: parts(a.ev_charger_types),
  };
}

/** Which of Sunflow's known brands a Pylon product description starts with or contains, e.g. "Trina Solar TSM-440" -> "Trina". */
export function brandOf(description: string, kind: keyof typeof CATALOGUE_BRANDS): string {
  const d = description.toLowerCase();
  const brands = [...CATALOGUE_BRANDS[kind]].sort((a, b) => b.length - a.length);
  return brands.find((b) => d.startsWith(b.toLowerCase())) ?? brands.find((b) => new RegExp(`\\b${b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(d)) ?? "";
}

export const kwText = (n: number | null) => (n == null ? "" : String(Math.round(n * 100) / 100));
