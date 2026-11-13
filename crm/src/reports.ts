import type { Db, Deal, Stage } from "./types";

/**
 * The report engine. Used by the Reports screen AND the automatic end-of-day email, so both always show the same numbers.
 * Self-contained on purpose (type imports only): the server imports this file too.
 * All dates are Melbourne calendar dates (yyyy-mm-dd), whatever timezone the phone or server is in.
 */

export const STAGE_LABELS: Record<Stage, string> = {
  new: "New lead", contacted: "Contacted", assessment: "Site visit", quoted: "Quote sent",
  negotiating: "Negotiating", won: "Won", installed: "Installed", lost: "Lost",
};
const LABEL_TO_STAGE = Object.fromEntries(Object.entries(STAGE_LABELS).map(([k, v]) => [v, k])) as Record<string, Stage>;

/* ------------------------------------------------------------------ dates */

const MEL = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" });
export const melDate = (iso: string | Date): string => MEL.format(typeof iso === "string" ? new Date(iso) : iso);
export const melbourneToday = () => melDate(new Date());
export const melbourneHour = (): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Melbourne", hour: "2-digit", hourCycle: "h23" }).format(new Date()));

const utc = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const addDays = (s: string, n: number) => new Date(utc(s) + n * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86400000);
export const mondayOf = (s: string) => addDays(s, -((new Date(utc(s)).getUTCDay() + 6) % 7));
const monthKey = (s: string) => s.slice(0, 7);

export type RangeKey = "today" | "yesterday" | "week" | "month" | "30d" | "90d" | "12m";
export type Range = { key: RangeKey; from: string; to: string; label: string };

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today", yesterday: "Yesterday", week: "This week", month: "This month", "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months",
};

export function rangeFor(key: RangeKey, today = melbourneToday()): Range {
  const label = RANGE_LABELS[key];
  switch (key) {
    case "today": return { key, from: today, to: today, label };
    case "yesterday": return { key, from: addDays(today, -1), to: addDays(today, -1), label };
    case "week": return { key, from: mondayOf(today), to: today, label };
    case "month": return { key, from: `${monthKey(today)}-01`, to: today, label };
    case "30d": return { key, from: addDays(today, -29), to: today, label };
    case "90d": return { key, from: addDays(today, -89), to: today, label };
    case "12m": return { key, from: addDays(today, -364), to: today, label };
  }
}

/**
 * What to compare against ("vs last period"). A week or month so far is compared with the same stretch of the previous week
 * or month (Mon-Fri vs last Mon-Fri); rolling ranges (30 days, 12 months...) with the stretch of equal length just before them.
 */
export function previousRange(r: Range): Range {
  const len = daysBetween(r.from, r.to) + 1;
  if (r.key === "week") return { key: r.key, from: addDays(r.from, -7), to: addDays(r.to, -7), label: "last week" };
  if (r.key === "month") {
    const d = new Date(utc(r.from));
    d.setUTCMonth(d.getUTCMonth() - 1);
    const from = d.toISOString().slice(0, 10);
    const end = addDays(r.from, -1); // last day of the previous month
    const to = addDays(from, len - 1);
    return { key: r.key, from, to: to > end ? end : to, label: "last month" };
  }
  return { key: r.key, from: addDays(r.from, -len), to: addDays(r.from, -1), label: "previous period" };
}

const within = (d: string | null | undefined, r: Range) => !!d && d >= r.from && d <= r.to;

/* ---------------------------------------------------------- stage history */

type StageEvent = { stage: Stage; at: string };

/** Older jobs have no stage log: their history notes ("Moved to "Won"") say when each stage was reached. */
function noteHistory(db: Db): Map<string, StageEvent[]> {
  const m = new Map<string, StageEvent[]>();
  for (const n of db.notes) {
    if (n.kind !== "system" || !n.dealId) continue;
    const hit = /^Moved to "(.+?)"/.exec(n.text);
    const stage = hit && LABEL_TO_STAGE[hit[1]];
    if (stage) m.set(n.dealId, [...(m.get(n.dealId) ?? []), { stage, at: n.createdAt }]);
  }
  return m;
}

function stageDate(d: Deal, stage: Stage, history: Map<string, StageEvent[]>): string | null {
  const last = (list?: StageEvent[]) => list?.filter((e) => e.stage === stage).at(-1);
  const e = last(d.stageLog) ?? last(history.get(d.id));
  if (e) return melDate(e.at);
  if (stage === "won" && d.pylon?.signedAt) return melDate(d.pylon.signedAt);
  if (stage === "won" && (d.stage === "won" || d.stage === "installed")) return melDate(d.updatedAt);
  if (stage === "lost" && d.stage === "lost") return melDate(d.updatedAt);
  return null;
}

/* ----------------------------------------------------------------- report */

export type DealRef = { dealId: string; customerId: string; customer: string; title: string; suburb: string; value: number | null; date: string; source: string; owner: string };
export type SourceLine = { source: string; leads: number; won: number; value: number };
export type PersonLine = { id: string; name: string; leads: number; quotes: number; quotesValue: number; won: number; wonValue: number; followUpsDone: number; overdue: number };

export type Report = {
  range: Range;
  leads: DealRef[];
  quotes: (DealRef & { number: string })[];
  quotesValue: number;
  won: DealRef[];
  wonValue: number;
  lost: number;
  installs: DealRef[];
  followUpsDone: number;
  winRate: number | null;
  avgDaysToWin: number | null;
  previous: { leads: number; quotes: number; quotesValue: number; won: number; wonValue: number };
  pipeline: { stage: Stage; label: string; count: number; value: number }[];
  openQuoteValue: number;
  overdue: { taskId: string; customerId: string; customer: string; note: string; due: string; daysLate: number; owner: string }[];
  unassigned: { customerId: string; customer: string; suburb: string; source: string; createdAt: string }[];
  upcomingInstalls: DealRef[];
  paperwork: { notStarted: number; outstanding: number };
  bySource: SourceLine[];
  byPerson: PersonLine[];
  weekly: { weekStart: string; leads: number; won: number }[];
  monthly: { month: string; value: number; count: number }[];
  today: string;
};

const UNASSIGNED = "Unassigned";

export function buildReport(db: Db, range: Range, today = melbourneToday()): Report {
  const history = noteHistory(db);
  const customers = new Map(db.customers.map((c) => [c.id, c]));
  const staffName = new Map(db.staff.map((s) => [s.id, s.name]));
  const ownerName = (customerId: string) => {
    const a = customers.get(customerId)?.assignedTo;
    return a ? staffName.get(a) ?? "Unknown" : UNASSIGNED;
  };
  const ref = (d: Deal, date: string): DealRef => {
    const c = customers.get(d.customerId);
    return {
      dealId: d.id, customerId: d.customerId, customer: c ? `${c.firstName} ${c.lastName}`.trim() || "Unnamed" : "Customer", title: d.title,
      suburb: c?.suburb ?? "", value: d.value, date, source: d.source || c?.source || "Unknown", owner: ownerName(d.customerId),
    };
  };

  const created = (d: Deal) => melDate(d.createdAt);
  const wonOn = (d: Deal) => stageDate(d, "won", history);
  const isWon = (d: Deal) => d.stage === "won" || d.stage === "installed";

  const summary = (r: Range) => {
    const leads = db.deals.filter((d) => within(created(d), r));
    const quotes = db.deals.flatMap((d) => d.quotes.filter((q) => within(q.date, r)).map((q) => ({ d, q })));
    const won = db.deals.filter((d) => isWon(d) && within(wonOn(d), r));
    return {
      leads: leads.length, quotes: quotes.length, quotesValue: quotes.reduce((n, x) => n + (x.q.amount ?? 0), 0),
      won: won.length, wonValue: won.reduce((n, d) => n + (d.value ?? 0), 0),
    };
  };

  const leads = db.deals.filter((d) => within(created(d), range)).map((d) => ref(d, created(d)));
  const quoteRows = db.deals.flatMap((d) => d.quotes.filter((q) => within(q.date, range)).map((q) => ({ ...ref(d, q.date), value: q.amount, number: q.number })));
  const wonDeals = db.deals.filter((d) => isWon(d) && within(wonOn(d), range));
  const won = wonDeals.map((d) => ref(d, wonOn(d)!));
  const lostCount = db.deals.filter((d) => d.stage === "lost" && within(stageDate(d, "lost", history), range)).length;
  const installs = db.deals.filter((d) => d.stage === "installed" && within(d.installedOn, range)).map((d) => ref(d, d.installedOn!));
  const followUpsDone = db.tasks.filter((t) => t.done && within(t.doneAt ? melDate(t.doneAt) : null, range)).length;

  const days = wonDeals.map((d) => daysBetween(created(d), wonOn(d)!)).filter((n) => n >= 0);

  const OPEN: Stage[] = ["new", "contacted", "assessment", "quoted", "negotiating", "won"];
  const pipeline = OPEN.map((stage) => {
    const ds = db.deals.filter((d) => d.stage === stage);
    return { stage, label: STAGE_LABELS[stage], count: ds.length, value: ds.reduce((n, d) => n + (d.value ?? 0), 0) };
  });

  const overdue = db.tasks
    .filter((t) => !t.done && t.due < today)
    .map((t) => ({
      taskId: t.id, customerId: t.customerId, customer: (() => { const c = customers.get(t.customerId); return c ? `${c.firstName} ${c.lastName}`.trim() : "Customer"; })(),
      note: t.note, due: t.due, daysLate: daysBetween(t.due, today), owner: ownerName(t.customerId),
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  const unassigned = db.customers
    .filter((c) => !c.assignedTo)
    .map((c) => ({ customerId: c.id, customer: `${c.firstName} ${c.lastName}`.trim() || "Unnamed", suburb: c.suburb, source: c.source, createdAt: c.createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const horizon = addDays(today, 14);
  const upcomingInstalls = db.deals
    .filter((d) => d.installDate && d.installDate >= today && d.installDate <= horizon && d.stage !== "lost" && d.stage !== "installed")
    .sort((a, b) => a.installDate!.localeCompare(b.installDate!))
    .map((d) => ref(d, d.installDate!));

  const wonOpen = db.deals.filter((d) => d.stage === "won");
  const paperwork = {
    notStarted: wonOpen.filter((d) => !d.checklist).length,
    outstanding: wonOpen.filter((d) => d.checklist?.some((i) => i.required && !i.done)).length,
  };

  const bySourceMap = new Map<string, SourceLine>();
  for (const d of db.deals.filter((x) => within(created(x), range))) {
    const key = d.source || customers.get(d.customerId)?.source || "Unknown";
    const l = bySourceMap.get(key) ?? { source: key, leads: 0, won: 0, value: 0 };
    l.leads++;
    if (isWon(d)) { l.won++; l.value += d.value ?? 0; }
    bySourceMap.set(key, l);
  }

  const people = new Map<string, PersonLine>();
  const person = (name: string) => people.get(name) ?? (people.set(name, { id: name, name, leads: 0, quotes: 0, quotesValue: 0, won: 0, wonValue: 0, followUpsDone: 0, overdue: 0 }), people.get(name)!);
  leads.forEach((l) => person(l.owner).leads++);
  quoteRows.forEach((q) => { const p = person(q.owner); p.quotes++; p.quotesValue += q.value ?? 0; });
  won.forEach((w) => { const p = person(w.owner); p.won++; p.wonValue += w.value ?? 0; });
  overdue.forEach((o) => person(o.owner).overdue++);
  for (const t of db.tasks) if (t.done && within(t.doneAt ? melDate(t.doneAt) : null, range)) person(ownerName(t.customerId)).followUpsDone++;

  // twelve weeks of enquiries and wins, and twelve months of won value
  const thisMonday = mondayOf(today);
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const weekStart = addDays(thisMonday, -7 * (11 - i));
    const r: Range = { key: "week", from: weekStart, to: addDays(weekStart, 6), label: "" };
    return {
      weekStart,
      leads: db.deals.filter((d) => within(created(d), r)).length,
      won: db.deals.filter((d) => isWon(d) && within(wonOn(d), r)).length,
    };
  });
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(utc(`${monthKey(today)}-01`));
    d.setUTCMonth(d.getUTCMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const monthly = months.map((month) => {
    const ds = db.deals.filter((d) => isWon(d) && (wonOn(d) ?? "").startsWith(month));
    return { month, value: ds.reduce((n, d) => n + (d.value ?? 0), 0), count: ds.length };
  });

  const decided = won.length + lostCount;
  return {
    range, leads, quotes: quoteRows, quotesValue: quoteRows.reduce((n, q) => n + (q.value ?? 0), 0), won, wonValue: won.reduce((n, w) => n + (w.value ?? 0), 0),
    lost: lostCount, installs, followUpsDone, winRate: decided ? won.length / decided : null,
    avgDaysToWin: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    previous: summary(previousRange(range)),
    pipeline, openQuoteValue: pipeline.filter((p) => p.stage === "quoted" || p.stage === "negotiating").reduce((n, p) => n + p.value, 0),
    overdue, unassigned, upcomingInstalls, paperwork,
    bySource: [...bySourceMap.values()].sort((a, b) => b.leads - a.leads),
    byPerson: [...people.values()].sort((a, b) => b.wonValue - a.wonValue || b.leads - a.leads),
    weekly, monthly, today,
  };
}

/* ---------------------------------------------------------------- helpers */

export const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
export const compactMoney = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `$${Math.round(n / 1000)}K` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`);
export const pct = (n: number | null) => (n == null ? "-" : `${Math.round(n * 100)}%`);
