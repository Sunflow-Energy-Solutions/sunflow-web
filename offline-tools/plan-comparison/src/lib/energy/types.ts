/**
 * Shared types for the plan comparison tool.
 * All prices are GST-inclusive $/kWh or $/day, matching what appears on Australian bills.
 */

export interface Band {
  id: string;
  name: string;
  /** $/kWh */
  rate: number;
  /** Hours the band applies to, e.g. "16-23" or "14-16, 23-11". Later bands override earlier ones. */
  hours: string;
}

export interface Plan {
  id: string;
  retailer: string;
  name: string;
  notes?: string;
  /** $/day */
  dailySupply: number;
  importBands: Band[];
  feedInBands: Band[];
  /** Extra c/kWh on exports in a window, up to a daily cap (e.g. GloBird Super Export). */
  exportBonus?: { rate: number; hours: string; capKwhPerDay: number };
  /** Flat $/day credit when grid imports in a window stay under a threshold (e.g. GloBird ZeroHero). */
  dailyCredit?: { amount: number; hours: string; maxImportKwh: number };
  /** Percentage off supply + usage charges (pay-on-time / guaranteed discounts). */
  discountPct?: number;
}

export type HouseholdPattern = "typical" | "evening" | "homeDay";

export interface BillInput {
  customer: string;
  /** Days covered by the bill */
  days: number;
  /** The tariff on the customer's current bill (band ids key the kWh maps below) */
  plan: Plan;
  /** kWh imported over the bill period, by import band id */
  importKwh: Record<string, number>;
  /** kWh exported over the bill period, by feed-in band id */
  exportKwh: Record<string, number>;
  existingSolarKw: number;
  /** Total solar generation over the bill period, if the customer knows it */
  generationKwh: number | null;
  /** kWh the bill shows exported inside the plan's export-bonus window (optional) */
  bonusExportKwh: number | null;
  /** Bill total (incl. GST) for a reconciliation check */
  billTotal: number | null;
  pattern: HouseholdPattern;
  /** Extra EV charging to add on top of the bill's usage (what-if) */
  ev: { kwhPerDay: number; hours: string };
}

export interface Assumptions {
  /** kWh generated per kW of panels per day (annual average) */
  solarYield: number;
  /** Battery round-trip efficiency, 0-1 */
  roundTrip: number;
  /** Share of battery capacity held back as backup reserve, 0-1 */
  reserve: number;
  /** Battery power in kW per kWh of capacity */
  powerPerKwh: number;
  minPowerKw: number;
  strategy: "optimised" | "selfConsumption";
  /** Optimised strategy may charge the battery from the grid (e.g. the free 11am-2pm window) */
  gridCharge: boolean;
}

export interface SizeOption {
  size: number;
  /** Net installed price after rebates, $ (null = not entered) */
  price: number | null;
}

/** Average-day grid flows in kWh per hour: D = drawn from grid, X = exported to grid. */
export interface DayProfile {
  D: number[];
  X: number[];
}

export interface CostBreakdown {
  supply: number;
  usage: number;
  discount: number;
  exportCredit: number;
  bonus: number;
  dailyCredit: number;
  /** Net $/day; negative means the retailer pays the customer */
  total: number;
  importKwh: number;
  exportKwh: number;
}

export interface ScenarioResult {
  planId: string;
  batteryKwh: number;
  solarKw: number;
  cost: CostBreakdown;
  /** Full battery cycles per day */
  cycles: number;
}

export interface ScenarioDetail extends ScenarioResult {
  hourly: {
    import: number[];
    export: number[];
    soc: number[];
    chargeFromGrid: number[];
    solarAdded: number[];
  };
}

/** A priced system from the Sunflow package price list (customer-facing figures only). */
export interface SystemPackage {
  id: string;
  brand: string;
  kind: "solar+battery" | "battery";
  name: string;
  /** New panels in the package, kW (0 for battery-only) */
  solarKw: number;
  batteryKwh: number;
  inverter: string;
  phase: "Single" | "Three" | "";
  battery: string;
  panels: string;
  /** Total price inc GST before rebates, $ */
  price: number;
  /** Government STC rebate, $ */
  rebate: number;
  /** What the customer pays inc GST after the rebate, $ */
  youPay: number;
}

export interface SystemFilters {
  /** Brands to include; empty means all */
  brands: string[];
  phase: "Single" | "Three" | "Any";
  includeBattery: boolean;
  includeSolarBattery: boolean;
}
