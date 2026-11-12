import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, Empty, PageHeader } from "../components/ui";
import { useStore } from "../store";
import type { Deal } from "../types";
import { fmtMoney } from "../utils";

const PERIODS: [string, number | null][] = [["30 days", 30], ["90 days", 90], ["12 months", 365], ["All time", null]];
const REACHED_QUOTE = (d: Deal) => d.quotes.length > 0 || ["quoted", "negotiating", "won", "installed"].includes(d.stage);
const WON = (d: Deal) => d.stage === "won" || d.stage === "installed";

type Line = { key: string; leads: number; quoted: number; won: number; lost: number; value: number };

function group(deals: Deal[], keyOf: (d: Deal) => string): Line[] {
  const m = new Map<string, Line>();
  for (const d of deals) {
    const key = keyOf(d);
    const l = m.get(key) ?? { key, leads: 0, quoted: 0, won: 0, lost: 0, value: 0 };
    l.leads++;
    if (REACHED_QUOTE(d)) l.quoted++;
    if (WON(d)) { l.won++; l.value += d.value ?? 0; }
    if (d.stage === "lost") l.lost++;
    m.set(key, l);
  }
  return [...m.values()].sort((a, b) => b.leads - a.leads);
}

/** Where enquiries come from and how many turn into jobs: the "which ads pay for themselves" view. */
export default function Sources() {
  const { db } = useStore();
  const [days, setDays] = useState<number | null>(90);

  const deals = useMemo(() => {
    const cutoff = days ? new Date(Date.now() - days * 86400000).toISOString() : "";
    const sourceOf = new Map(db.customers.map((c) => [c.id, c.source]));
    return db.deals
      .filter((d) => d.createdAt >= cutoff)
      .map((d) => ({ ...d, source: d.source || sourceOf.get(d.customerId) || "Unknown" }));
  }, [db.deals, db.customers, days]);

  const bySource = useMemo(() => group(deals, (d) => d.source || "Unknown"), [deals]);
  const byCampaign = useMemo(() => group(deals.filter((d) => d.campaign), (d) => `${d.campaign}  (${d.source})`), [deals]);
  const total = deals.length;
  const won = deals.filter(WON).length;

  return (
    <>
      <a href="#/settings" className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-navy-600"><ArrowLeft className="size-4" /> More</a>
      <PageHeader title="Lead sources" sub="Where enquiries come from, and which turn into jobs" />

      <div className="mb-4 inline-flex rounded-xl bg-mist-100 p-1" role="tablist" aria-label="Period">
        {PERIODS.map(([label, d]) => (
          <button key={label} role="tab" aria-selected={days === d} onClick={() => setDays(d)} className={clsx("min-h-9 whitespace-nowrap rounded-lg px-3 text-sm font-semibold", days === d ? "bg-white text-navy-900 shadow-sm" : "text-mist-500")}>{label}</button>
        ))}
      </div>

      {total === 0 ? (
        <Empty title="No enquiries in this period" hint="Each enquiry records where it came from: website forms and ads do it automatically, and for phone calls or referrals choose it when adding the customer." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="Enquiries" value={total} />
            <Stat label="Jobs won" value={won} />
            <Stat label="Win rate" value={`${Math.round((won / total) * 100)}%`} />
          </div>

          <Table title="By source" lines={bySource} />
          {byCampaign.length > 0 && <Table title="By ad campaign" lines={byCampaign} />}
          <p className="mt-4 px-1 text-xs text-mist-400">
            "Quoted" counts enquiries that reached a quote or beyond; "Won" includes installed jobs, and the value is the agreed price. Recent enquiries haven't had time to convert, so judge a campaign over a few weeks.
          </p>
        </>
      )}
    </>
  );
}

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <Card className="p-3.5">
    <div className="text-2xl font-extrabold tracking-tight">{value}</div>
    <div className="text-xs font-medium text-mist-500">{label}</div>
  </Card>
);

function Table({ title, lines }: { title: string; lines: Line[] }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-mist-500">{title}</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="border-b border-mist-100 text-left text-[11px] uppercase tracking-wide text-mist-500">
              <th className="px-3 py-2 font-bold">{title.replace("By ", "")}</th>
              <th className="px-2 py-2 text-right font-bold">Leads</th>
              <th className="px-2 py-2 text-right font-bold">Quoted</th>
              <th className="px-2 py-2 text-right font-bold">Won</th>
              <th className="px-2 py-2 text-right font-bold">Win %</th>
              <th className="px-3 py-2 text-right font-bold">Won value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-100">
            {lines.map((l) => (
              <tr key={l.key}>
                <td className="max-w-[14rem] px-3 py-2.5 font-semibold">{l.key}</td>
                <td className="px-2 text-right">{l.leads}</td>
                <td className="px-2 text-right">{l.quoted}</td>
                <td className="px-2 text-right font-semibold text-emerald-700">{l.won}</td>
                <td className="px-2 text-right">{Math.round((l.won / l.leads) * 100)}%</td>
                <td className="px-3 text-right font-semibold">{l.value ? fmtMoney(l.value) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
