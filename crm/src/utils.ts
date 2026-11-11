import type { Customer, Deal } from "./types";

export const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = () => new Date().toISOString();

/** Local calendar date as yyyy-mm-dd (not UTC, so "today" is right in Melbourne in the evening). */
export function ymd(d: Date = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export const today = () => ymd();

export function addDays(days: number, from: string = today()): string {
  const [y, m, d] = from.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + days));
}

export function addMonths(months: number, from: string = today()): string {
  const [y, m, d] = from.split("-").map(Number);
  return ymd(new Date(y, m - 1 + months, d));
}

const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Monday of the week containing the date (Australian weeks start on Monday). */
export function startOfWeek(s: string): string {
  const d = parseYmd(s);
  return addDays(-((d.getDay() + 6) % 7), s);
}

/** The 6 x 7 grid of dates shown for a month, starting on a Monday. */
export function monthGrid(anchor: string): string[] {
  const d = parseYmd(anchor);
  const first = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(i, start));
}

export const shiftMonth = (anchor: string, n: number) => {
  const d = parseYmd(anchor);
  return ymd(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

export const monthTitle = (anchor: string) =>
  parseYmd(anchor).toLocaleDateString("en-AU", { month: "long", year: "numeric" });

export const dayLong = (s: string) =>
  parseYmd(s).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

export const fmtTime = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
};

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateShort(s: string): string {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function relativeDay(s: string): string {
  const n = daysBetween(today(), s);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days overdue`;
  return `In ${n} days`;
}

export const fmtMoney = (n: number | null | undefined) =>
  n == null ? "" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

export const fullName = (c: Pick<Customer, "firstName" | "lastName">) =>
  `${c.firstName} ${c.lastName}`.trim() || "Unnamed";

export const initials = (c: Pick<Customer, "firstName" | "lastName">) =>
  ((c.firstName[0] ?? "") + (c.lastName[0] ?? "")).toUpperCase() || "?";

/** Strip to digits so "0412 345 678" is a valid tel: link and matches searches. */
export const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
export const smsHref = (p: string) => `sms:${p.replace(/[^\d+]/g, "")}`;
export const mapsHref = (c: Pick<Customer, "address" | "suburb" | "postcode">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [c.address, c.suburb, c.postcode, "VIC"].filter(Boolean).join(", "),
  )}`;

/**
 * Pylon deep link (https://getpylon.com/developers/guides/deep-linking/): opens Pylon's map at the
 * customer's address with name, email and phone pre-filled. reference_number must be unique per
 * Pylon project, so the job (deal) id is used. Returns null when there's no address to search.
 */
export function pylonLink(c: Customer, deal: Deal): string | null {
  const address = [c.address, c.suburb, c.postcode && `VIC ${c.postcode}`].filter(Boolean).join(", ");
  if (!c.address.trim() && !c.suburb.trim()) return null;
  const u = new URL("https://app.getpylon.com/map/address");
  u.searchParams.set("search", address);
  u.searchParams.set("country", "AU");
  u.searchParams.set("customer_name", fullName(c));
  if (c.email.trim()) u.searchParams.set("customer_email", c.email.trim());
  if (c.phone.trim()) u.searchParams.set("customer_phone", c.phone.trim());
  u.searchParams.set("reference_number", deal.id);
  return u.toString();
}

export function systemSummary(d: Deal): string {
  const s = d.system;
  const parts: string[] = [];
  if (s.solarKw) parts.push(`${s.solarKw} kW solar${s.panelBrand ? ` (${s.panelBrand})` : ""}`);
  if (s.batteryKwh) parts.push(`${s.batteryKwh} kWh battery${s.batteryBrand ? ` (${s.batteryBrand})` : ""}`);
  if (s.inverterBrand) parts.push(`${s.inverterBrand} inverter`);
  if (s.evCharger) parts.push(`EV: ${s.evCharger}`);
  return parts.join(" + ");
}

export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function download(filename: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
