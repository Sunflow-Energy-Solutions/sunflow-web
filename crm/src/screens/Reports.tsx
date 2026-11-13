import clsx from "clsx";
import { ArrowDown, ArrowUp, Download, Minus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { BarList, ChartCard, ColumnChart, DataTable, SERIES } from "../components/charts";
import { Card, PageHeader, Select } from "../components/ui";
import { RANGE_LABELS, buildReport, compactMoney, money, pct, previousRange, rangeFor, type Report, type RangeKey } from "../reports";
import { useStore } from "../store";
import type { Db } from "../types";
import { csvEscape, download, fmtDate, fmtDateShort } from "../utils";

const RANGES: RangeKey[] = ["today", "yesterday", "week", "month", "30d", "90d", "12m"];

/** Limit everything to one person's customers (managers only): their jobs, follow-ups and notes follow the customer. */
function scope(db: Db, who: string): Db {
  if (who === "all") return db;
  const mine = new Set(db.customers.filter((c) => (who === "none" ? !c.assignedTo : c.assignedTo === who)).map((c) => c.id));
  return {
    ...db,
    customers: db.customers.filter((c) => mine.has(c.id)),
    deals: db.deals.filter((d) => mine.has(d.customerId)),
    tasks: db.tasks.filter((t) => mine.has(t.customerId)),
    notes: db.notes.filter((n) => mine.has(n.customerId)),
  };
}

export default function Reports() {
  const { db, me } = useStore();
  const [key, setKey] = useState<RangeKey>("week");
  const [who, setWho] = useState("all");
  const range = useMemo(() => rangeFor(key), [key]);
  const r = useMemo(() => buildReport(scope(db, who), range), [db, who, range]);
  const prevLabel = previousRange(range).label;
  const showPeople = !me.isLimited;

  function exportCsv() {
    const rows: (string | number | null)[][] = [["Type", "Date", "Customer", "Suburb", "Job", "Value", "Source", "Looked after by"]];
    const add = (type: string, list: Report["leads"]) => list.forEach((x) => rows.push([type, x.date, x.customer, x.suburb, x.title, x.value, x.source, x.owner]));
    add("Enquiry", r.leads);
    add("Quote sent", r.quotes);
    add("Job won", r.won);
    add("Installed", r.installs);
    download(`sunflow-report-${range.from}-to-${range.to}.csv`, "﻿" + rows.map((row) => row.map(csvEscape).join(",")).join("\r\n"));
  }

  const attention = [
    { n: r.overdue.length, label: "overdue follow-ups", href: "#/tasks", bad: true },
    { n: r.unassigned.length, label: "new leads not assigned", href: "#/", bad: true, hide: me.isLimited },
    { n: r.paperwork.outstanding + r.paperwork.notStarted, label: "won jobs with paperwork outstanding", href: "#/pipeline" },
    { n: r.upcomingInstalls.length, label: "installs in the next 14 days", href: "#/calendar" },
  ].filter((a) => !a.hide);

  return (
    <>
      <PageHeader
        title="Reports"
        sub={`${range.label}: ${range.from === range.to ? fmtDate(range.from) : `${fmtDate(range.from)} to ${fmtDate(range.to)}`}`}
        right={<button onClick={exportCsv} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-mist-100 px-3 text-sm font-semibold text-navy-800 hover:bg-mist-200"><Download className="size-4" /> Export</button>}
      />

      {/* one filter row, above everything it scopes */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 bg-mist-50/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Period">
          {RANGES.map((k) => (
            <button key={k} role="tab" aria-selected={key === k} onClick={() => setKey(k)} className={clsx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold", key === k ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 bg-white text-mist-500")}>
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
        {showPeople && db.staff.length > 0 && (
          <Select value={who} onChange={(e) => setWho(e.target.value)} className="mt-1.5 max-w-xs" aria-label="Whose customers">
            <option value="all">Everyone's customers</option>
            {db.staff.map((s) => <option key={s.id} value={s.id}>{s.name}'s customers</option>)}
            <option value="none">Unassigned</option>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile label="New enquiries" value={String(r.leads.length)} delta={<Delta now={r.leads.length} before={r.previous.leads} label={prevLabel} />} />
        <Tile label="Quotes sent" value={money(r.quotesValue)} sub={`${r.quotes.length} quote${r.quotes.length === 1 ? "" : "s"}`} delta={<Delta now={r.quotesValue} before={r.previous.quotesValue} label={prevLabel} money />} />
        <Tile label="Jobs won" value={money(r.wonValue)} sub={`${r.won.length} job${r.won.length === 1 ? "" : "s"}`} delta={<Delta now={r.wonValue} before={r.previous.wonValue} label={prevLabel} money />} />
        <Tile label="Win rate" value={pct(r.winRate)} sub={r.won.length + r.lost ? `${r.won.length} won, ${r.lost} lost` : "no decisions yet"} />
        <Tile label="Installs completed" value={String(r.installs.length)} />
        <Tile label="Open quotes" value={money(r.openQuoteValue)} sub={r.avgDaysToWin != null ? `avg ${r.avgDaysToWin} days to win` : "quoted + negotiating now"} />
      </div>

      <h2 className="mb-2 mt-6 px-1 text-[13px] font-bold uppercase tracking-wide text-mist-500">Needs attention</h2>
      <Card className="divide-y divide-mist-100">
        {attention.map((a) => (
          <a key={a.label} href={a.href} className="flex min-h-12 items-center gap-3 px-4 hover:bg-mist-50">
            <span className={clsx("min-w-8 text-xl font-extrabold tabular-nums", a.n > 0 && a.bad ? "text-red-600" : "text-navy-900")}>{a.n}</span>
            <span className="text-sm font-medium text-navy-800">{a.label}</span>
          </a>
        ))}
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Enquiries and jobs won, by week"
          subtitle="Last 12 weeks (not changed by the period above)"
          chart={
            <ColumnChart
              ariaLabel="Enquiries and jobs won in each of the last 12 weeks"
              series={[{ name: "Enquiries", color: SERIES.navy }, { name: "Jobs won", color: SERIES.orange }]}
              fmt={(n) => String(n)}
              data={r.weekly.map((w) => ({ label: `Week of ${fmtDateShort(w.weekStart).replace(/^\w+, /, "")}`, short: fmtDateShort(w.weekStart).replace(/^\w+, /, ""), values: [w.leads, w.won] }))}
            />
          }
          table={<DataTable head={["Week starting", "Enquiries", "Jobs won"]} rows={r.weekly.map((w) => [fmtDate(w.weekStart), w.leads, w.won])} />}
        />
        <ChartCard
          title="Value of jobs won, by month"
          subtitle="Last 12 months (not changed by the period above)"
          chart={
            <ColumnChart
              ariaLabel="Value of jobs won in each of the last 12 months"
              series={[{ name: "Value won", color: SERIES.navy }]}
              fmt={(n) => money(n)}
              axisFmt={compactMoney}
              data={r.monthly.map((m) => ({ label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-AU", { month: "long", year: "numeric" }), short: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-AU", { month: "short" }), values: [m.value] }))}
            />
          }
          table={<DataTable head={["Month", "Jobs won", "Value"]} rows={r.monthly.map((m) => [m.month, m.count, money(m.value)])} />}
        />
        <ChartCard
          title="The pipeline right now"
          subtitle="Jobs at each stage, with their value"
          chart={<BarList rows={r.pipeline.map((p) => ({ label: p.label, value: p.count, display: String(p.count), sub: p.value ? money(p.value) : undefined, href: "#/pipeline" }))} />}
          table={<DataTable head={["Stage", "Jobs", "Value"]} rows={r.pipeline.map((p) => [p.label, p.count, money(p.value)])} />}
        />
        <ChartCard
          title="Where enquiries come from"
          subtitle={`${range.label}, with how many became jobs`}
          chart={<BarList empty="No enquiries in this period" rows={r.bySource.slice(0, 8).map((s) => ({ label: s.source, value: s.leads, display: String(s.leads), sub: s.won ? `${s.won} won · ${money(s.value)}` : "none won yet" }))} />}
          table={<DataTable head={["Source", "Enquiries", "Won", "Won value"]} rows={r.bySource.map((s) => [s.source, s.leads, s.won, money(s.value)])} />}
        />
      </div>

      {showPeople && r.byPerson.length > 0 && (
        <Detail title="By person" count={r.byPerson.length} open>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-mist-200 text-left text-[11px] uppercase tracking-wide text-mist-500">
                  <th className="py-1.5 font-bold">Looked after by</th>
                  {["Enquiries", "Quotes", "Quoted", "Won", "Won value", "Calls done", "Overdue"].map((h) => <th key={h} className="py-1.5 text-right font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {r.byPerson.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 font-semibold">{p.name}</td>
                    <td className="text-right tabular-nums">{p.leads}</td>
                    <td className="text-right tabular-nums">{p.quotes}</td>
                    <td className="text-right tabular-nums">{money(p.quotesValue)}</td>
                    <td className="text-right font-semibold tabular-nums text-emerald-700">{p.won}</td>
                    <td className="text-right tabular-nums">{money(p.wonValue)}</td>
                    <td className="text-right tabular-nums">{p.followUpsDone}</td>
                    <td className={clsx("text-right tabular-nums", p.overdue > 0 && "font-semibold text-red-600")}>{p.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Detail>
      )}

      <Detail title="Jobs won" count={r.won.length}>
        <DealList list={r.won} showValue empty="No jobs won in this period" />
      </Detail>
      <Detail title="Quotes sent" count={r.quotes.length}>
        <DealList list={r.quotes} showValue empty="No quotes sent in this period" />
      </Detail>
      <Detail title="New enquiries" count={r.leads.length}>
        <DealList list={r.leads} empty="No enquiries in this period" />
      </Detail>
      <Detail title="Installs completed" count={r.installs.length}>
        <DealList list={r.installs} showValue empty="No installs completed in this period" />
      </Detail>
      <Detail title="Overdue follow-ups" count={r.overdue.length}>
        {r.overdue.length === 0 ? <p className="py-3 text-sm text-mist-500">Nothing overdue. Well done.</p> : (
          <ul className="divide-y divide-mist-100">
            {r.overdue.slice(0, 25).map((o) => (
              <li key={o.taskId}>
                <a href={`#/customers/${o.customerId}`} className="flex items-start gap-3 py-2.5 hover:bg-mist-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{o.customer}</span>
                    <span className="block truncate text-xs text-mist-500">{o.note || "(no note)"} · {o.owner}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-red-600">{o.daysLate} day{o.daysLate === 1 ? "" : "s"} late</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Detail>
      <Detail title="Installs in the next 14 days" count={r.upcomingInstalls.length}>
        <DealList list={r.upcomingInstalls} empty="No installs booked in the next 14 days" />
      </Detail>
      <p className="mt-6 px-1 text-xs text-mist-400">
        Numbers come from what is recorded in the CRM. "Won" is counted on the day the customer said yes (or signed in Pylon). Jobs won before stage dates were recorded use their history notes.
      </p>
    </>
  );
}

function Tile({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: ReactNode }) {
  return (
    <Card className="p-3.5">
      <div className="text-xs font-medium text-mist-500">{label}</div>
      <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-navy-900">{value}</div>
      {sub && <div className="text-xs text-mist-500">{sub}</div>}
      {delta && <div className="mt-1">{delta}</div>}
    </Card>
  );
}

/** Change against the previous period. Up is good for every number shown here, so up = green, down = red, level = grey. Always an arrow + words. */
function Delta({ now, before, label, money: asMoney }: { now: number; before: number; label: string; money?: boolean }) {
  const diff = now - before;
  const up = diff > 0, down = diff < 0;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const size = asMoney ? compactMoney(Math.abs(diff)) : String(Math.abs(diff));
  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-semibold", up ? "text-[#006300]" : down ? "text-red-700" : "text-mist-500")}>
      <Icon className="size-3.5" />
      {diff === 0 ? "same as" : `${size} ${up ? "more" : "fewer"} than`} {label}
    </span>
  );
}

function Detail({ title, count, children, open }: { title: string; count: number; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group mt-3 rounded-2xl border border-mist-200 bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-navy-900">
        <span>{title} <span className="ml-1 font-semibold text-mist-500">({count})</span></span>
        <span className="text-xs font-semibold text-navy-600 group-open:hidden">Show</span>
        <span className="hidden text-xs font-semibold text-navy-600 group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-mist-100 px-4 pb-3">{children}</div>
    </details>
  );
}

function DealList({ list, showValue, empty }: { list: Report["leads"]; showValue?: boolean; empty: string }) {
  if (list.length === 0) return <p className="py-3 text-sm text-mist-500">{empty}</p>;
  return (
    <ul className="divide-y divide-mist-100">
      {list.slice(0, 50).map((d, i) => (
        <li key={`${d.dealId}-${i}`}>
          <a href={`#/customers/${d.customerId}`} className="flex items-start gap-3 py-2.5 hover:bg-mist-50">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{d.customer}{d.suburb ? <span className="font-normal text-mist-500"> · {d.suburb}</span> : null}</span>
              <span className="block truncate text-xs text-mist-500">{[d.title, d.source, d.owner !== "Unassigned" ? d.owner : "unassigned"].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="shrink-0 text-right">
              {showValue && d.value != null && <span className="block text-sm font-bold tabular-nums text-navy-900">{money(d.value)}</span>}
              <span className="block text-xs text-mist-500">{fmtDate(d.date)}</span>
            </span>
          </a>
        </li>
      ))}
      {list.length > 50 && <li className="py-2 text-xs text-mist-500">+ {list.length - 50} more - export for the full list</li>}
    </ul>
  );
}
