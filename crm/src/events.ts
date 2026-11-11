import type { Customer, Db, Task, TaskKind } from "./types";
import { TASK_KINDS } from "./types";
import { addDays, fullName, systemSummary } from "./utils";

export type CalKind = "install" | TaskKind;

export type CalEvent = {
  key: string;
  date: string;
  time?: string;
  kind: CalKind;
  /** e.g. "Install" or "Call" */
  label: string;
  /** customer name */
  title: string;
  /** what/where */
  sub: string;
  customerId: string;
  dealId?: string | null;
  task?: Task;
  done: boolean;
  /** For multi-day installs: day 2 of 3 */
  day?: { n: number; of: number };
  tentative?: boolean;
};

export const KIND_STYLE: Record<CalKind, { dot: string; chip: string }> = {
  install: { dot: "bg-navy-900", chip: "bg-navy-900 text-white" },
  visit: { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-800" },
  call: { dot: "bg-sky-500", chip: "bg-sky-100 text-sky-800" },
  email: { dot: "bg-sky-400", chip: "bg-sky-100 text-sky-800" },
  quote: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-900" },
  checkup: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" },
  upgrade: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" },
  other: { dot: "bg-mist-400", chip: "bg-mist-100 text-navy-700" },
};

export const kindLabel = (k: CalKind) => (k === "install" ? "Install" : TASK_KINDS.find((t) => t.id === k)?.label ?? k);

/**
 * Everything with a date: installs (spread over their length in days) and follow-ups / site visits.
 * Lost jobs are left out. `ownerId` limits to customers looked after by that staff member.
 */
export function buildEvents(db: Db, ownerId?: string | null): CalEvent[] {
  const customers = new Map<string, Customer>(db.customers.map((c) => [c.id, c]));
  const mineOnly = (id: string) => !ownerId || customers.get(id)?.assignedTo === ownerId;
  const out: CalEvent[] = [];

  for (const d of db.deals) {
    if (!d.installDate || d.stage === "lost" || !mineOnly(d.customerId)) continue;
    const c = customers.get(d.customerId);
    if (!c) continue;
    const days = Math.max(1, Math.min(14, d.installDays ?? 1));
    for (let i = 0; i < days; i++) {
      out.push({
        key: `inst-${d.id}-${i}`,
        date: addDays(i, d.installDate),
        kind: "install",
        label: "Install",
        title: fullName(c),
        sub: [c.suburb, systemSummary(d) || d.title].filter(Boolean).join(" · "),
        customerId: c.id,
        dealId: d.id,
        done: d.stage === "installed",
        day: days > 1 ? { n: i + 1, of: days } : undefined,
        tentative: d.stage !== "won" && d.stage !== "installed",
      });
    }
  }

  for (const t of db.tasks) {
    const c = customers.get(t.customerId);
    if (!c || !mineOnly(t.customerId)) continue;
    out.push({
      key: `task-${t.id}`,
      date: t.due,
      time: t.time,
      // An "install" follow-up is admin (confirm date, deposit, paperwork), not the install itself.
      kind: t.kind === "install" ? "other" : t.kind,
      label: t.kind === "install" ? "Install prep" : kindLabel(t.kind),
      title: fullName(c),
      sub: t.note || c.suburb,
      customerId: c.id,
      dealId: t.dealId,
      task: t,
      done: t.done,
    });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99") || a.kind.localeCompare(b.kind));
}

/** Two or more installs on the same day: the crew can only be in one place. */
export function installClashes(db: Db, date: string | null | undefined, ignoreDealId?: string): string[] {
  if (!date) return [];
  return buildEvents(db)
    .filter((e) => e.kind === "install" && !e.done && e.date === date && e.dealId !== ignoreDealId)
    .map((e) => e.title);
}

const ics = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const compact = (d: string) => d.replace(/-/g, "");

/** An .ics file you can open on a phone or in Outlook / Google Calendar. It is a snapshot, not a live feed. */
export function buildIcs(db: Db, events: CalEvent[]): string {
  const customers = new Map(db.customers.map((c) => [c.id, c]));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sunflow Energy Solutions//CRM//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Sunflow CRM"];
  for (const e of events.filter((x) => !x.done)) {
    const c = customers.get(e.customerId);
    lines.push("BEGIN:VEVENT", `UID:${e.key}@sunflow-crm`, `DTSTAMP:${stamp}`);
    if (e.time) {
      const t = e.time.replace(":", "") + "00";
      const endH = String(Math.min(23, Number(e.time.slice(0, 2)) + 1)).padStart(2, "0");
      lines.push(`DTSTART:${compact(e.date)}T${t}`, `DTEND:${compact(e.date)}T${endH}${e.time.slice(3, 5)}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(addDays(1, e.date))}`);
    }
    lines.push(`SUMMARY:${ics(`${e.label}: ${e.title}`)}`);
    const desc = [e.sub, c?.phone && `Phone ${c.phone}`].filter(Boolean).join("\n");
    if (desc) lines.push(`DESCRIPTION:${ics(desc)}`);
    const loc = c ? [c.address, c.suburb, c.postcode].filter(Boolean).join(", ") : "";
    if (loc) lines.push(`LOCATION:${ics(loc)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
