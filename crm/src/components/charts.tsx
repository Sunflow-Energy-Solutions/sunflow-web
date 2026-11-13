import clsx from "clsx";
import { Table2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Small chart kit for the Reports screen (no chart library). Follows the data-viz rules: thin bars (<= 24px) with a rounded data end
 * on a square baseline, a 2px gap between neighbours, hairline grid, text in text colours (never the series colour), a legend whenever
 * there are two series, a hover / keyboard tooltip on every mark, and a table view for every chart.
 * Palette (validated): navy #2c5194 + solar orange #f7931e. Orange is under 3:1 on white, so values are always written as text.
 */
export const SERIES = { navy: "#2c5194", orange: "#f7931e" } as const;

const INK = "#0a1730", SECOND = "#6b7386", MUTED = "#9aa3b2", GRID = "#e2e5eb", BASE = "#cbd0da";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.getBoundingClientRect().width)));
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** A card with a title and a Chart / Table switch. The table is the accessible twin of the chart. */
export function ChartCard({ title, subtitle, chart, table }: { title: string; subtitle?: string; chart: ReactNode; table: ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="rounded-2xl border border-mist-200 bg-white p-4 shadow-[0_1px_2px_rgba(10,23,48,0.04)]">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-mist-500">{subtitle}</p>}
        </div>
        <button
          onClick={() => setAsTable(!asTable)}
          aria-pressed={asTable}
          className={clsx("inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold", asTable ? "bg-navy-900 text-white" : "text-mist-500 hover:bg-mist-100")}
        >
          <Table2 className="size-3.5" /> Table
        </button>
      </header>
      {asTable ? <div className="overflow-x-auto">{table}</div> : chart}
    </section>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-mist-200 text-left text-[11px] uppercase tracking-wide text-mist-500">
          {head.map((h, i) => <th key={h} className={clsx("py-1.5 font-bold", i > 0 && "text-right")}>{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-mist-100">
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className={clsx("py-1.5 tabular-nums", j > 0 && "text-right")}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------ column chart */

export type Column = { label: string; short: string; values: number[] };

/** Whole-number axis steps (1, 2, 5, 10, 20, 50...) with the top tick at or above the highest value. */
const niceScale = (v: number) => {
  const raw = Math.max(v, 1) / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
  const top = step * Math.ceil(Math.max(v, 1) / step);
  return { step, top };
};

/** Top corners rounded (4px), bottom square: the bar grows from the baseline. */
const barPath = (x: number, y: number, w: number, h: number, r = 4) => {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

export function ColumnChart({ data, series, fmt, axisFmt, height = 190, ariaLabel }: {
  data: Column[]; series: { name: string; color: string }[]; fmt: (n: number) => string; axisFmt?: (n: number) => string; height?: number; ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);
  const axis = axisFmt ?? fmt;
  const padL = 40, padR = 6, padT = 16, padB = 24;
  const innerW = Math.max(0, width - padL - padR), innerH = height - padT - padB;
  const { step, top: max } = niceScale(Math.max(0, ...data.flatMap((d) => d.values)));
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.max(3, Math.min(24, (band - 6) / series.length - 2));
  const groupW = barW * series.length + 2 * (series.length - 1);
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const labelEvery = band < 30 ? Math.ceil(30 / band) : 1;

  // direct label: the single highest value of the first series
  const peak = data.reduce((best, d, i) => (d.values[0] > (data[best]?.values[0] ?? -1) ? i : best), 0);

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mist-500" aria-label="Legend">
          {series.map((s) => <li key={s.name} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</li>)}
        </ul>
      )}
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block touch-pan-y">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : GRID} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill={MUTED}>{axis(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + band * i + band / 2;
            const gx = cx - groupW / 2;
            return (
              <g key={d.label} opacity={hover && hover.i !== i ? 0.55 : 1}>
                {d.values.map((v, s) => {
                  const h = (v / max) * innerH;
                  return h > 0 ? <path key={s} d={barPath(gx + s * (barW + 2), y(v), barW, h)} fill={series[s].color} /> : null;
                })}
                {i % labelEvery === 0 && <text x={cx} y={height - 7} textAnchor="middle" fontSize={10.5} fill={SECOND}>{d.short}</text>}
                {i === peak && d.values[0] > 0 && <text x={cx} y={y(d.values[0]) - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>{fmt(d.values[0])}</text>}
                {/* a hit area wider than the bars, so nobody has to land on 4px of colour */}
                <rect
                  x={padL + band * i} y={padT} width={band} height={innerH + padB} fill="transparent" tabIndex={0}
                  role="img" aria-label={`${d.label}: ${series.map((s, k) => `${s.name} ${fmt(d.values[k])}`).join(", ")}`}
                  onPointerMove={() => setHover({ i, x: cx })} onFocus={() => setHover({ i, x: cx })} onBlur={() => setHover(null)}
                  style={{ outline: "none" }}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover && data[hover.i] && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 rounded-lg border border-mist-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(hover.x - 56, 0), Math.max(0, width - 124)), top: series.length > 1 ? 30 : 4 }}
        >
          <div className="mb-1 font-semibold text-navy-900">{data[hover.i].label}</div>
          {series.map((s, k) => (
            <div key={s.name} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-mist-500"><span className="h-0.5 w-3 rounded" style={{ background: s.color }} />{s.name}</span>
              <span className="font-bold text-navy-900">{fmt(data[hover.i].values[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- ranked bars */

export type BarRow = { label: string; value: number; display: string; sub?: string; href?: string };

/** Ranked horizontal bars: one colour, value written at the bar's end (never inside), bars on one baseline. */
export function BarList({ rows, color = SERIES.navy, empty = "Nothing yet" }: { rows: BarRow[]; color?: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-mist-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-navy-900">{r.label}</span>
              <span className="shrink-0 font-bold tabular-nums text-navy-900">{r.display}</span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-mist-100" role="presentation">
              <div className="h-full rounded-full" style={{ width: `${Math.max(r.value > 0 ? 2 : 0, (r.value / max) * 100)}%`, background: color }} />
            </div>
            {r.sub && <div className="mt-0.5 text-[11px] text-mist-500">{r.sub}</div>}
          </>
        );
        return (
          <li key={r.label} title={`${r.label}: ${r.display}${r.sub ? ` (${r.sub})` : ""}`}>
            {r.href ? <a href={r.href} className="block rounded-lg hover:bg-mist-50">{inner}</a> : inner}
          </li>
        );
      })}
    </ul>
  );
}
