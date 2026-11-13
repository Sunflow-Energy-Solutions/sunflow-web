import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { env, json, requireStaff, sb, staffRole } from "./_lib.js";
import { parseRecipients, renderDailyReport, shouldSend } from "./_report-email.js";
import { buildReport, melbourneHour, melbourneToday, rangeFor } from "../src/reports.js";

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * End-of-day report.
 *  GET  = the Vercel cron. Runs at 07:00 and 08:00 UTC; exactly one of those is 6pm in Melbourne (daylight saving or not).
 *         Protected by CRON_SECRET, which Vercel sends automatically.
 *  POST = "Send a test report to me" in the app. Admins only, goes only to the caller's own address.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const secret = process.env.CRON_SECRET;
    const given = request.headers.get("authorization") ?? "";
    const want = `Bearer ${secret ?? ""}`;
    if (!secret || given.length !== want.length || !timingSafeEqual(Buffer.from(given), Buffer.from(want))) return json({ error: "Not allowed." }, 401);
    return await runScheduled();
  } catch (e) {
    console.error("daily-report cron failed", e);
    return json({ error: e instanceof Error ? e.message : "Failed." }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const staff = await requireStaff(request).catch(() => null);
    if (!staff) return json({ error: "Please sign in again." }, 401);
    if ((await staffRole(staff.email)).role !== "admin") return json({ error: "Only an admin can send a test report." }, 403);
    await sendReport([staff.email], melbourneToday());
    return json({ sent: true, to: staff.email });
  } catch (e) {
    console.error("daily-report test failed", e);
    return json({ error: e instanceof Error ? e.message : "Could not send the report." }, 500);
  }
}

async function runScheduled(): Promise<Response> {
  const settingsRes = await sb("records?id=eq.app-settings&kind=eq.setting&select=data");
  const settings = (settingsRes.ok ? ((await settingsRes.json()) as { data: Rec }[])[0]?.data : null) ?? {};
  const today = melbourneToday();
  const lastRes = await sb("private_settings?key=eq.daily-report&select=value");
  const lastSent = lastRes.ok ? ((await lastRes.json()) as { value: { date?: string } }[])[0]?.value?.date : undefined;

  if (!shouldSend({ enabled: settings.reportEnabled === true, days: String(settings.reportDays ?? "weekdays"), hour: melbourneHour(), today, lastSent })) {
    return json({ sent: false, reason: "not due" });
  }
  const to = parseRecipients(String(settings.reportRecipients ?? ""));
  if (!to.length) return json({ sent: false, reason: "no recipients" });

  await sendReport(to, today);
  // Remember it so a second cron firing in the same hour can't send twice.
  await sb("private_settings", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key: "daily-report", value: { date: today } }) });
  return json({ sent: true, to: to.length });
}

/** Everything in the database, read in pages (the API returns at most 1000 rows per request). */
async function loadDb() {
  const rows: { kind: string; data: Rec }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await sb(`records?deleted=eq.false&select=kind,data&order=id.asc&limit=1000&offset=${offset}`);
    if (!res.ok) throw new Error(`Could not read the database (${res.status})`);
    const page = (await res.json()) as { kind: string; data: Rec }[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const of = (kind: string) => rows.filter((r) => r.kind === kind).map((r) => r.data);
  return {
    customers: of("customer"), deals: of("deal"), tasks: of("task"), notes: of("note"),
    campaigns: of("campaign"), staff: of("staff"), files: of("file"), settings: of("setting"),
  };
}

async function sendReport(to: string[], today: string): Promise<void> {
  const db = (await loadDb()) as unknown as Parameters<typeof buildReport>[0];
  const day = buildReport(db, rangeFor("today", today), today);
  const week = buildReport(db, rangeFor("week", today), today);
  const month = buildReport(db, rangeFor("month", today), today);
  const { subject, html } = renderDailyReport(day, week, month, env("APP_URL").replace(/\/$/, ""));
  const resend = new Resend(env("RESEND_API_KEY"));
  const { error } = await resend.emails.send({ from: env("MAIL_FROM"), to, subject, html });
  if (error) throw new Error(`The email service rejected the send: ${error.message}`);
}
