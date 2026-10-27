"use client";

import { ratesFor } from "@/lib/energy/engine";
import type { DayProfile, Plan, ScenarioDetail } from "@/lib/energy/types";

const W = 720;
const LEFT = 44;
const RIGHT = 8;
const COL = (W - LEFT - RIGHT) / 24;

function rateColor(rate: number, min: number, max: number) {
  if (rate <= 0.0005) return "#16a34a";
  const t = max > min ? (rate - min) / (max - min) : 0.5;
  // light amber to deep orange
  const r = Math.round(253 - t * 20);
  const g = Math.round(216 - t * 120);
  const b = Math.round(115 - t * 100);
  return `rgb(${r},${g},${b})`;
}

export default function DayChart({
  plan,
  baseline,
  detail,
}: {
  plan: Plan;
  baseline: DayProfile;
  detail: ScenarioDetail;
}) {
  const rates = ratesFor(plan).imp;
  const positive = rates.filter((r) => r > 0.0005);
  const minRate = positive.length ? Math.min(...positive) : 0;
  const maxRate = positive.length ? Math.max(...positive) : 1;

  const imp = detail.hourly.import;
  const exp = detail.hourly.export;
  const maxUp = Math.max(0.5, ...imp, ...baseline.D);
  const maxDown = Math.max(0.5, ...exp, ...baseline.X);
  const H1 = 150;
  const H2 = 70;
  const scale = H1 / maxUp > H2 / maxDown ? H2 / maxDown : H1 / maxUp;
  const zero = Math.max(H1, maxUp * scale) + 6;
  const hTop = zero + maxDown * scale + 6;

  const socMax = Math.max(0.1, ...detail.hourly.soc);
  const socH = 70;
  const socTop = hTop + 58;
  const socPath = detail.hourly.soc
    .map((s, h) => `${LEFT + h * COL + COL / 2},${socTop + socH - (s / socMax) * socH}`)
    .join(" L");

  const fmt = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const svgH = socTop + socH + 26;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full" role="img" aria-label="Typical day of grid import, export and battery charge">
        <text x={LEFT} y={12} fontSize="11" fill="#6b7386">
          Grid import (kWh per hour)
        </text>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={LEFT} x2={W - RIGHT} y1={zero - f * maxUp * scale} y2={zero - f * maxUp * scale} stroke="#e2e5eb" />
            <text x={LEFT - 6} y={zero - f * maxUp * scale + 3} fontSize="10" fill="#9aa3b2" textAnchor="end">
              {fmt(f * maxUp)}
            </text>
          </g>
        ))}
        {imp.map((v, h) => {
          const x = LEFT + h * COL;
          const b = Math.max(0, baseline.D[h] * scale);
          const a = Math.max(0, v * scale);
          const e = Math.max(0, exp[h] * scale);
          const g = Math.max(0, detail.hourly.chargeFromGrid[h] * scale);
          return (
            <g key={h}>
              <rect x={x + 2} y={zero - b} width={COL - 4} height={b} fill="#cbd0da" opacity="0.7" />
              <rect x={x + 5} y={zero - a} width={COL - 10} height={a} fill="#17305a" />
              {g > 0.5 && <rect x={x + 5} y={zero - a} width={COL - 10} height={Math.min(g, a)} fill="#16a34a" />}
              <rect x={x + 5} y={zero} width={COL - 10} height={e} fill="#fdb813" />
            </g>
          );
        })}
        <line x1={LEFT} x2={W - RIGHT} y1={zero} y2={zero} stroke="#6b7386" />
        <text x={LEFT - 6} y={zero + 14} fontSize="10" fill="#9aa3b2" textAnchor="end">
          export
        </text>

        {/* Price strip */}
        <g transform={`translate(0, ${hTop})`}>
          {rates.map((r, h) => (
            <rect key={h} x={LEFT + h * COL} y={0} width={COL} height={16} fill={rateColor(r, minRate, maxRate)}>
              <title>{`${String(h).padStart(2, "0")}:00 - ${(r * 100).toFixed(1)}c/kWh`}</title>
            </rect>
          ))}
          <text x={LEFT - 6} y={12} fontSize="10" fill="#9aa3b2" textAnchor="end">
            price
          </text>
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
            <text key={h} x={LEFT + h * COL} y={30} fontSize="10" fill="#9aa3b2" textAnchor="middle">
              {h === 24 ? "" : String(h).padStart(2, "0")}
            </text>
          ))}
        </g>

        {detail.batteryKwh > 0 && (
          <g>
            <text x={LEFT} y={socTop - 8} fontSize="11" fill="#6b7386">
              Battery charge (kWh usable)
            </text>
            <rect x={LEFT} y={socTop} width={W - LEFT - RIGHT} height={socH} fill="#f7f8fa" />
            <path d={`M${LEFT},${socTop + socH} L${socPath} L${W - RIGHT},${socTop + socH} Z`} fill="#2c5194" opacity="0.18" />
            <path d={`M${socPath}`} fill="none" stroke="#2c5194" strokeWidth="2" />
            <text x={LEFT - 6} y={socTop + 8} fontSize="10" fill="#9aa3b2" textAnchor="end">
              {fmt(socMax)}
            </text>
            <text x={LEFT - 6} y={socTop + socH} fontSize="10" fill="#9aa3b2" textAnchor="end">
              0
            </text>
          </g>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-mist-500">
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm bg-mist-300" /> Today (no changes)</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm bg-navy-700" /> With this scenario</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm" style={{ background: "#16a34a" }} /> Battery charged from grid</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-sm bg-solar-500" /> Exported to grid</span>
        <span className="flex items-center gap-1.5">Price strip: green is free, deeper orange is dearer</span>
      </div>
    </div>
  );
}
