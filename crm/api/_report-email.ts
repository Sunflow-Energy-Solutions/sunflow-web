import { escapeHtml } from "./_lib.js";
import { compactMoney, money, pct, type Report } from "../src/reports.js";

/** The end-of-day email. Built from the same report engine as the Reports screen, so the numbers always match. */

const NAVY = "#0a1730", MUTED = "#6b7386", LINE = "#e2e5eb";

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const fmtShort = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const h = (s: string) => `<h2 style="margin:26px 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">${escapeHtml(s)}</h2>`;

function tile(label: string, value: string, sub = ""): string {
  return `<td width="33%" valign="top" style="padding:0 6px 12px 0"><div style="border:1px solid ${LINE};border-radius:10px;padding:10px 12px">
<div style="font-size:12px;color:${MUTED}">${escapeHtml(label)}</div>
<div style="font-size:22px;font-weight:bold;color:${NAVY}">${escapeHtml(value)}</div>
<div style="font-size:12px;color:${MUTED}">${escapeHtml(sub) || "&nbsp;"}</div></div></td>`;
}

function list(rows: string[], empty: string): string {
  if (!rows.length) return `<p style="margin:0;color:${MUTED};font-size:14px">${escapeHtml(empty)}</p>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows
    .map((r) => `<tr><td style="padding:6px 0;border-bottom:1px solid ${LINE};font-size:14px">${r}</td></tr>`)
    .join("")}</table>`;
}

const deal = (d: Report["won"][number], withValue: boolean) =>
  `<strong>${escapeHtml(d.customer)}</strong>${d.suburb ? ` <span style="color:${MUTED}">${escapeHtml(d.suburb)}</span>` : ""}` +
  `${withValue && d.value != null ? ` <span style="float:right;font-weight:bold">${money(d.value)}</span>` : ""}` +
  `<br><span style="color:${MUTED};font-size:12px">${escapeHtml([d.title, d.owner].filter(Boolean).join(" · "))}</span>`;

export function renderDailyReport(day: Report, week: Report, month: Report, appUrl: string): { subject: string; html: string } {
  const quiet = !day.leads.length && !day.quotes.length && !day.won.length && !day.installs.length;
  const subject = `Sunflow end of day, ${fmtShort(day.today)}: ${day.leads.length} enquir${day.leads.length === 1 ? "y" : "ies"}, ${day.won.length} won${day.wonValue ? ` (${money(day.wonValue)})` : ""}`;

  const overdueByPerson = new Map<string, number>();
  day.overdue.forEach((o) => overdueByPerson.set(o.owner, (overdueByPerson.get(o.owner) ?? 0) + 1));

  const body = `
<p style="margin:0 0 4px;font-size:20px;font-weight:bold">${escapeHtml(fmtDay(day.today))}</p>
<p style="margin:0 0 16px;color:${MUTED};font-size:14px">${quiet ? "A quiet day: nothing new was recorded." : "Here is how today went."}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${tile("New enquiries", String(day.leads.length))}
${tile("Quotes sent", money(day.quotesValue), `${day.quotes.length} quote${day.quotes.length === 1 ? "" : "s"}`)}
${tile("Jobs won", money(day.wonValue), `${day.won.length} job${day.won.length === 1 ? "" : "s"}`)}
</tr><tr>
${tile("Installs completed", String(day.installs.length))}
${tile("Follow-ups done", String(day.followUpsDone))}
${tile("Overdue follow-ups", String(day.overdue.length), day.overdue.length ? "need a call" : "all up to date")}
</tr></table>

${day.won.length ? h("Won today") + list(day.won.map((d) => deal(d, true)), "") : ""}
${day.leads.length ? h("New enquiries today") + list(day.leads.map((d) => deal({ ...d }, false) + `<br><span style="color:${MUTED};font-size:12px">from ${escapeHtml(d.source)}</span>`), "") : ""}
${day.quotes.length ? h("Quotes sent today") + list(day.quotes.map((d) => deal(d, true)), "") : ""}
${day.installs.length ? h("Installed today") + list(day.installs.map((d) => deal(d, true)), "") : ""}

${h("Needs attention")}
${list(
    [
      day.unassigned.length ? `<strong>${day.unassigned.length}</strong> lead${day.unassigned.length === 1 ? "" : "s"} not assigned to anyone yet` : "",
      ...[...overdueByPerson].map(([who, n]) => `<strong>${n}</strong> overdue follow-up${n === 1 ? "" : "s"} for ${escapeHtml(who)}`),
      day.paperwork.outstanding + day.paperwork.notStarted ? `<strong>${day.paperwork.outstanding + day.paperwork.notStarted}</strong> won job${day.paperwork.outstanding + day.paperwork.notStarted === 1 ? "" : "s"} with paperwork still to finish` : "",
    ].filter(Boolean),
    "Nothing needs attention. Well done.",
  )}

${h("Coming up: installs in the next 14 days")}
${list(day.upcomingInstalls.map((d) => `<strong>${escapeHtml(fmtShort(d.date))}</strong> &nbsp;${deal(d, false)}`), "No installs booked in the next 14 days.")}

${h("This week so far")}
<p style="margin:0;font-size:14px;line-height:1.7">${week.leads.length} enquiries · ${week.quotes.length} quotes (${money(week.quotesValue)}) · <strong>${week.won.length} won (${money(week.wonValue)})</strong> · ${week.installs.length} installs</p>
${h("This month so far")}
<p style="margin:0;font-size:14px;line-height:1.7">${month.leads.length} enquiries · ${month.quotes.length} quotes (${money(month.quotesValue)}) · <strong>${month.won.length} won (${money(month.wonValue)})</strong> · win rate ${pct(month.winRate)}${month.previous.wonValue ? ` · last month to the same day: ${money(month.previous.wonValue)}` : ""}</p>

${h("The pipeline right now")}
${list(day.pipeline.filter((p) => p.count).map((p) => `${escapeHtml(p.label)} <span style="float:right"><strong>${p.count}</strong>${p.value ? ` &nbsp;<span style="color:${MUTED}">${compactMoney(p.value)}</span>` : ""}</span>`), "Nothing in the pipeline.")}

${month.byPerson.length > 1 ? h("This month by person") + list(month.byPerson.map((p) => `<strong>${escapeHtml(p.name)}</strong> <span style="float:right">${p.leads} enquiries · ${p.won} won (${money(p.wonValue)})</span>`), "") : ""}

<p style="margin:26px 0 0"><a href="${escapeHtml(appUrl)}/#/reports" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#fdb813;color:${NAVY};font-weight:bold;font-size:15px;text-decoration:none">Open the full report</a></p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:${NAVY}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${NAVY};padding:16px 24px;color:#fdb813;font-size:18px;font-weight:bold">Sunflow CRM · End of day</td></tr>
<tr><td style="padding:24px">${body}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid ${LINE};font-size:12px;color:${MUTED}">Sent automatically by the Sunflow CRM. To change who gets this or when, go to More, then End-of-day report.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}

/** Valid, distinct addresses only, at most 10. */
export function parseRecipients(text: string): string[] {
  const seen = new Set<string>();
  for (const part of String(text ?? "").split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e)) seen.add(e);
  }
  return [...seen].slice(0, 10);
}

/** Whether a scheduled run should send right now: switched on, a day that is wanted, and 6pm in Melbourne. */
export function shouldSend(opts: { enabled: boolean; days: string; hour: number; today: string; lastSent?: string }): boolean {
  if (!opts.enabled || opts.hour !== 18 || opts.lastSent === opts.today) return false;
  if (opts.days === "daily") return true;
  const dow = new Date(`${opts.today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return dow >= 1 && dow <= 5;
}

