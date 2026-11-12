import { createHmac, timingSafeEqual } from "node:crypto";

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Confirms the caller is signed in to our Supabase project. Sign-ups are disabled, so signed in = staff. */
export async function requireStaff(request: Request): Promise<{ email: string } | null> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: env("SUPABASE_SERVICE_ROLE_KEY") },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { email?: string };
  return user.email ? { email: user.email } : null;
}

/** Legacy service_role keys are JWTs and go in both headers; the newer sb_secret_ keys go in apikey only. */
export const serviceHeaders = (key: string): Record<string, string> =>
  key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };

/** Server-side access to the database using the service-role key (bypasses row-level security). Never expose it to the browser. */
export function sb(path: string, init: RequestInit = {}): Promise<Response> {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(key), "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
  });
}

/** Admin = has role "admin" in the CRM's Team list. Until anyone has been made an admin, every signed-in user counts (first-run setup). */
export async function isAdmin(email: string): Promise<boolean> {
  const res = await sb("records?kind=eq.staff&deleted=eq.false&select=data");
  if (!res.ok) return false;
  const staff = ((await res.json()) as { data: { email?: string; role?: string } }[]).map((r) => r.data);
  if (!staff.some((s) => s.role === "admin")) return true;
  return staff.some((s) => s.role === "admin" && s.email?.toLowerCase() === email.toLowerCase());
}

/**
 * The signed-in person's team entry. role: "admin" / "staff" (sees every customer) / "limited" (only their own).
 * Someone with no team entry yet counts as limited, and while nobody is an admin yet everyone counts as admin (first-run setup).
 */
export async function staffRole(email: string): Promise<{ id: string; role: "admin" | "staff" | "limited" }> {
  const res = await sb("records?kind=eq.staff&deleted=eq.false&select=id,data");
  const rows = res.ok ? ((await res.json()) as { id: string; data: { email?: string; role?: string } }[]) : [];
  const me = rows.find((r) => r.data.email?.toLowerCase() === email.toLowerCase());
  const noAdmins = !rows.some((r) => r.data.role === "admin");
  const role = noAdmins || me?.data.role === "admin" ? "admin" : me?.data.role === "staff" ? "staff" : "limited";
  return { id: me?.id ?? `staff-${email.toLowerCase()}`, role };
}

export const sign = (customerId: string) =>
  createHmac("sha256", env("UNSUBSCRIBE_SECRET")).update(customerId).digest("hex");

export function verify(customerId: string, sig: string): boolean {
  const a = Buffer.from(sign(customerId));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const BUSINESS = {
  name: "Sunflow Energy Solutions",
  abn: "ABN 27 460 874 669",
  phone: "(03) 9088 0322",
  web: "https://www.sunflowenergysolutions.com.au",
};
