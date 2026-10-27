import type { Assumptions, BillInput, Plan } from "./types";

/**
 * Plans below were read off real customer bills, so the rates are real but dated.
 * Retailer rates change - always confirm current prices on Victorian Energy Compare before quoting.
 */
export const SEED_PLANS: Plan[] = [
  {
    id: "globird-zerohero",
    retailer: "GloBird Energy",
    name: "ZEROHERO",
    notes:
      "Rates from an invoice issued 19 Oct 2026 (AusNet, VIC). Free power 11am-2pm; $1/day ZeroHero credit needs grid import in 6-8pm to stay at or under 0.03 kWh/hour; Super Export top-up on exports 6-8pm. Confirm current rates and credit conditions.",
    dailySupply: 1.485,
    importBands: [
      { id: "peak", name: "Peak", rate: 0.506, hours: "16-23" },
      { id: "offpeak", name: "Free / off-peak", rate: 0, hours: "11-14" },
      { id: "shoulder", name: "Shoulder", rate: 0.319, hours: "14-16, 23-11" },
    ],
    feedInBands: [
      { id: "fit-eve", name: "Feed-in 4pm-9pm", rate: 0.02, hours: "16-21" },
      { id: "fit-other", name: "Feed-in other times", rate: 0, hours: "21-16" },
    ],
    exportBonus: { rate: 0.08, hours: "18-20", capKwhPerDay: 10 },
    dailyCredit: { amount: 1, hours: "18-20", maxImportKwh: 0.06 },
  },
  {
    id: "powershop-power-house",
    retailer: "Powershop",
    name: "Power House",
    notes: "Rates from an invoice issued 24 Sep 2026 (AusNet, VIC). Single rate. Feed-in was not shown on the bill - enter it if the customer has solar.",
    dailySupply: 1.098,
    importBands: [{ id: "all", name: "All day usage", rate: 0.2798, hours: "all" }],
    feedInBands: [{ id: "fit", name: "Solar feed-in", rate: 0, hours: "all" }],
  },
  {
    id: "origin-go-variable",
    retailer: "Origin Energy",
    name: "Origin Go Variable",
    notes: "Rates from an invoice issued 28 Apr 2026 (CitiPower, VIC). Single rate. Confirm current rates.",
    dailySupply: 1.122578,
    importBands: [{ id: "all", name: "General usage", rate: 0.24725, hours: "all" }],
    feedInBands: [{ id: "fit", name: "Solar feed-in", rate: 0.01, hours: "all" }],
  },
];

const clonePlan = (p: Plan): Plan => JSON.parse(JSON.stringify(p));

export const DEFAULT_EV = { kwhPerDay: 0, hours: "11-14" };

export const SAMPLE_BILLS: { id: string; label: string; bill: BillInput }[] = [
  {
    id: "origin",
    label: "Origin Go Variable - 90 days, solar, 36 kWh/day",
    bill: {
      customer: "Sample: Origin customer",
      days: 90,
      plan: { ...clonePlan(SEED_PLANS[2]), id: "current" },
      importKwh: { all: 3202.2 },
      exportKwh: { fit: 587.401 },
      existingSolarKw: 0,
      generationKwh: null,
      bonusExportKwh: null,
      billTotal: 886.9,
      pattern: "typical",
      ev: { ...DEFAULT_EV },
    },
  },
  {
    id: "powershop",
    label: "Powershop Power House - 31 days, no solar, 22 kWh/day",
    bill: {
      customer: "Sample: Powershop customer",
      days: 31,
      plan: { ...clonePlan(SEED_PLANS[1]), id: "current" },
      importKwh: { all: 681 },
      exportKwh: { fit: 0 },
      existingSolarKw: 0,
      generationKwh: null,
      bonusExportKwh: null,
      billTotal: 224.58,
      pattern: "typical",
      ev: { ...DEFAULT_EV },
    },
  },
  {
    id: "globird",
    label: "GloBird ZEROHERO - 28 days (already charging in the free window)",
    bill: {
      customer: "Sample: GloBird customer",
      days: 28,
      plan: { ...clonePlan(SEED_PLANS[0]), id: "current" },
      importKwh: { peak: 0.7, offpeak: 817.89, shoulder: 9.03 },
      exportKwh: { "fit-eve": 143.18, "fit-other": 21.79 },
      existingSolarKw: 0,
      generationKwh: null,
      bonusExportKwh: 136.05,
      billTotal: 3.07,
      pattern: "typical",
      ev: { ...DEFAULT_EV },
    },
  },
];

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  solarYield: 3.8,
  roundTrip: 0.9,
  reserve: 0.1,
  powerPerKwh: 0.4,
  minPowerKw: 3,
  strategy: "optimised",
  gridCharge: true,
};

export const DEFAULT_BATTERY_SIZES = [0, 5, 10, 13.5, 20, 30];
export const DEFAULT_SOLAR_SIZES = [0, 3, 6.6, 10];

export function newBlankPlan(kind: "single" | "tou" | "free"): Plan {
  const id = `plan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const base = { id, retailer: "Retailer", dailySupply: 1.0 };
  const fit = [{ id: `${id}-fit`, name: "Solar feed-in", rate: 0.04, hours: "all" }];
  if (kind === "single") {
    return {
      ...base,
      name: "Single rate plan",
      importBands: [{ id: `${id}-a`, name: "Usage", rate: 0.3, hours: "all" }],
      feedInBands: fit,
    };
  }
  if (kind === "tou") {
    return {
      ...base,
      name: "Time of use plan",
      importBands: [
        { id: `${id}-a`, name: "Shoulder", rate: 0.28, hours: "all" },
        { id: `${id}-b`, name: "Peak", rate: 0.42, hours: "15-21" },
        { id: `${id}-c`, name: "Off-peak", rate: 0.18, hours: "1-6" },
      ],
      feedInBands: fit,
    };
  }
  return {
    ...base,
    name: "Free-window plan",
    importBands: [
      { id: `${id}-a`, name: "Shoulder", rate: 0.3, hours: "all" },
      { id: `${id}-b`, name: "Peak", rate: 0.45, hours: "16-23" },
      { id: `${id}-c`, name: "Free power", rate: 0, hours: "11-14" },
    ],
    feedInBands: fit,
  };
}
