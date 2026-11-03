import type { Band, BillInput, Plan } from "./energy/types";

/**
 * Reads an electricity bill from its text lines (one string per printed line) and pulls out the figures the
 * comparison needs. It works from the itemised charge lines, so it copes with different retailers' layouts,
 * but anything it had to guess is listed in `warnings` so a person confirms it before relying on it.
 */

export interface ParsedItem {
  label: string;
  kwh: number;
  /** $/kWh, always positive (credits are identified by `kind`) */
  rate: number;
  hours?: string;
  hoursAssumed?: boolean;
}

export interface ParsedBill {
  retailer: string;
  planName: string;
  days: number | null;
  dailySupply: number | null;
  imports: ParsedItem[];
  exports: ParsedItem[];
  bonus?: { label: string; kwh: number; rate: number; hours?: string };
  credit?: { label: string; amount: number; hours?: string };
  billTotal: number | null;
  warnings: string[];
}

const RETAILERS: [RegExp, string][] = [
  [/globird/i, "GloBird Energy"],
  [/powershop/i, "Powershop"],
  [/origin\s+energy|originenergy|origin\.com\.au/i, "Origin Energy"],
  [/\bagl\b/i, "AGL"],
  [/energyaustralia|energy\s+australia/i, "EnergyAustralia"],
  [/red\s+energy/i, "Red Energy"],
  [/alinta/i, "Alinta Energy"],
  [/simply\s+energy/i, "Simply Energy"],
  [/momentum/i, "Momentum Energy"],
  [/lumo/i, "Lumo Energy"],
  [/amber/i, "Amber"],
  [/\bdodo\b/i, "Dodo"],
  [/1st\s+energy/i, "1st Energy"],
  [/sumo/i, "Sumo"],
  [/\bovo\b/i, "OVO Energy"],
  [/tango/i, "Tango Energy"],
  [/diamond\s+energy/i, "Diamond Energy"],
  [/people\s*energy/i, "PEA"],
];

const money = String.raw`-?\$?\s*-?\d[\d,]*\.\d+|-?\$?\s*-?\.\d+`;

function num(s: string) {
  return Number(s.replace(/[,$\s]/g, ""));
}

/** "$-0.0100", "-$0.08", "$0.2798/kWh", "28.5c" -> signed $/kWh (or null) */
function readRate(token: string): number | null {
  const t = token.trim();
  const cents = t.match(/^(-?\d+(?:\.\d+)?)\s*(?:c|¢)\b/i);
  if (cents) return Number(cents[1]) / 100;
  const negative = t.includes("-");
  const m = t.match(/\d[\d,]*\.\d+|\.\d+/);
  if (!m) return null;
  const v = num(m[0]);
  return negative ? -v : v;
}

function hoursFromRanges(text: string): string | undefined {
  const parts: string[] = [];
  for (const m of text.matchAll(/(\d{1,2})(?::00)?\s*(am|pm)?\s*-\s*(\d{1,2})(?::00)?\s*(am|pm)?/gi)) {
    const to24 = (h: string, ap?: string) => {
      let n = Number(h);
      if (ap) n = (n % 12) + (ap.toLowerCase() === "pm" ? 12 : 0);
      return n;
    };
    const a = to24(m[1], m[2]);
    const b = to24(m[3], m[4]);
    if (a >= 0 && a <= 24 && b >= 0 && b <= 24 && a !== b) parts.push(`${a}-${b}`);
  }
  return parts.length ? parts.join(", ") : undefined;
}

/** GloBird-style "Plan Features" text: "Peak Usage: 16:00 - 23:00(Everyday) | Offpeak Usage: 11:00 - 14:00(Everyday) | ..." */
function readPlanFeatures(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const start = lines.findIndex((l) => /Plan Features/i.test(l));
  if (start < 0) return map;
  let text = "";
  for (let i = start + 1; i < Math.min(lines.length, start + 12); i++) {
    if (/^(Understand your bill|Supply Address|NMI|Billing Period)/i.test(lines[i])) break;
    text += " " + lines[i];
  }
  for (const chunk of text.split("|")) {
    const m = chunk.match(/^\s*([^:]+?)\s*:\s*(\d{1,2}:\d{2}\s*-[\s\S]*)$/);
    if (!m) continue;
    const hours = hoursFromRanges(m[2]);
    if (hours) map.set(m[1].trim().toLowerCase(), hours);
  }
  return map;
}

function lookupHours(features: Map<string, string>, label: string) {
  const key = label.trim().toLowerCase().replace(/\s*-\s*step\s*\d+$/i, "");
  return features.get(key) ?? [...features.entries()].find(([k]) => key.startsWith(k) || k.startsWith(key) || k.endsWith(key))?.[1];
}

export function parseBillLines(rawLines: string[]): ParsedBill {
  const warnings: string[] = [];
  const all = rawLines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fullText = all.join("\n");

  // Restrict to the electricity part of a combined electricity + gas bill.
  let lines = all;
  const eStart = all.findIndex((l) => /ELECTRICITY ACCOUNT/i.test(l));
  if (eStart >= 0) {
    const gas = all.findIndex((l, i) => i > eStart && /GAS ACCOUNT/i.test(l));
    lines = all.slice(eStart, gas > eStart ? gas : undefined);
  }

  const retailer = RETAILERS.find(([re]) => re.test(fullText))?.[1] ?? "Unknown retailer";
  if (retailer === "Unknown retailer") warnings.push("Couldn't tell which retailer this bill is from.");

  // Plan name
  let planName = "";
  const pf = lines.find((l) => /Plan Features\s*-/i.test(l));
  if (pf) planName = pf.replace(/.*Plan Features\s*-\s*/i, "").trim();
  if (!planName) {
    const i = all.findIndex((l) => /^(Plan Summary|Your plan)$/i.test(l) || /Your current residential plan/i.test(l));
    if (i >= 0) {
      for (let k = i + 1; k <= i + 4 && k < all.length; k++) {
        const c = all[k];
        if (c.length <= 40 && !/billing period|ending|this bill|based on|^\d|\d{1,2}[/ -][A-Za-z0-9]{2,3}[/ -]\d{2}/i.test(c)) {
          planName = c;
          break;
        }
      }
    }
  }
  if (!planName) {
    const m = fullText.match(/(?:plan|offer)\s*(?:name)?\s*[:-]\s*([A-Za-z0-9 +&'-]{3,40})/i);
    if (m) planName = m[1].trim();
  }
  planName = planName.replace(/\s*\(.*$/, "").trim();
  if (!planName) {
    planName = "Current plan";
    warnings.push("Couldn't find the plan name - enter it yourself.");
  }

  // Days on the bill
  let days: number | null = null;
  const dm = lines.join("\n").match(/\((\d{1,3})\s*days?\)/i) ?? fullText.match(/\((\d{1,3})\s*days?\)/i);
  if (dm) days = Number(dm[1]);

  // Daily supply charge
  let dailySupply: number | null = null;
  for (const l of lines) {
    if (/gas|\bMJ\b/i.test(l)) continue;
    if (!/(daily|supply)/i.test(l)) continue;
    const m = l.match(/(\d+(?:\.\d+)?)\s*days?\b(?:\s*x)?\s*(-?\$?\s*\d*\.?\d+\s*(?:c|¢)?)/i);
    if (!m) continue;
    const rate = readRate(m[2]);
    if (rate != null && rate > 0) {
      dailySupply = /c|¢/i.test(m[2]) && rate < 1 ? rate : rate;
      if (days == null) days = Number(m[1]);
      break;
    }
  }
  if (dailySupply == null) warnings.push("Couldn't find the daily supply charge - enter it yourself.");
  if (days == null) warnings.push("Couldn't find how many days the bill covers - enter it yourself.");

  const features = readPlanFeatures(lines);

  // Itemised kWh charges / credits
  const imports: ParsedItem[] = [];
  const exports: ParsedItem[] = [];
  let bonus: ParsedBill["bonus"];
  const seen = new Set<string>();
  lines.forEach((l, idx) => {
    if (/\bMJ\b/i.test(l) || /kWh\s*\/\s*\$|:\s*[\d.]+\s*kWh/i.test(l)) return;
    const q = l.match(/(\d[\d,]*(?:\.\d+)?)\s*kWh\b(.*)$/i);
    if (!q || !q[2].includes("$")) return;
    const kwh = num(q[1]);
    if (!(kwh > 0)) return;
    const tokens = [...q[2].matchAll(new RegExp(money + String.raw`|-?\d+(?:\.\d+)?\s*(?:c|¢)\b`, "gi"))].map((m) => m[0]);
    if (tokens.length === 0) return;
    const rate = readRate(tokens[0]);
    if (rate == null) return;

    // Label: text before the quantity, minus the date range; fall back to the line above.
    let label = l
      .slice(0, l.toLowerCase().indexOf(q[1].toLowerCase()))
      .replace(/\d{1,2}[-/ ][A-Za-z0-9]{2,3}(?:[-/ ]\d{2,4})?\s*-\s*\d{1,2}[-/ ][A-Za-z0-9]{2,3}(?:[-/ ]\d{2,4})?/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!/[A-Za-z]{3}/.test(label)) label = (lines[idx - 1] ?? "").trim();
    label = label.replace(/\s*[-:]\s*$/, "");

    const key = `${label}|${kwh}`;
    if (seen.has(key)) return;
    seen.add(key);

    const lower = label.toLowerCase();
    const hours = lookupHours(features, label);
    const isBonus = /top[\s-]?up|bonus|super export/i.test(label);
    const isExport = /feed|export|generation|\bfit\b|solar/i.test(label) || rate < 0;
    if (isBonus) {
      bonus = { label, kwh, rate: Math.abs(rate), hours };
    } else if (isExport && !/usage|general|peak|shoulder|supply/i.test(lower.replace(/solar.*usage/, ""))) {
      exports.push({ label, kwh, rate: Math.abs(rate), hours });
    } else if (rate >= 0) {
      imports.push({ label, kwh, rate, hours });
    }
  });

  // Daily credit such as ZeroHero ("28.00 Day x -$1.00000")
  let credit: ParsedBill["credit"];
  for (const l of lines) {
    const m = l.match(/^(.*?)\s+(?:\d[\w -]*?\s+)?(\d+(?:\.\d+)?)\s*days?\s*x\s*(-\s*\$?\s*\d+(?:\.\d+)?)/i);
    if (m && /zerohero|credit|reward|bonus/i.test(m[1]) && !/supply|daily charge/i.test(m[1])) {
      credit = { label: m[1].trim(), amount: Math.abs(num(m[3])), hours: lookupHours(features, m[1].trim()) };
      break;
    }
  }

  // Bill total, preferring the most specific wording
  let billTotal: number | null = null;
  for (const re of [/total tax invoice/i, /your total for this bill/i, /^TOTAL/, /total (?:amount )?due/i]) {
    const l = lines.find((x) => re.test(x) && /\$\s*-?[\d,]+\.\d{2}\s*$/.test(x));
    if (l) {
      billTotal = num(l.match(/\$\s*(-?[\d,]+\.\d{2})\s*$/)![1]);
      break;
    }
  }

  if (imports.length === 0) warnings.push("Couldn't find any usage charges (kWh x rate). Is this an electricity bill with an itemised breakdown?");

  // Hours: use what the bill states; otherwise assume from the band names and flag it.
  const assumeHours = (items: ParsedItem[], kind: "import" | "export") => {
    if (items.length <= 1) {
      items.forEach((i) => (i.hours = i.hours ?? "all"));
      return;
    }
    const missing = items.filter((i) => !i.hours);
    if (missing.length === 0) return;
    if (kind === "export") {
      // Can't tell when the feed-in rates apply: merge into one band at the weighted rate.
      const kwh = items.reduce((s, i) => s + i.kwh, 0);
      const rate = items.reduce((s, i) => s + i.kwh * i.rate, 0) / Math.max(kwh, 1e-9);
      items.splice(0, items.length, { label: "Solar feed-in (combined)", kwh, rate, hours: "all", hoursAssumed: true });
      warnings.push("The bill shows several feed-in rates without hours, so they were combined into one average rate.");
      return;
    }
    warnings.push("The bill doesn't say when each usage rate applies, so typical hours were assumed (peak 3-9pm, off-peak 10pm-7am). Check them against the customer's plan.");
    for (const i of items) {
      if (i.hours) continue;
      const lower = i.label.toLowerCase();
      i.hoursAssumed = true;
      if (/off[\s-]?peak|night|controlled/.test(lower)) i.hours = "22-7";
      else if (/peak/.test(lower) && !/shoulder/.test(lower)) i.hours = "15-21";
      else i.hours = "0-24";
    }
    // The all-hours band must be first so the others override it.
    items.sort((a, b) => (a.hours === "0-24" ? -1 : 0) - (b.hours === "0-24" ? -1 : 0));
  };
  assumeHours(imports, "import");
  assumeHours(exports, "export");

  if (bonus && !bonus.hours) bonus.hours = "18-20";
  if (credit && !credit.hours) credit.hours = "18-20";

  return { retailer, planName, days, dailySupply, imports, exports, bonus, credit, billTotal, warnings };
}

/** Turns a parsed bill into the tool's BillInput. */
export function parsedToBill(p: ParsedBill, previous: BillInput): BillInput {
  const id = () => `b-${Math.random().toString(36).slice(2, 8)}`;
  const importBands: Band[] = p.imports.map((i) => ({ id: id(), name: i.label, rate: i.rate, hours: i.hours ?? "all" }));
  let feedInBands: Band[] = p.exports.map((i) => ({ id: id(), name: i.label, rate: i.rate, hours: i.hours ?? "all" }));
  if (feedInBands.length === 0) feedInBands = [{ id: id(), name: "Solar feed-in", rate: 0, hours: "all" }];
  if (importBands.length === 0) importBands.push({ id: id(), name: "Usage", rate: 0, hours: "all" });

  const plan: Plan = {
    id: "current",
    retailer: p.retailer,
    name: p.planName,
    dailySupply: p.dailySupply ?? 0,
    importBands,
    feedInBands,
    ...(p.bonus ? { exportBonus: { rate: p.bonus.rate, hours: p.bonus.hours ?? "18-20", capKwhPerDay: 10 } } : {}),
    ...(p.credit ? { dailyCredit: { amount: p.credit.amount, hours: p.credit.hours ?? "18-20", maxImportKwh: 0.06 } } : {}),
  };
  const importKwh: Record<string, number> = {};
  const exportKwh: Record<string, number> = {};
  p.imports.forEach((i, k) => (importKwh[importBands[k].id] = i.kwh));
  p.exports.forEach((i, k) => (exportKwh[feedInBands[k].id] = i.kwh));

  return {
    ...previous,
    days: p.days ?? previous.days,
    plan,
    importKwh,
    exportKwh,
    bonusExportKwh: p.bonus ? p.bonus.kwh : null,
    billTotal: p.billTotal,
    generationKwh: null,
  };
}
