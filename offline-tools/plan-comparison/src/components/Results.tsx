"use client";

import { useMemo, useState } from "react";
import { Battery, ClipboardCopy, Sun, Trophy, Zap, CircleOff } from "lucide-react";
import clsx from "clsx";
import { PERIOD_DAYS, costDay, evaluateDetail, runCube, type Period } from "@/lib/energy/engine";
import type { Assumptions, DayProfile, Plan, ScenarioResult, SizeOption } from "@/lib/energy/types";
import DayChart from "./DayChart";
import { Card, money, num } from "./ui";

const PERIODS: { id: Period; label: string; noun: string }[] = [
  { id: "day", label: "Day", noun: "per day" },
  { id: "week", label: "Week", noun: "per week" },
  { id: "month", label: "Month", noun: "per month" },
  { id: "year", label: "Year", noun: "per year" },
];

const planName = (p: Plan) => (p.id === "current" ? `${p.retailer} ${p.name} (current)` : `${p.retailer} ${p.name}`);

function hardwareLabel(battery: number, solar: number) {
  const parts = [];
  if (battery > 0) parts.push(`${num(battery, 1)} kWh battery`);
  if (solar > 0) parts.push(`${num(solar, 1)} kW extra solar`);
  return parts.length ? parts.join(" + ") : "No new hardware";
}

function sizeList(opts: SizeOption[]) {
  return Array.from(new Set([0, ...opts.map((o) => o.size).filter((s) => s > 0)])).sort((a, b) => a - b);
}

interface Pick {
  row: ScenarioResult;
  plan: Plan;
  saving: number; // $/day vs today
  hwSaving: number; // $/day vs the same plan without new hardware
  price: number | null;
  max: { row: ScenarioResult; plan: Plan; saving: number } | null;
}

export default function Results({
  customer,
  plans,
  base,
  batteries,
  solars,
  assumptions,
}: {
  customer: string;
  plans: Plan[];
  base: DayProfile;
  batteries: SizeOption[];
  solars: SizeOption[];
  assumptions: Assumptions;
}) {
  const [period, setPeriod] = useState<Period>("month");
  const [curvePlanId, setCurvePlanId] = useState<string | null>(null);
  const [curveSolar, setCurveSolar] = useState(0);
  const [selected, setSelected] = useState<{ planId: string; battery: number; solar: number } | null>(null);

  const batterySizes = useMemo(() => sizeList(batteries), [batteries]);
  const solarSizes = useMemo(() => sizeList(solars), [solars]);
  const scale = PERIOD_DAYS[period];
  const noun = PERIODS.find((p) => p.id === period)!.noun;

  const cube = useMemo(
    () => runCube(plans, base, batterySizes, solarSizes, assumptions),
    [plans, base, batterySizes, solarSizes, assumptions]
  );

  const get = (planId: string, battery: number, solar: number) =>
    cube.find((r) => r.planId === planId && r.batteryKwh === battery && r.solarKw === solar)!;
  const planById = (id: string) => plans.find((p) => p.id === id)!;
  const current = plans[0];
  const today = get(current.id, 0, 0).cost.total;

  const priceOf = (battery: number, solar: number) => {
    const b = battery > 0 ? batteries.find((o) => o.size === battery)?.price ?? null : 0;
    const s = solar > 0 ? solars.find((o) => o.size === solar)?.price ?? null : 0;
    return b == null || s == null ? null : b + s;
  };

  /* Plan comparison with no new hardware */
  const planRows = plans
    .map((p) => ({ plan: p, r: get(p.id, 0, 0) }))
    .sort((a, b) => a.r.cost.total - b.r.cost.total);
  const worstPlan = Math.max(...planRows.map((x) => Math.abs(x.r.cost.total)), 0.01);

  /* Recommendation per category */
  const pickFor = (match: (r: ScenarioResult) => boolean): Pick | null => {
    const rows = cube.filter(match);
    if (rows.length === 0) return null;
    const withSaving = rows.map((row) => ({ row, saving: today - row.cost.total }));
    const best = withSaving.reduce((a, b) => (b.saving > a.saving ? b : a));
    if (best.saving <= 0.005) return null;
    const allPriced = withSaving.every((x) => priceOf(x.row.batteryKwh, x.row.solarKw) != null);
    const cost = (x: { row: ScenarioResult }) =>
      allPriced ? priceOf(x.row.batteryKwh, x.row.solarKw)! : x.row.batteryKwh * 100 + x.row.solarKw * 100;
    const good = withSaving.filter((x) => x.saving >= best.saving * 0.9);
    const chosen = good.reduce((a, b) => (cost(b) < cost(a) || (cost(b) === cost(a) && b.saving > a.saving) ? b : a));
    const noHw = get(chosen.row.planId, 0, 0).cost.total;
    return {
      row: chosen.row,
      plan: planById(chosen.row.planId),
      saving: chosen.saving,
      hwSaving: noHw - chosen.row.cost.total,
      price: priceOf(chosen.row.batteryKwh, chosen.row.solarKw),
      max: { row: best.row, plan: planById(best.row.planId), saving: best.saving },
    };
  };

  const picks = {
    plan: (() => {
      const best = planRows[0];
      return best.plan.id === current.id || today - best.r.cost.total <= 0.005
        ? null
        : { row: best.r, plan: best.plan, saving: today - best.r.cost.total, hwSaving: 0, price: 0, max: null };
    })(),
    battery: pickFor((r) => r.batteryKwh > 0 && r.solarKw === 0),
    solar: pickFor((r) => r.batteryKwh === 0 && r.solarKw > 0),
    both: pickFor((r) => r.batteryKwh > 0 && r.solarKw > 0),
  } satisfies Record<string, Pick | null>;

  const best = [picks.both, picks.battery, picks.solar, picks.plan]
    .filter((p): p is Pick => !!p)
    .reduce<Pick | null>((a, b) => (!a || b.saving > a.saving ? b : a), null);

  const sel = selected ?? (best ? { planId: best.row.planId, battery: best.row.batteryKwh, solar: best.row.solarKw } : { planId: current.id, battery: 0, solar: 0 });
  const selPlan = plans.find((p) => p.id === sel.planId) ?? current;
  const selDetail = evaluateDetail(selPlan, base, sel.battery, sel.solar, assumptions);
  const selBase = costDay(selPlan, base.D, base.X);

  const curvePlan = plans.find((p) => p.id === (curvePlanId ?? best?.row.planId ?? current.id)) ?? current;
  const curveRows = batterySizes.map((b) => get(curvePlan.id, b, curveSolar));
  const curveNoBattery = get(curvePlan.id, 0, curveSolar).cost.total;
  const maxCurveSaving = Math.max(0.01, ...curveRows.map((r) => curveNoBattery - r.cost.total));

  const copySummary = () => {
    const lines = [`Electricity plan & hardware comparison${customer ? ` - ${customer}` : ""}`, `Today: ${money(today * scale)} ${noun} on ${planName(current)}`, ""];
    const add = (title: string, p: Pick | null) => {
      if (!p) return;
      lines.push(
        `${title}: ${planName(p.plan)}, ${hardwareLabel(p.row.batteryKwh, p.row.solarKw)} - ${money(p.row.cost.total * scale)} ${noun}, saving ${money(p.saving * scale)} ${noun} (${money(p.saving * 365)}/year)` +
          (p.price != null && p.price > 0 && p.hwSaving > 0 ? `, hardware payback about ${num(p.price / (p.hwSaving * 365), 1)} years` : "")
      );
    };
    add("Switch plan only", picks.plan);
    add("Battery", picks.battery);
    add("Extra solar", picks.solar);
    add("Solar + battery", picks.both);
    void navigator.clipboard?.writeText(lines.join("\n"));
  };

  const periodToggle = (
    <div role="group" aria-label="Show costs per" className="inline-flex rounded-xl border border-mist-200 bg-white p-1">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPeriod(p.id)}
          className={clsx(
            "cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
            period === p.id ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-mist-100"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-mist-500">Today on {planName(current)}</p>
          <p className="font-display text-3xl font-bold text-navy-900">
            {money(today * scale)} <span className="text-base font-medium text-mist-500">{noun}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {periodToggle}
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm font-medium text-navy-800 hover:bg-mist-50"
          >
            <ClipboardCopy className="h-4 w-4" /> Copy summary
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <section aria-label="Recommended scenarios">
        <h3 className="mb-3 font-display text-lg font-semibold text-navy-900">What would save this customer money</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PickCard icon={<Zap className="h-4 w-4" />} title="Switch plan only" pick={picks.plan} scale={scale} noun={noun} empty="No other plan beats the current one." onSelect={setSelected} highlight={best === picks.plan} />
          <PickCard icon={<Battery className="h-4 w-4" />} title="Add a battery" pick={picks.battery} scale={scale} noun={noun} empty="A battery doesn't pay on any of these plans." onSelect={setSelected} highlight={best === picks.battery} />
          <PickCard icon={<Sun className="h-4 w-4" />} title="Add more solar" pick={picks.solar} scale={scale} noun={noun} empty="Extra solar doesn't reduce the bill on any of these plans." onSelect={setSelected} highlight={best === picks.solar} />
          <PickCard icon={<Trophy className="h-4 w-4" />} title="Solar + battery" pick={picks.both} scale={scale} noun={noun} empty="No saving from combining them." onSelect={setSelected} highlight={best === picks.both} />
        </div>
        <p className="mt-2 text-xs text-mist-500">
          Each card is the smallest option that captures at least 90% of the saving available in that category, so the customer isn&apos;t
          sold more capacity than the bill rewards. Payback counts only the hardware&apos;s own saving, and shows once you&apos;ve entered prices.
        </p>
      </section>

      {/* Plan comparison */}
      <Card title="Plan comparison" subtitle={`Same usage on each plan, no new hardware. ${noun[0].toUpperCase()}${noun.slice(1)}.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
                <th className="pb-2 pr-3 font-semibold">Plan</th>
                <th className="pb-2 pr-3 text-right font-semibold">Supply</th>
                <th className="pb-2 pr-3 text-right font-semibold">Usage</th>
                <th className="pb-2 pr-3 text-right font-semibold">Credits</th>
                <th className="pb-2 pr-3 text-right font-semibold">Total</th>
                <th className="pb-2 pr-3 text-right font-semibold">vs today</th>
                <th className="w-40 pb-2" />
              </tr>
            </thead>
            <tbody>
              {planRows.map(({ plan, r }, i) => {
                const c = r.cost;
                const diff = today - c.total;
                return (
                  <tr key={plan.id} className={clsx("border-t border-mist-200", i === 0 && "bg-green-50/60")}>
                    <td className="py-2.5 pr-3 font-medium text-navy-900">
                      {planName(plan)}
                      {i === 0 && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Cheapest</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(c.supply * scale)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money((c.usage - c.discount) * scale)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{c.exportCredit + c.bonus + c.dailyCredit < 0.005 / scale ? "-" : `-${money((c.exportCredit + c.bonus + c.dailyCredit) * scale)}`}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{money(c.total * scale)}</td>
                    <td className={clsx("py-2.5 pr-3 text-right font-semibold tabular-nums", diff > 0.005 ? "text-green-700" : diff < -0.005 ? "text-red-600" : "text-mist-500")}>
                      {plan.id === current.id ? "-" : diff > 0 ? `Save ${money(diff * scale)}` : `+${money(-diff * scale)}`}
                    </td>
                    <td className="py-2.5">
                      <div className="h-2 rounded-full bg-mist-100">
                        <div
                          className={clsx("h-2 rounded-full", i === 0 ? "bg-green-500" : "bg-navy-600")}
                          style={{ width: `${Math.max(2, (Math.max(0, c.total) / worstPlan) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-mist-500">
          Credits are solar export credits, any export bonus and any daily credit the plan earns for this usage. Usage is after any discount.
        </p>
      </Card>

      {/* Battery curve */}
      <Card
        title="How big should the battery be?"
        subtitle="Saving from each battery size on one plan. Watch for where the saving stops growing."
        action={
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Plan for battery sizing"
              className="rounded-lg border border-mist-300 bg-white px-3 py-1.5 text-sm"
              value={curvePlan.id}
              onChange={(e) => setCurvePlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {planName(p)}
                </option>
              ))}
            </select>
            <select
              aria-label="Extra solar for battery sizing"
              className="rounded-lg border border-mist-300 bg-white px-3 py-1.5 text-sm"
              value={curveSolar}
              onChange={(e) => setCurveSolar(Number(e.target.value))}
            >
              {solarSizes.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? "No extra solar" : `+ ${num(s, 1)} kW solar`}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
                <th className="pb-2 pr-3 font-semibold">Battery</th>
                <th className="pb-2 pr-3 text-right font-semibold">Bill</th>
                <th className="pb-2 pr-3 text-right font-semibold">Battery saves</th>
                <th className="pb-2 pr-3 text-right font-semibold">Saves vs today</th>
                <th className="pb-2 pr-3 text-right font-semibold">Cycles/day</th>
                <th className="pb-2 pr-3 text-right font-semibold">Payback</th>
                <th className="w-36 pb-2" />
              </tr>
            </thead>
            <tbody>
              {curveRows.map((r) => {
                const batterySaving = curveNoBattery - r.cost.total;
                const price = priceOf(r.batteryKwh, 0);
                return (
                  <tr key={r.batteryKwh} className="cursor-pointer border-t border-mist-200 hover:bg-mist-50" onClick={() => setSelected({ planId: curvePlan.id, battery: r.batteryKwh, solar: curveSolar })}>
                    <td className="py-2.5 pr-3 font-medium text-navy-900">{r.batteryKwh === 0 ? "No battery" : `${num(r.batteryKwh, 1)} kWh`}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money(r.cost.total * scale)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{r.batteryKwh === 0 ? "-" : money(batterySaving * scale)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{money((today - r.cost.total) * scale)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-mist-500">{r.batteryKwh === 0 ? "-" : num(r.cycles, 2)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {r.batteryKwh === 0 || price == null ? "-" : batterySaving > 0.005 ? `${num(price / (batterySaving * 365), 1)} yrs` : "never"}
                    </td>
                    <td className="py-2.5">
                      <div className="h-2 rounded-full bg-mist-100">
                        <div className="h-2 rounded-full bg-solar-500" style={{ width: `${Math.max(0, (batterySaving / maxCurveSaving) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Scenario grid */}
      <Card
        title="Every plan and battery size"
        subtitle={`${noun[0].toUpperCase()}${noun.slice(1)} bill, with ${curveSolar === 0 ? "no extra solar" : `${num(curveSolar, 1)} kW extra solar`}. Green is cheaper than today. Click a cell to see the typical day.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-mist-500">
                <th className="px-2 pb-1 text-left font-semibold">Plan</th>
                {batterySizes.map((b) => (
                  <th key={b} className="px-2 pb-1 text-right font-semibold">
                    {b === 0 ? "No battery" : `${num(b, 1)} kWh`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const cells = batterySizes.map((b) => get(p.id, b, curveSolar));
                const rowBest = Math.min(...cells.map((c) => c.cost.total));
                return (
                  <tr key={p.id}>
                    <td className="px-2 py-1 font-medium text-navy-900">{planName(p)}</td>
                    {cells.map((c) => {
                      const saving = today - c.cost.total;
                      const isSel = sel.planId === p.id && sel.battery === c.batteryKwh && sel.solar === c.solarKw;
                      return (
                        <td key={c.batteryKwh} className="p-0">
                          <button
                            type="button"
                            onClick={() => setSelected({ planId: p.id, battery: c.batteryKwh, solar: c.solarKw })}
                            className={clsx(
                              "w-full cursor-pointer rounded-md px-2 py-1.5 text-right tabular-nums transition-shadow hover:shadow-md",
                              saving > 0.005 ? "bg-green-100 text-green-900" : saving < -0.005 ? "bg-red-50 text-red-800" : "bg-mist-100 text-navy-800",
                              c.cost.total === rowBest && "font-bold",
                              isSel && "ring-2 ring-navy-900"
                            )}
                          >
                            {money(c.cost.total * scale)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Typical day */}
      <Card
        title="A typical day"
        subtitle={`${planName(selPlan)} - ${hardwareLabel(sel.battery, sel.solar)}`}
        action={
          <div className="text-right text-sm">
            <p className="font-semibold text-navy-900">
              {money(selDetail.cost.total * scale)} <span className="font-normal text-mist-500">{noun}</span>
            </p>
            <p className="text-mist-500">
              {selBase.total - selDetail.cost.total >= 0 ? "saves" : "costs"} {money(Math.abs(selBase.total - selDetail.cost.total) * scale)} vs same plan today
            </p>
          </div>
        }
      >
        <DayChart plan={selPlan} baseline={base} detail={selDetail} />
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Grid import" value={`${num(selDetail.cost.importKwh, 1)} kWh/day`} sub={`was ${num(selBase.importKwh, 1)}`} />
          <Stat label="Solar exported" value={`${num(selDetail.cost.exportKwh, 1)} kWh/day`} sub={`was ${num(selBase.exportKwh, 1)}`} />
          <Stat label="Daily credit earned" value={selPlan.dailyCredit ? (selDetail.cost.dailyCredit > 0 ? "Yes" : "No") : "n/a"} sub={selPlan.dailyCredit ? `${money(selDetail.cost.dailyCredit, true)}/day` : ""} />
          <Stat label="Battery cycles" value={selDetail.batteryKwh > 0 ? `${num(selDetail.cycles, 2)} /day` : "n/a"} sub="" />
        </dl>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-mist-500">{label}</dt>
      <dd className="mt-1 font-display text-base font-semibold text-navy-900">{value}</dd>
      {sub && <dd className="text-xs text-mist-500">{sub}</dd>}
    </div>
  );
}

function PickCard({
  icon,
  title,
  pick,
  scale,
  noun,
  empty,
  onSelect,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  pick: Pick | null;
  scale: number;
  noun: string;
  empty: string;
  onSelect: (s: { planId: string; battery: number; solar: number }) => void;
  highlight: boolean;
}) {
  if (!pick) {
    return (
      <div className="flex flex-col rounded-2xl border border-dashed border-mist-300 bg-mist-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-mist-500">
          {icon} {title}
        </p>
        <p className="mt-4 flex items-start gap-2 text-sm text-mist-500">
          <CircleOff className="mt-0.5 h-4 w-4 shrink-0" /> {empty}
        </p>
      </div>
    );
  }
  const payback = pick.price != null && pick.price > 0 && pick.hwSaving > 0.005 ? pick.price / (pick.hwSaving * 365) : null;
  return (
    <button
      type="button"
      onClick={() => onSelect({ planId: pick.row.planId, battery: pick.row.batteryKwh, solar: pick.row.solarKw })}
      className={clsx(
        "flex cursor-pointer flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md",
        highlight ? "border-green-500 ring-2 ring-green-500/30" : "border-mist-200"
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
        <span className="text-solar-600">{icon}</span> {title}
        {highlight && <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Best</span>}
      </p>
      <p className="mt-3 font-display text-2xl font-bold text-navy-900">
        Save {money(pick.saving * scale)}
        <span className="ml-1 text-sm font-medium text-mist-500">{noun}</span>
      </p>
      <p className="mt-1 text-sm text-navy-800">{planName(pick.plan)}</p>
      <p className="text-sm text-mist-500">{hardwareLabel(pick.row.batteryKwh, pick.row.solarKw)}</p>
      <dl className="mt-3 space-y-1 border-t border-mist-200 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-mist-500">New bill</dt>
          <dd className="font-semibold tabular-nums text-navy-900">{money(pick.row.cost.total * scale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-mist-500">Per year</dt>
          <dd className="font-semibold tabular-nums text-navy-900">{money(pick.saving * 365)} saved</dd>
        </div>
        {(pick.row.batteryKwh > 0 || pick.row.solarKw > 0) && (
          <div className="flex justify-between">
            <dt className="text-mist-500">Hardware payback</dt>
            <dd className="font-semibold tabular-nums text-navy-900">
              {payback != null ? `${num(payback, 1)} years` : pick.hwSaving <= 0.005 ? "none" : "add prices"}
            </dd>
          </div>
        )}
      </dl>
      {pick.max && pick.max.row !== pick.row && (
        <p className="mt-3 text-xs text-mist-500">
          Most possible: {money(pick.max.saving * scale)} {noun} with {hardwareLabel(pick.max.row.batteryKwh, pick.max.row.solarKw)} on {planName(pick.max.plan)}.
        </p>
      )}
    </button>
  );
}
