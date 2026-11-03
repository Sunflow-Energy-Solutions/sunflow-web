import { useEffect, useMemo, useRef, useState } from "react";
import { Battery, Check, ClipboardCopy, Download, ExternalLink, Sun, Zap, CircleOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { PERIOD_DAYS, evaluateDetail, type Period } from "@/lib/energy/engine";
import { resultKey, scorePackages, pickStandouts, type PackageOutcome, type Pick } from "@/lib/energy/analysis";
import type { Assumptions, DayProfile, Plan, ScenarioResult, SystemPackage } from "@/lib/energy/types";
import { runJobs, type Job } from "@/lib/engineClient";
import { buildReportHtml, type ReportData, type ReportOption } from "@/lib/report";
import { PRICE_LIST_DATE } from "@/lib/energy/catalogue.generated";
import DayChart from "./DayChart";
import { Card, money, num } from "./ui";

const PERIODS: { id: Period; label: string; noun: string }[] = [
  { id: "day", label: "Day", noun: "per day" },
  { id: "week", label: "Week", noun: "per week" },
  { id: "month", label: "Month", noun: "per month" },
  { id: "year", label: "Year", noun: "per year" },
];

const MONTH = PERIOD_DAYS.month;

const planShort = (p: Plan) => (/^unknown/i.test(p.retailer) ? p.name : `${p.retailer} ${p.name}`);
const planName = (p: Plan) => (p.id === "current" ? `${planShort(p)} (current)` : planShort(p));

function inverterLabel(p: SystemPackage) {
  const m = p.inverter.match(/(\d+(?:\.\d+)?)\s*kW/i);
  return m ? `${m[1]} kW inverter` : "";
}

function systemTitle(p: SystemPackage) {
  const parts = [];
  if (p.solarKw > 0) parts.push(`${num(p.solarKw, 2)} kW solar`);
  parts.push(`${num(p.batteryKwh, 1)} kWh battery`);
  return parts.join(" + ");
}

type SortKey = "payback" | "saving" | "price" | "tenYear";

export default function Results({
  customer,
  plans,
  base,
  packages,
  assumptions,
  usagePerDay,
  exportPerDay,
}: {
  customer: string;
  plans: Plan[];
  base: DayProfile;
  packages: SystemPackage[];
  assumptions: Assumptions;
  usagePerDay: number;
  exportPerDay: number;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [sortKey, setSortKey] = useState<SortKey>("payback");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportIds, setReportIds] = useState<string[] | null>(null); // null = use the automatic picks
  const [copied, setCopied] = useState(false);

  const scale = PERIOD_DAYS[period];
  const noun = PERIODS.find((p) => p.id === period)!.noun;
  const current = plans[0];

  /* ---- Scenario results: cached per (usage, plans, assumptions) and computed in background workers ---- */
  const inputsKey = useMemo(() => JSON.stringify([base, assumptions, plans]), [base, assumptions, plans]);
  const cache = useRef<{ key: string; map: Map<string, ScenarioResult> }>({ key: "", map: new Map() });
  const [version, setVersion] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (cache.current.key !== inputsKey) cache.current = { key: inputsKey, map: new Map() };
    const store = cache.current.map;
    const pairs = new Map<string, { battery: number; solar: number }>();
    pairs.set("0|0", { battery: 0, solar: 0 });
    for (const p of packages) pairs.set(`${p.batteryKwh}|${p.solarKw}`, { battery: p.batteryKwh, solar: p.solarKw });
    const jobs: Job[] = [];
    plans.forEach((plan, planIndex) => {
      for (const { battery, solar } of pairs.values()) {
        if (!store.has(resultKey(plan.id, battery, solar))) jobs.push({ planIndex, battery, solar });
      }
    });
    if (jobs.length === 0) {
      setProgress(null);
      return;
    }
    const mine = ++runId.current;
    setProgress(0);
    // Small delay so the progress bar paints before heavy work starts.
    const t = setTimeout(() => {
      runJobs(plans, base, assumptions, jobs, (f) => {
        if (mine === runId.current) setProgress(f);
      }).then((out) => {
        if (mine !== runId.current) return;
        for (const { job, result } of out) store.set(resultKey(plans[job.planIndex].id, job.battery, job.solar), result);
        setProgress(null);
        setVersion((v) => v + 1);
      });
    }, 30);
    return () => clearTimeout(t);
  }, [inputsKey, packages, plans, base, assumptions]);

  const lookup = (planId: string, battery: number, solar: number) => cache.current.map.get(resultKey(planId, battery, solar));
  const ready = progress === null && plans.every((p) => lookup(p.id, 0, 0));

  const scored = useMemo(() => {
    if (!ready) return null;
    return scorePackages(packages, plans, lookup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, version, packages, plans]);

  const groups = useMemo(() => {
    if (!scored) return null;
    const battery = scored.outcomes.filter((o) => o.pkg.kind === "battery");
    const combo = scored.outcomes.filter((o) => o.pkg.kind === "solar+battery");
    return { battery: pickStandouts(battery), combo: pickStandouts(combo) };
  }, [scored]);

  const planById = (id: string) => plans.find((p) => p.id === id) ?? current;

  const autoIds = useMemo(() => {
    if (!groups) return [] as string[];
    const ids = [...groups.battery.slice(0, 2), ...groups.combo.slice(0, 2)].map((p) => p.outcome.pkg.id);
    return Array.from(new Set(ids));
  }, [groups]);
  const activeReportIds = reportIds ?? autoIds;
  const toggleReport = (id: string) => setReportIds((cur) => {
    const list = cur ?? autoIds;
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  });

  const sortedOutcomes = useMemo(() => {
    if (!scored) return [];
    const arr = scored.outcomes.filter((o) => o.hwSavingDay > 0);
    const score: Record<SortKey, (o: PackageOutcome) => number> = {
      payback: (o) => o.paybackYears ?? Infinity,
      saving: (o) => -o.savingDay,
      price: (o) => o.pkg.youPay,
      tenYear: (o) => -o.tenYearNet,
    };
    return arr.sort((a, b) => score[sortKey](a) - score[sortKey](b));
  }, [scored, sortKey]);

  const firstPick = groups ? [...groups.combo, ...groups.battery][0]?.outcome : undefined;
  const selected = scored?.outcomes.find((o) => o.pkg.id === selectedId) ?? firstPick ?? null;
  const detail = selected
    ? evaluateDetail(planById(selected.planId), base, selected.pkg.batteryKwh, selected.pkg.solarKw, assumptions)
    : null;

  /* ---- Report ---- */
  const optionFor = (o: PackageOutcome, reasons: string[]): ReportOption => {
    const plan = planById(o.planId);
    return {
      title: systemTitle(o.pkg),
      brand: [o.pkg.brand, inverterLabel(o.pkg)].filter(Boolean).join(" · "),
      tags: reasons,
      includes: [o.pkg.panels && `Solar panels: ${o.pkg.panels}`, o.pkg.inverter && `Inverter: ${o.pkg.inverter}`, o.pkg.battery && `Battery: ${o.pkg.battery}`].filter(Boolean) as string[],
      planLabel: planShort(plan),
      needsPlanSwitch: plan.id !== current.id,
      billBeforeMonth: o.todayDay * MONTH,
      billAfterMonth: o.newDay * MONTH,
      savingMonth: o.savingDay * MONTH,
      savingYear: o.savingDay * 365,
      price: o.pkg.price,
      rebate: o.pkg.rebate,
      youPay: o.pkg.youPay,
      paybackYears: o.paybackYears,
      tenYearNet: o.tenYearNet,
    };
  };

  const buildReport = () => {
    if (!scored || !groups) return "";
    const allPicks = [...groups.battery, ...groups.combo];
    const options = activeReportIds
      .map((id) => scored.outcomes.find((o) => o.pkg.id === id))
      .filter((o): o is PackageOutcome => !!o)
      .map((o) => optionFor(o, allPicks.find((p) => p.outcome.pkg.id === o.pkg.id)?.reasons ?? []));
    const sw = scored.bestNoHardware;
    const data: ReportData = {
      customer,
      dateLabel: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
      currentPlanLabel: planShort(current),
      billMonth: scored.todayDay * MONTH,
      usagePerDay,
      exportPerDay,
      planSwitch:
        sw.plan.id !== current.id && scored.todayDay - sw.day > 0.005
          ? { planLabel: planShort(sw.plan), billMonth: sw.day * MONTH, savingMonth: (scored.todayDay - sw.day) * MONTH }
          : null,
      options,
      priceListDate: new Date(PRICE_LIST_DATE).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
      contact: {
        name: "Sunflow Energy Solutions",
        phone: "(03) 9088 0322",
        email: "info@sunflowenergysolutions.com.au",
        abn: "ABN 27 460 874 669",
        rec: "REC-38454",
      },
    };
    return buildReportHtml(data);
  };

  const downloadReport = () => {
    const html = buildReport();
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    const safe = (customer || "customer").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    a.download = `Sunflow-savings-options-${safe}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const previewReport = () => {
    const url = URL.createObjectURL(new Blob([buildReport()], { type: "text/html" }));
    window.open(url, "_blank");
  };
  const copySummary = () => {
    if (!scored) return;
    const lines = [`Energy savings options${customer ? ` - ${customer}` : ""}`, `Today: ${money(scored.todayDay * MONTH)} a month on ${planShort(current)}`, ""];
    for (const id of activeReportIds) {
      const o = scored.outcomes.find((x) => x.pkg.id === id);
      if (!o) continue;
      lines.push(
        `${o.pkg.brand} ${systemTitle(o.pkg)} on ${planShort(planById(o.planId))}: ${money(o.newDay * MONTH)} a month, saves ${money(o.savingDay * MONTH)} a month. You pay ${money(o.pkg.youPay)} after rebates` +
          (o.paybackYears != null ? `, pays for itself in ${o.paybackYears.toFixed(1)} years.` : ".")
      );
    }
    void navigator.clipboard?.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const periodToggle = (
    <div role="group" aria-label="Show costs per" className="inline-flex rounded-xl border border-mist-200 bg-white p-1">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPeriod(p.id)}
          className={clsx(
            "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            period === p.id ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-mist-100"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  if (!scored || !groups) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-solar-600" />
          <p className="font-semibold text-navy-900">Pricing every system on every plan...</p>
          <div className="h-2 w-64 max-w-full rounded-full bg-mist-100">
            <div className="h-2 rounded-full bg-solar-500 transition-all" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
          </div>
          <p className="text-sm text-mist-500">
            {packages.length} systems × {plans.length} plans. This runs in the background and only takes a few seconds.
          </p>
        </div>
      </Card>
    );
  }

  const sw = scored.bestNoHardware;
  const planSaving = scored.todayDay - sw.day;
  const hasAnyPick = groups.battery.length + groups.combo.length > 0;
  const visibleRows = showAll ? sortedOutcomes : sortedOutcomes.slice(0, 12);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-mist-500">Today on {planName(current)}</p>
          <p className="font-display text-3xl font-bold text-navy-900">
            {money(scored.todayDay * scale)} <span className="text-base font-medium text-mist-500">{noun}</span>
          </p>
        </div>
        {periodToggle}
      </div>

      {/* Share with the customer */}
      <Card
        title="Send this to the customer"
        subtitle={`${activeReportIds.length} option${activeReportIds.length === 1 ? "" : "s"} selected for the report. Tick or untick "In report" on any option below.`}
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadReport} disabled={!activeReportIds.length && planSaving <= 0} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-solar-500 px-5 py-2.5 text-sm font-semibold text-navy-950 shadow hover:bg-solar-400 disabled:opacity-50">
            <Download className="h-4 w-4" /> Download customer report
          </button>
          <button type="button" onClick={previewReport} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-mist-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-mist-50">
            <ExternalLink className="h-4 w-4" /> Preview / print to PDF
          </button>
          <button type="button" onClick={copySummary} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-mist-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-mist-50">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <ClipboardCopy className="h-4 w-4" />} {copied ? "Copied" : "Copy text summary"}
          </button>
        </div>
        <p className="mt-3 text-xs text-mist-500">
          The report is a single page that works on a phone. Email the file as an attachment, or open the preview and choose Print &rarr; Save as PDF. It
          shows only customer prices, rebates and savings - never costs or margins.
        </p>
      </Card>

      {/* Plan switch */}
      <section aria-label="Plan switch">
        <div className="rounded-2xl border border-mist-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Zap className="h-4 w-4 text-solar-600" /> Switch plan only (no new equipment)
          </p>
          {planSaving > 0.005 ? (
            <p className="mt-2 text-navy-900">
              <span className="font-display text-2xl font-bold">Save {money(planSaving * scale)}</span> <span className="text-mist-500">{noun}</span> by moving to{" "}
              <strong>{planShort(sw.plan)}</strong> ({money(sw.day * scale)} {noun}).
            </p>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-mist-500">
              <CircleOff className="h-4 w-4" /> No other plan in the library beats the current one for this usage.
            </p>
          )}
        </div>
      </section>

      {/* Battery only / solar + battery picks */}
      {[
        { key: "battery", title: "Battery only", icon: <Battery className="h-4 w-4" />, picks: groups.battery, empty: "No battery-only package pays for itself on these plans." },
        { key: "combo", title: "Solar + battery", icon: <Sun className="h-4 w-4" />, picks: groups.combo, empty: "No solar + battery package pays for itself on these plans." },
      ].map((g) => (
        <section key={g.key} aria-label={g.title}>
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
            <span className="text-solar-600">{g.icon}</span> {g.title}
          </h3>
          {g.picks.length === 0 ? (
            <p className="flex items-center gap-2 rounded-2xl border border-dashed border-mist-300 bg-mist-50 p-5 text-sm text-mist-500">
              <CircleOff className="h-4 w-4 shrink-0" /> {g.empty}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {g.picks.map((p) => (
                <PickCard
                  key={p.outcome.pkg.id}
                  pick={p}
                  plan={planById(p.outcome.planId)}
                  current={current}
                  scale={scale}
                  noun={noun}
                  inReport={activeReportIds.includes(p.outcome.pkg.id)}
                  onToggleReport={() => toggleReport(p.outcome.pkg.id)}
                  onSelect={() => setSelectedId(p.outcome.pkg.id)}
                  selected={selected?.pkg.id === p.outcome.pkg.id}
                />
              ))}
            </div>
          )}
        </section>
      ))}
      {hasAnyPick && (
        <p className="-mt-2 text-xs text-mist-500">
          Payback counts only what the system itself saves, compared with the best the customer could do without it (their current plan, or a cheaper plan). Prices
          are what the customer pays after the government rebate. Solar-only systems aren&apos;t in the price list, so they aren&apos;t priced here.
        </p>
      )}

      {/* All systems */}
      <Card
        title="All systems that save money"
        subtitle={`${sortedOutcomes.length} of ${packages.length} systems reduce this customer's bill. Click a row to see its typical day.`}
        action={
          <select aria-label="Sort systems by" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-lg border border-mist-300 bg-white px-3 py-1.5 text-sm">
            <option value="payback">Fastest payback</option>
            <option value="tenYear">Best 10-year return</option>
            <option value="saving">Biggest saving</option>
            <option value="price">Lowest price</option>
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
                <th className="pb-2 pr-3 font-semibold">System</th>
                <th className="pb-2 pr-3 text-right font-semibold">You pay</th>
                <th className="pb-2 pr-3 text-right font-semibold">New bill</th>
                <th className="pb-2 pr-3 text-right font-semibold">Saves</th>
                <th className="pb-2 pr-3 text-right font-semibold">Payback</th>
                <th className="pb-2 pr-3 text-right font-semibold">10-yr net</th>
                <th className="pb-2 text-center font-semibold">In report</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((o) => (
                <tr key={o.pkg.id} onClick={() => setSelectedId(o.pkg.id)} className={clsx("cursor-pointer border-t border-mist-200 hover:bg-mist-50", selected?.pkg.id === o.pkg.id && "bg-solar-300/15")}>
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-navy-900">{systemTitle(o.pkg)}</span>
                    <span className="block text-xs text-mist-500">
                      {o.pkg.brand} · {inverterLabel(o.pkg)}
                      {o.pkg.phase ? ` · ${o.pkg.phase} phase` : ""} · {planShort(planById(o.planId))}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{money(o.pkg.youPay)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{money(o.newDay * scale)}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-green-700">{money(o.savingDay * scale)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{o.paybackYears == null ? "-" : `${num(o.paybackYears, 1)} yrs`}</td>
                  <td className={clsx("py-2.5 pr-3 text-right tabular-nums", o.tenYearNet < 0 && "text-red-600")}>{money(o.tenYearNet)}</td>
                  <td className="py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Include ${systemTitle(o.pkg)} in report`} checked={activeReportIds.includes(o.pkg.id)} onChange={() => toggleReport(o.pkg.id)} className="h-4 w-4 cursor-pointer accent-solar-500" />
                  </td>
                </tr>
              ))}
              {sortedOutcomes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-mist-500">
                    None of the selected systems reduce this customer&apos;s bill. Try other brands or a different phase on the &quot;Systems &amp; pricing&quot; step.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sortedOutcomes.length > 12 && (
          <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 cursor-pointer text-sm font-semibold text-navy-700 underline">
            {showAll ? "Show fewer" : `Show all ${sortedOutcomes.length}`}
          </button>
        )}
      </Card>

      {/* Plan comparison */}
      <Card title="Plan comparison" subtitle={`Same usage on each plan, no new equipment. ${noun[0].toUpperCase()}${noun.slice(1)}.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
                <th className="pb-2 pr-3 font-semibold">Plan</th>
                <th className="pb-2 pr-3 text-right font-semibold">Supply</th>
                <th className="pb-2 pr-3 text-right font-semibold">Usage</th>
                <th className="pb-2 pr-3 text-right font-semibold">Credits</th>
                <th className="pb-2 pr-3 text-right font-semibold">Total</th>
                <th className="pb-2 text-right font-semibold">vs today</th>
              </tr>
            </thead>
            <tbody>
              {plans
                .map((p) => ({ p, c: lookup(p.id, 0, 0)!.cost }))
                .sort((a, b) => a.c.total - b.c.total)
                .map(({ p, c }, i) => {
                  const diff = scored.todayDay - c.total;
                  const credits = c.exportCredit + c.bonus + c.dailyCredit;
                  return (
                    <tr key={p.id} className={clsx("border-t border-mist-200", i === 0 && "bg-green-50/60")}>
                      <td className="py-2.5 pr-3 font-medium text-navy-900">
                        {planName(p)}
                        {i === 0 && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Cheapest</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{money(c.supply * scale)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{money((c.usage - c.discount) * scale)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{credits * scale < 0.5 ? "-" : `-${money(credits * scale)}`}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{money(c.total * scale)}</td>
                      <td className={clsx("py-2.5 text-right font-semibold tabular-nums", diff > 0.005 ? "text-green-700" : diff < -0.005 ? "text-red-600" : "text-mist-500")}>
                        {p.id === current.id ? "-" : diff > 0 ? `Save ${money(diff * scale)}` : `+${money(-diff * scale)}`}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Typical day */}
      {selected && detail && (
        <Card
          title="A typical day"
          subtitle={`${selected.pkg.brand} ${systemTitle(selected.pkg)} on ${planShort(planById(selected.planId))}`}
          action={
            <div className="text-right text-sm">
              <p className="font-semibold text-navy-900">
                {money(selected.newDay * scale)} <span className="font-normal text-mist-500">{noun}</span>
              </p>
              <p className="text-mist-500">saves {money(selected.savingDay * scale)} vs today</p>
            </div>
          }
        >
          <DayChart plan={planById(selected.planId)} baseline={base} detail={detail} />
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Stat label="Grid import" value={`${num(detail.cost.importKwh, 1)} kWh/day`} />
            <Stat label="Solar exported" value={`${num(detail.cost.exportKwh, 1)} kWh/day`} />
            <Stat label="Daily credit earned" value={planById(selected.planId).dailyCredit ? (detail.cost.dailyCredit > 0 ? "Yes" : "No") : "n/a"} />
            <Stat label="Battery cycles" value={`${num(detail.cycles, 2)} /day`} />
          </dl>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-mist-500">{label}</dt>
      <dd className="mt-1 font-display text-base font-semibold text-navy-900">{value}</dd>
    </div>
  );
}

function PickCard({
  pick,
  plan,
  current,
  scale,
  noun,
  inReport,
  onToggleReport,
  onSelect,
  selected,
}: {
  pick: Pick;
  plan: Plan;
  current: Plan;
  scale: number;
  noun: string;
  inReport: boolean;
  onToggleReport: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  const o = pick.outcome;
  return (
    <div className={clsx("flex flex-col rounded-2xl border bg-white p-5 shadow-sm", selected ? "border-navy-900 ring-2 ring-navy-900/20" : "border-mist-200")}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {pick.reasons.map((r) => (
          <span key={r} className="rounded-full bg-solar-300/30 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
            {r}
          </span>
        ))}
      </div>
      <button type="button" onClick={onSelect} className="cursor-pointer text-left">
        <p className="font-display text-lg font-semibold text-navy-900">{systemTitle(o.pkg)}</p>
        <p className="text-sm text-mist-500">
          {o.pkg.brand} · {inverterLabel(o.pkg)}
          {o.pkg.phase ? ` · ${o.pkg.phase} phase` : ""}
        </p>
        <p className="mt-3 font-display text-2xl font-bold text-green-700">
          Save {money(o.savingDay * scale)} <span className="text-sm font-medium text-mist-500">{noun}</span>
        </p>
      </button>
      <p className="mt-1 text-sm text-navy-800">
        On {planShort(plan)}
        {plan.id !== current.id && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">plan switch</span>}
      </p>
      <dl className="mt-3 space-y-1 border-t border-mist-200 pt-3 text-sm">
        <Row k="New bill" v={money(o.newDay * scale)} />
        <Row k="System price" v={money(o.pkg.price)} />
        <Row k="Rebate" v={`-${money(o.pkg.rebate)}`} />
        <Row k="You pay" v={money(o.pkg.youPay)} strong />
        <Row k="Payback" v={o.paybackYears == null ? "-" : `${num(o.paybackYears, 1)} years`} strong />
        <Row k="10-year net" v={money(o.tenYearNet)} />
      </dl>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-800">
        <input type="checkbox" checked={inReport} onChange={onToggleReport} className="h-4 w-4 cursor-pointer accent-solar-500" /> In customer report
      </label>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-mist-500">{k}</dt>
      <dd className={clsx("tabular-nums text-navy-900", strong && "font-semibold")}>{v}</dd>
    </div>
  );
}
