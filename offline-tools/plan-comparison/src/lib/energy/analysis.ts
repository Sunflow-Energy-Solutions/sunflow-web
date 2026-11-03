import type { CostBreakdown, Plan, ScenarioResult, SystemPackage } from "./types";

export interface PackageOutcome {
  pkg: SystemPackage;
  /** Plan that gives the lowest bill with this system */
  planId: string;
  cost: CostBreakdown;
  cycles: number;
  /** $/day on the customer's current plan, no changes */
  todayDay: number;
  /** $/day with the system on its best plan */
  newDay: number;
  /** $/day saved versus today (system + any plan change) */
  savingDay: number;
  /** $/day saved versus the best no-hardware option (current plan or a cheaper plan) - the system's own contribution */
  hwSavingDay: number;
  /** Years for the hardware's own saving to repay what the customer pays, null if it never does */
  paybackYears: number | null;
  /** 10 years of hardware saving minus what the customer pays (simple, no price or tariff changes) */
  tenYearNet: number;
}

export const resultKey = (planId: string, battery: number, solar: number) => `${planId}|${battery}|${solar}`;

/** Scores every package against every plan and keeps each package's best plan. */
export function scorePackages(
  packages: SystemPackage[],
  plans: Plan[],
  lookup: (planId: string, battery: number, solar: number) => ScenarioResult | undefined
): { outcomes: PackageOutcome[]; todayDay: number; bestNoHardware: { plan: Plan; day: number } } {
  const noHw = plans.map((p) => ({ plan: p, day: lookup(p.id, 0, 0)!.cost.total }));
  const todayDay = noHw[0].day;
  const bestNoHardware = noHw.reduce((a, b) => (b.day < a.day ? b : a));

  const outcomes: PackageOutcome[] = [];
  for (const pkg of packages) {
    let best: { plan: Plan; r: ScenarioResult } | null = null;
    for (const plan of plans) {
      const r = lookup(plan.id, pkg.batteryKwh, pkg.solarKw);
      if (r && (!best || r.cost.total < best.r.cost.total)) best = { plan, r };
    }
    if (!best) continue;
    const newDay = best.r.cost.total;
    const hwSavingDay = bestNoHardware.day - newDay;
    const annual = hwSavingDay * 365;
    outcomes.push({
      pkg,
      planId: best.plan.id,
      cost: best.r.cost,
      cycles: best.r.cycles,
      todayDay,
      newDay,
      savingDay: todayDay - newDay,
      hwSavingDay,
      paybackYears: annual > 0.5 ? pkg.youPay / annual : null,
      tenYearNet: annual * 10 - pkg.youPay,
    });
  }
  return { outcomes, todayDay, bestNoHardware };
}

export type PickReason = "Fastest payback" | "Best 10-year return" | "Biggest bill reduction";

export interface Pick {
  outcome: PackageOutcome;
  reasons: PickReason[];
}

/** Up to three distinct standout options for a set of outcomes. */
export function pickStandouts(outcomes: PackageOutcome[]): Pick[] {
  const useful = outcomes.filter((o) => o.paybackYears != null && o.hwSavingDay > 0);
  if (useful.length === 0) return [];
  const best = (score: (o: PackageOutcome) => number) => useful.reduce((a, b) => (score(b) > score(a) ? b : a));
  const candidates: [PickReason, PackageOutcome][] = [
    ["Fastest payback", best((o) => -o.paybackYears!)],
    ["Best 10-year return", best((o) => o.tenYearNet)],
    ["Biggest bill reduction", best((o) => o.savingDay)],
  ];
  const picks: Pick[] = [];
  for (const [reason, outcome] of candidates) {
    const existing = picks.find((p) => p.outcome.pkg.id === outcome.pkg.id);
    if (existing) existing.reasons.push(reason);
    else picks.push({ outcome, reasons: [reason] });
  }
  return picks;
}

import type { SystemFilters } from "./types";

export function filterPackages(packages: SystemPackage[], f: SystemFilters): SystemPackage[] {
  return packages.filter(
    (p) =>
      (f.brands.length === 0 || f.brands.includes(p.brand)) &&
      (f.phase === "Any" || p.phase === "" || p.phase === f.phase) &&
      (p.kind === "battery" ? f.includeBattery : f.includeSolarBattery)
  );
}
