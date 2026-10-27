import type { Band } from "./types";

const ALL_WORDS = new Set(["all", "anytime", "any time", "24h", "24 hours", "all day", "*"]);

function parseTime(raw: string): number | null {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min !== 0) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3] === "pm" ? 12 : 0);
  }
  if (h < 0 || h > 24) return null;
  return h;
}

export interface ParsedHours {
  mask: boolean[];
  error?: string;
}

/**
 * Parses an hours description into a 24-slot mask.
 * Accepts "16-23", "14-16, 23-11" (wraps past midnight), "11am-2pm", "16:00-23:00", or "all".
 * The start hour is inclusive and the end hour exclusive.
 */
export function parseHours(input: string): ParsedHours {
  const mask = new Array<boolean>(24).fill(false);
  const text = input.trim().toLowerCase();
  if (!text) return { mask, error: "Enter the hours this applies to" };
  if (ALL_WORDS.has(text)) return { mask: mask.fill(true) };

  for (const token of text.split(/[,;&]|\band\b/)) {
    const t = token.trim();
    if (!t) continue;
    if (ALL_WORDS.has(t)) {
      mask.fill(true);
      continue;
    }
    const parts = t.split(/\s*(?:-|–|—|\bto\b)\s*/);
    if (parts.length !== 2) return { mask, error: `Can't read "${t}" - use a range like 16-23` };
    const start = parseTime(parts[0]);
    let end = parseTime(parts[1]);
    if (start === null || end === null) {
      return { mask, error: `Can't read "${t}" - use whole hours like 16-23 or 11am-2pm` };
    }
    if (start === 24) return { mask, error: `"${t}" starts at 24 - use 0 for midnight` };
    if (end === 0 && start > 0) end = 24;
    if (end === start) return { mask, error: `"${t}" has the same start and end - use 0-24 for all day` };
    if (end > start) {
      for (let h = start; h < end; h++) mask[h] = true;
    } else {
      for (let h = start; h < 24; h++) mask[h] = true;
      for (let h = 0; h < end; h++) mask[h] = true;
    }
  }
  return { mask };
}

export function hoursCount(mask: boolean[]) {
  return mask.reduce((n, on) => n + (on ? 1 : 0), 0);
}

export interface EffectiveBands {
  /** For each hour, the index of the band that prices it (later bands override earlier ones) */
  eff: number[];
  /** Hours no band covers (they fall back to the first band) */
  uncovered: number[];
  /** Bands that are completely overridden by later bands */
  hidden: number[];
  errors: (string | undefined)[];
}

export function effectiveBands(bands: Band[]): EffectiveBands {
  const parsed = bands.map((b) => parseHours(b.hours));
  const eff = new Array<number>(24).fill(-1);
  parsed.forEach((p, k) => {
    if (p.error) return;
    p.mask.forEach((on, h) => {
      if (on) eff[h] = k;
    });
  });
  const uncovered: number[] = [];
  for (let h = 0; h < 24; h++) {
    if (eff[h] === -1) {
      uncovered.push(h);
      eff[h] = 0;
    }
  }
  const hidden = bands
    .map((_, k) => k)
    .filter((k) => !parsed[k].error && !eff.includes(k));
  return { eff, uncovered, hidden, errors: parsed.map((p) => p.error) };
}

export function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}
