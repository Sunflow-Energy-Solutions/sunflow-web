import { effectiveBands, parseHours } from "./hours";
import type {
  Assumptions,
  BillInput,
  CostBreakdown,
  DayProfile,
  HouseholdPattern,
  Plan,
  ScenarioDetail,
  ScenarioResult,
} from "./types";

const HOURS = 24;
const EPS = 1e-9;
/** $/kWh/hour of stored energy. Only used to break ties so stored energy is used rather than left to drift. */
const HOLDING_COST = 0.0002;

/* ------------------------------------------------------------------ */
/* Typical hourly shapes                                               */
/* ------------------------------------------------------------------ */

const TYPICAL_LOAD = [
  0.02, 0.018, 0.017, 0.017, 0.018, 0.024, 0.04, 0.055, 0.05, 0.04, 0.035, 0.035,
  0.036, 0.035, 0.034, 0.038, 0.05, 0.075, 0.085, 0.08, 0.065, 0.05, 0.035, 0.025,
];

function normalise(a: number[]) {
  const sum = a.reduce((s, v) => s + v, 0);
  return sum > 0 ? a.map((v) => v / sum) : a;
}

export function loadShape(pattern: HouseholdPattern): number[] {
  const factor = pattern === "evening" ? 0.6 : pattern === "homeDay" ? 1.5 : 1;
  return normalise(TYPICAL_LOAD.map((w, h) => (h >= 9 && h < 16 ? w * factor : w)));
}

/** Average-day solar output shape (Melbourne, annual average): daylight 6am-7pm, peaking around 12:30. */
export const SOLAR_SHAPE = normalise(
  Array.from({ length: HOURS }, (_, h) => {
    const x = (h + 0.5 - 6) / 13;
    return x > 0 && x < 1 ? Math.pow(Math.sin(Math.PI * x), 1.2) : 0;
  })
);

/* ------------------------------------------------------------------ */
/* Tariff helpers                                                      */
/* ------------------------------------------------------------------ */

export interface HourlyRates {
  imp: number[];
  feed: number[];
  bonusRate: number[];
  /** kWh per hour that qualify for the export bonus */
  bonusCap: number[];
  creditMask: boolean[];
  /** Max grid import per credit-window hour that still qualifies */
  creditPerHour: number;
}

export function ratesFor(plan: Plan): HourlyRates {
  const imp = effectiveBands(plan.importBands).eff.map((k) => plan.importBands[k]?.rate ?? 0);
  const feed = effectiveBands(plan.feedInBands).eff.map((k) => plan.feedInBands[k]?.rate ?? 0);

  const bonusRate = new Array<number>(HOURS).fill(0);
  const bonusCap = new Array<number>(HOURS).fill(0);
  if (plan.exportBonus) {
    const { mask } = parseHours(plan.exportBonus.hours);
    const n = mask.filter(Boolean).length;
    mask.forEach((on, h) => {
      if (!on) return;
      bonusRate[h] = plan.exportBonus!.rate;
      bonusCap[h] = n > 0 ? plan.exportBonus!.capKwhPerDay / n : 0;
    });
  }

  let creditMask = new Array<boolean>(HOURS).fill(false);
  let creditPerHour = Infinity;
  if (plan.dailyCredit) {
    creditMask = parseHours(plan.dailyCredit.hours).mask;
    const n = creditMask.filter(Boolean).length;
    creditPerHour = n > 0 ? plan.dailyCredit.maxImportKwh / n : Infinity;
  }
  return { imp, feed, bonusRate, bonusCap, creditMask, creditPerHour };
}

/** Value of exporting `kwh` in hour h (feed-in tariff plus capped bonus). */
function exportValue(r: HourlyRates, h: number, kwh: number) {
  if (kwh <= 0) return 0;
  const bonusKwh = Math.min(kwh, r.bonusCap[h]);
  return kwh * r.feed[h] + bonusKwh * r.bonusRate[h];
}

/** Prices an average day of grid flows on a plan. All figures are $/day. */
export function costDay(plan: Plan, imp: number[], exp: number[]): CostBreakdown {
  const r = ratesFor(plan);
  let usage = 0;
  let exportCredit = 0;
  let bonus = 0;
  let windowImport = 0;
  let importKwh = 0;
  let exportKwh = 0;
  for (let h = 0; h < HOURS; h++) {
    usage += imp[h] * r.imp[h];
    exportCredit += exp[h] * r.feed[h];
    bonus += Math.min(exp[h], r.bonusCap[h]) * r.bonusRate[h];
    if (r.creditMask[h]) windowImport += imp[h];
    importKwh += imp[h];
    exportKwh += exp[h];
  }
  const discount = ((plan.discountPct ?? 0) / 100) * (plan.dailySupply + usage);
  const qualifies = !!plan.dailyCredit && windowImport <= plan.dailyCredit.maxImportKwh + 1e-6;
  const dailyCredit = qualifies ? plan.dailyCredit!.amount : 0;
  const total = plan.dailySupply + usage - discount - exportCredit - bonus - dailyCredit;
  return {
    supply: plan.dailySupply,
    usage,
    discount,
    exportCredit,
    bonus,
    dailyCredit,
    total,
    importKwh,
    exportKwh,
  };
}

/* ------------------------------------------------------------------ */
/* Turning a bill into an average day                                  */
/* ------------------------------------------------------------------ */

export interface BaseProfile {
  profile: DayProfile;
  /** Estimated solar generation, kWh/day */
  generationPerDay: number;
  generationEstimated: boolean;
  warnings: string[];
}

/**
 * Spreads each band's billed kWh across the hours that band is charged for, weighted by `raw`
 * (the shape we expect), so band totals always match the bill exactly.
 */
function allocate(
  raw: number[],
  eff: number[],
  bandTotals: number[],
  fallback: number[],
  labels: string[],
  warnings: string[]
) {
  const out = new Array<number>(HOURS).fill(0);
  bandTotals.forEach((total, k) => {
    if (total <= 0) return;
    const hrs = eff.map((e, h) => (e === k ? h : -1)).filter((h) => h >= 0);
    if (hrs.length === 0) {
      warnings.push(`"${labels[k]}" is fully overridden by another band, so its ${total.toFixed(1)} kWh/day was dropped.`);
      return;
    }
    const rawSum = hrs.reduce((s, h) => s + raw[h], 0);
    if (rawSum > EPS) {
      hrs.forEach((h) => (out[h] += (raw[h] / rawSum) * total));
      return;
    }
    const fbSum = hrs.reduce((s, h) => s + fallback[h], 0);
    hrs.forEach((h) => (out[h] += fbSum > EPS ? (fallback[h] / fbSum) * total : total / hrs.length));
  });
  return out;
}

export function buildBaseProfile(bill: BillInput, assumptions: Assumptions): BaseProfile {
  const warnings: string[] = [];
  const days = Math.max(1, bill.days);
  const plan = bill.plan;

  const impBands = plan.importBands.map((b) => (bill.importKwh[b.id] ?? 0) / days);
  const expBands = plan.feedInBands.map((b) => (bill.exportKwh[b.id] ?? 0) / days);
  const dTot = impBands.reduce((s, v) => s + v, 0);
  const xTot = expBands.reduce((s, v) => s + v, 0);

  let gen = 0;
  let estimated = false;
  if (bill.generationKwh != null && bill.generationKwh > 0) gen = bill.generationKwh / days;
  else if (bill.existingSolarKw > 0) {
    gen = bill.existingSolarKw * assumptions.solarYield;
    estimated = true;
  } else if (xTot > 0) {
    gen = xTot / 0.6;
    estimated = true;
  }
  if (gen < xTot) gen = xTot;

  // Reconstruct the home's own consumption, then see where it is short of / above the sun.
  const loadTotal = dTot + gen - xTot;
  const shape = loadShape(bill.pattern);
  const deficit = new Array<number>(HOURS).fill(0);
  const surplus = new Array<number>(HOURS).fill(0);
  for (let h = 0; h < HOURS; h++) {
    const load = loadTotal * shape[h];
    const sun = gen * SOLAR_SHAPE[h];
    const direct = Math.min(load, sun);
    deficit[h] = load - direct;
    surplus[h] = sun - direct;
  }

  const imp = effectiveBands(plan.importBands);
  const feed = effectiveBands(plan.feedInBands);
  const D = allocate(deficit, imp.eff, impBands, shape, plan.importBands.map((b) => b.name), warnings);
  const X = allocate(surplus, feed.eff, expBands, SOLAR_SHAPE, plan.feedInBands.map((b) => b.name), warnings);

  // The bill can tell us how much was exported inside the bonus window (e.g. a battery exporting
  // 6-8pm). Pull that much export into the window from elsewhere in the same feed-in band.
  if (plan.exportBonus && bill.bonusExportKwh != null) {
    const { mask } = parseHours(plan.exportBonus.hours);
    const target = bill.bonusExportKwh / days;
    const inWindow = (h: number) => mask[h];
    const have = X.reduce((s, v, h) => s + (inWindow(h) ? v : 0), 0);
    const windowHours = mask.map((on, h) => (on ? h : -1)).filter((h) => h >= 0);
    if (windowHours.length > 0 && Math.abs(target - have) > EPS) {
      const bandsInWindow = Array.from(new Set(windowHours.map((h) => feed.eff[h])));
      for (const k of bandsInWindow) {
        const inBand = windowHours.filter((h) => feed.eff[h] === k);
        const outside = feed.eff.map((e, h) => (e === k && !inWindow(h) ? h : -1)).filter((h) => h >= 0);
        const bandHave = inBand.reduce((s, h) => s + X[h], 0);
        const bandTarget = (target / windowHours.length) * inBand.length;
        const outsideSum = outside.reduce((s, h) => s + X[h], 0);
        const move = Math.max(-bandHave, Math.min(bandTarget - bandHave, outsideSum));
        if (Math.abs(move) < EPS) continue;
        const inSum = inBand.reduce((s, h) => s + X[h], 0);
        inBand.forEach((h) => (X[h] += move * (inSum > EPS ? X[h] / inSum : 1 / inBand.length)));
        outside.forEach((h) => (X[h] -= outsideSum > EPS ? move * (X[h] / outsideSum) : 0));
      }
    }
  }

  // What-if: extra EV charging comes out of any export first, then the grid.
  if (bill.ev.kwhPerDay > 0) {
    const { mask, error } = parseHours(bill.ev.hours);
    const n = mask.filter(Boolean).length;
    if (!error && n > 0) {
      const per = bill.ev.kwhPerDay / n;
      for (let h = 0; h < HOURS; h++) {
        if (!mask[h]) continue;
        const fromSun = Math.min(per, X[h]);
        X[h] -= fromSun;
        D[h] += per - fromSun;
      }
    }
  }

  return { profile: { D, X }, generationPerDay: gen, generationEstimated: estimated, warnings };
}

/* ------------------------------------------------------------------ */
/* Hardware: extra solar and battery                                   */
/* ------------------------------------------------------------------ */

export function addSolar(p: DayProfile, kw: number, yieldPerKw: number): { profile: DayProfile; added: number[] } {
  const added = SOLAR_SHAPE.map((w) => w * kw * yieldPerKw);
  if (kw <= 0) return { profile: p, added };
  const D = p.D.slice();
  const X = p.X.slice();
  for (let h = 0; h < HOURS; h++) {
    const offset = Math.min(D[h], added[h]);
    D[h] -= offset;
    X[h] += added[h] - offset;
  }
  return { profile: { D, X }, added };
}

interface BatterySpec {
  usable: number;
  power: number;
  eta: number;
}

export function batterySpec(kwh: number, a: Assumptions): BatterySpec {
  return {
    usable: kwh * (1 - a.reserve),
    power: Math.max(a.minPowerKw, kwh * a.powerPerKwh),
    eta: Math.sqrt(Math.min(1, Math.max(0.01, a.roundTrip))),
  };
}

interface Flow {
  imp: number[];
  exp: number[];
  soc: number[];
  gridCharge: number[];
  discharged: number;
}

/** Charge from solar surplus, discharge to cover any import. No price awareness. */
function simulateSelfConsumption(p: DayProfile, spec: BatterySpec): Flow {
  let e = 0;
  let out: Flow | null = null;
  for (let day = 0; day < 3; day++) {
    const flow: Flow = { imp: [], exp: [], soc: [], gridCharge: new Array(HOURS).fill(0), discharged: 0 };
    for (let h = 0; h < HOURS; h++) {
      const room = (spec.usable - e) / spec.eta;
      const charge = Math.min(p.X[h], spec.power, Math.max(0, room));
      e += charge * spec.eta;
      const q = Math.min(p.D[h], spec.power, e * spec.eta);
      e -= q / spec.eta;
      flow.imp.push(p.D[h] - q);
      flow.exp.push(p.X[h] - charge);
      flow.soc.push(e);
      flow.discharged += q;
    }
    out = flow;
  }
  return out!;
}

/**
 * Price-aware dispatch by dynamic programming. The policy is taken from the second day of a 4-day look-ahead (so
 * it isn't distorted by the horizon's end) and replayed until the battery settles into a daily cycle.
 * State is battery energy on a grid of N steps; the value of landing between steps is interpolated, and every hour
 * also tries the exact breakpoints (soak up all surplus, cover all demand, fill, empty) so results don't depend on
 * how coarse the grid is. `chase` forces grid imports in the plan's credit window under the threshold so the daily
 * credit is earned.
 */
function optimiseDispatch(
  plan: Plan,
  p: DayProfile,
  spec: BatterySpec,
  gridCharge: boolean,
  chase: boolean
): Flow | null {
  if (spec.usable < 1e-6) return null;
  const r = ratesFor(plan);
  const N = 48;
  const U = spec.usable;
  const step = U / N;
  const eta = spec.eta;
  const T = HOURS * 4;
  const maxCharge = spec.power * eta; // stored kWh per hour
  const maxDischarge = spec.power / eta; // stored kWh per hour
  const V: Float64Array[] = Array.from({ length: T + 1 }, () => new Float64Array(N + 1));

  const interp = (arr: Float64Array, e: number) => {
    const x = e / step;
    if (x >= N) return arr[N];
    const i0 = Math.floor(x);
    const fr = x - i0;
    const a = arr[i0];
    if (fr < 1e-9) return a;
    const b = arr[i0 + 1];
    return Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * fr : Infinity;
  };

  const flow = { imp: 0, exp: 0 };
  // Cost of one hour for a net stored-energy change delta, or Infinity if the move isn't allowed.
  // An hour can both soak up surplus and cover demand (an average day blends sunny and cloudy days), so each
  // delta is tried as a single move and as "absorb all surplus, discharge the rest"; the cheaper one wins.
  const hourCost = (h: number, delta: number, impCap: number, e: number) => {
    const D = p.D[h];
    const X = p.X[h];
    let best = Infinity;
    const consider = (imp: number, exp: number) => {
      if (imp > impCap + 1e-7) return;
      const c = imp * r.imp[h] - exportValue(r, h, exp);
      if (c < best) {
        best = c;
        flow.imp = imp;
        flow.exp = exp;
      }
    };
    if (delta >= 0) {
      const draw = delta / eta;
      const fromSun = Math.min(draw, X);
      const fromGrid = draw - fromSun;
      if (gridCharge || fromGrid <= 1e-7) consider(D + fromGrid, X - fromSun);
    } else {
      const give = -delta * eta;
      if (give <= D + 1e-7) consider(D - give, X);
    }
    const absorb = Math.min(X, spec.power);
    if (absorb > 1e-9 && delta < absorb * eta - 1e-9) {
      const give = (absorb * eta - delta) * eta;
      const fitsEnergy = e + absorb * eta <= U + 1e-7 || e - give / eta >= -1e-7;
      if (fitsEnergy && give <= Math.min(D, spec.power) + 1e-7) consider(D - give, X - absorb);
    }
    return best;
  };

  const bestMove = (t: number, e: number) => {
    const h = t % HOURS;
    const D = p.D[h];
    const X = p.X[h];
    const impCap = chase && r.creditMask[h] ? r.creditPerHour : Infinity;
    const lo = Math.max(-e, -maxDischarge);
    const hi = Math.min(U - e, maxCharge);
    const next = V[t + 1];
    let bestCost = Infinity;
    let bestDelta = 0;
    const tryDelta = (raw: number) => {
      const d = Math.min(hi, Math.max(lo, raw));
      const c = hourCost(h, d, impCap, e);
      if (c === Infinity) return;
      const total = c + HOLDING_COST * (e + d) + interp(next, e + d);
      if (total < bestCost) {
        bestCost = total;
        bestDelta = d;
      }
    };
    tryDelta(0);
    tryDelta(Math.min(X, spec.power) * eta);
    tryDelta(maxCharge);
    tryDelta(U - e);
    tryDelta(-Math.min(D, spec.power) / eta);
    tryDelta(Math.min(X, spec.power) * eta - Math.min(D, spec.power) / eta);
    tryDelta(-maxDischarge);
    tryDelta(-e);
    if (Number.isFinite(impCap)) tryDelta(-Math.max(0, D - impCap) / eta);
    const j0 = Math.ceil((e + lo) / step - 1e-9);
    const j1 = Math.floor((e + hi) / step + 1e-9);
    for (let j = j0; j <= j1; j++) tryDelta(j * step - e);
    return { cost: bestCost, delta: bestDelta };
  };

  for (let t = T - 1; t >= 0; t--) {
    for (let i = 0; i <= N; i++) V[t][i] = bestMove(t, i * step).cost;
  }

  const out: Flow = { imp: [], exp: [], soc: [], gridCharge: new Array(HOURS).fill(0), discharged: 0 };
  let e = 0;
  const DAYS = 4;
  for (let day = 0; day < DAYS; day++) {
    for (let h = 0; h < HOURS; h++) {
      const { cost, delta } = bestMove(HOURS + h, e);
      if (!Number.isFinite(cost)) return null;
      if (day === DAYS - 1) {
        hourCost(h, delta, Infinity, e);
        out.imp.push(flow.imp);
        out.exp.push(flow.exp);
        if (delta >= 0) out.gridCharge[h] = Math.max(0, delta / eta - p.X[h]);
        else out.discharged += -delta * eta;
      }
      e = Math.min(U, Math.max(0, e + delta));
      if (day === DAYS - 1) out.soc.push(e);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Scenario evaluation                                                 */
/* ------------------------------------------------------------------ */

function evaluateFlow(
  plan: Plan,
  base: DayProfile,
  batteryKwh: number,
  solarKw: number,
  a: Assumptions
): { flow: Flow; added: number[] } {
  const { profile, added } = addSolar(base, solarKw, a.solarYield);
  if (batteryKwh <= 0) {
    return {
      flow: { imp: profile.D, exp: profile.X, soc: new Array(HOURS).fill(0), gridCharge: new Array(HOURS).fill(0), discharged: 0 },
      added,
    };
  }
  const spec = batterySpec(batteryKwh, a);
  if (a.strategy === "selfConsumption") return { flow: simulateSelfConsumption(profile, spec), added };

  let best: Flow | null = null;
  let bestCost = Infinity;
  const modes = plan.dailyCredit ? [false, true] : [false];
  for (const chase of modes) {
    const flow = optimiseDispatch(plan, profile, spec, a.gridCharge, chase);
    if (!flow) continue;
    const c = costDay(plan, flow.imp, flow.exp).total;
    if (c < bestCost) {
      bestCost = c;
      best = flow;
    }
  }
  return { flow: best ?? simulateSelfConsumption(profile, spec), added };
}

export function evaluate(
  plan: Plan,
  base: DayProfile,
  batteryKwh: number,
  solarKw: number,
  a: Assumptions
): ScenarioResult {
  const { flow } = evaluateFlow(plan, base, batteryKwh, solarKw, a);
  return {
    planId: plan.id,
    batteryKwh,
    solarKw,
    cost: costDay(plan, flow.imp, flow.exp),
    cycles: batteryKwh > 0 ? flow.discharged / batteryKwh : 0,
  };
}

export function evaluateDetail(
  plan: Plan,
  base: DayProfile,
  batteryKwh: number,
  solarKw: number,
  a: Assumptions
): ScenarioDetail {
  const { flow, added } = evaluateFlow(plan, base, batteryKwh, solarKw, a);
  return {
    planId: plan.id,
    batteryKwh,
    solarKw,
    cost: costDay(plan, flow.imp, flow.exp),
    cycles: batteryKwh > 0 ? flow.discharged / batteryKwh : 0,
    hourly: {
      import: flow.imp,
      export: flow.exp,
      soc: flow.soc,
      chargeFromGrid: flow.gridCharge,
      solarAdded: added,
    },
  };
}

/** Every plan x battery size x extra solar size, for the results tables. */
export function runCube(
  plans: Plan[],
  base: DayProfile,
  batterySizes: number[],
  solarSizes: number[],
  a: Assumptions
): ScenarioResult[] {
  const out: ScenarioResult[] = [];
  for (const plan of plans) {
    for (const solar of solarSizes) {
      for (const battery of batterySizes) {
        out.push(evaluate(plan, base, battery, solar, a));
      }
    }
  }
  return out;
}

/** Reconciles the model against the bill total the user typed in. */
export function modelBillTotal(bill: BillInput, base: DayProfile) {
  return costDay(bill.plan, base.D, base.X).total * Math.max(1, bill.days);
}

export const PERIOD_DAYS = { day: 1, week: 7, month: 365 / 12, year: 365 } as const;
export type Period = keyof typeof PERIOD_DAYS;
