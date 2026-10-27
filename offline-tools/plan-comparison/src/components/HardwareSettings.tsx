"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Assumptions, SizeOption } from "@/lib/energy/types";
import { DEFAULT_ASSUMPTIONS } from "@/lib/energy/samples";
import { Card, Field, NumInput, SmallButton, inputClass } from "./ui";

function SizeTable({
  title,
  unit,
  options,
  onChange,
  help,
}: {
  title: string;
  unit: string;
  options: SizeOption[];
  onChange: (o: SizeOption[]) => void;
  help: string;
}) {
  const patch = (i: number, p: Partial<SizeOption>) => onChange(options.map((o, k) => (k === i ? { ...o, ...p } : o)));
  return (
    <Card
      title={title}
      subtitle={help}
      action={
        <SmallButton onClick={() => onChange([...options, { size: 0, price: null }])}>
          <Plus className="h-3.5 w-3.5" /> Add size
        </SmallButton>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
            <th className="pb-1 pr-3 font-semibold">Size ({unit})</th>
            <th className="pb-1 pr-3 font-semibold">Net installed price $</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {options.map((o, i) => (
            <tr key={i}>
              <td className="py-1 pr-3">
                <NumInput ariaLabel={`Size in ${unit}`} value={o.size} onChange={(v) => patch(i, { size: Math.max(0, v ?? 0) })} min={0} step={0.1} />
              </td>
              <td className="py-1 pr-3">
                <NumInput
                  allowEmpty
                  ariaLabel="Net installed price"
                  value={o.price}
                  onChange={(v) => patch(i, { price: v })}
                  placeholder={o.size === 0 ? "-" : "Optional"}
                  min={0}
                />
              </td>
              <td className="py-1">
                <button
                  type="button"
                  aria-label="Remove size"
                  disabled={options.length <= 1}
                  onClick={() => onChange(options.filter((_, k) => k !== i))}
                  className="cursor-pointer rounded-md p-2 text-mist-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-mist-500">
        Enter prices after any rebates (e.g. STCs, Cheaper Home Batteries) to get a payback period. Leave blank to see savings only.
        Keep a 0 row so there&apos;s a &quot;no {unit === "kWh" ? "battery" : "extra solar"}&quot; comparison.
      </p>
    </Card>
  );
}

export default function HardwareSettings({
  batteries,
  onBatteries,
  solars,
  onSolars,
  assumptions,
  onAssumptions,
}: {
  batteries: SizeOption[];
  onBatteries: (o: SizeOption[]) => void;
  solars: SizeOption[];
  onSolars: (o: SizeOption[]) => void;
  assumptions: Assumptions;
  onAssumptions: (a: Assumptions) => void;
}) {
  const set = (p: Partial<Assumptions>) => onAssumptions({ ...assumptions, ...p });
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <SizeTable
          title="Battery sizes to test"
          unit="kWh"
          options={batteries}
          onChange={onBatteries}
          help="Usable capacity. Every size is tested on every plan."
        />
        <SizeTable
          title="Extra solar to test"
          unit="kW"
          options={solars}
          onChange={onSolars}
          help="Panels added on top of whatever the customer already has."
        />
      </div>

      <Card title="Battery & solar assumptions" subtitle="Defaults suit a typical Melbourne home. Change them to match the product you're quoting.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Round-trip efficiency %">
            <NumInput value={Math.round(assumptions.roundTrip * 1000) / 10} onChange={(v) => set({ roundTrip: Math.min(100, Math.max(50, v ?? 90)) / 100 })} step={0.5} />
          </Field>
          <Field label="Backup reserve %" hint="Held back, never used for bill savings">
            <NumInput value={Math.round(assumptions.reserve * 1000) / 10} onChange={(v) => set({ reserve: Math.min(50, Math.max(0, v ?? 0)) / 100 })} step={1} />
          </Field>
          <Field label="Power kW per kWh" hint="0.4 = a 13.5 kWh battery delivers 5.4 kW">
            <NumInput value={assumptions.powerPerKwh} onChange={(v) => set({ powerPerKwh: Math.max(0.1, v ?? 0.4) })} step={0.05} />
          </Field>
          <Field label="Minimum power kW">
            <NumInput value={assumptions.minPowerKw} onChange={(v) => set({ minPowerKw: Math.max(0.5, v ?? 3) })} step={0.5} />
          </Field>
          <Field label="Solar yield kWh per kW per day" hint="Melbourne annual average is about 3.8">
            <NumInput value={assumptions.solarYield} onChange={(v) => set({ solarYield: Math.max(0.5, v ?? 3.8) })} step={0.1} />
          </Field>
          <Field label="Battery strategy" className="col-span-2">
            <select
              className={inputClass}
              value={assumptions.strategy}
              onChange={(e) => set({ strategy: e.target.value as Assumptions["strategy"] })}
            >
              <option value="optimised">Optimised - schedule around the cheapest and dearest hours</option>
              <option value="selfConsumption">Self-consumption - charge from solar, discharge straight away</option>
            </select>
          </Field>
          <label className="col-span-2 flex cursor-pointer items-center gap-2 self-end rounded-lg border border-mist-200 px-3 py-2 text-sm text-navy-800 lg:col-span-4">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-solar-500"
              checked={assumptions.gridCharge}
              disabled={assumptions.strategy !== "optimised"}
              onChange={(e) => set({ gridCharge: e.target.checked })}
            />
            Allow the battery to charge from the grid (e.g. during a free 11am-2pm window or a cheap off-peak band)
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <SmallButton onClick={() => onAssumptions({ ...DEFAULT_ASSUMPTIONS })}>Reset to defaults</SmallButton>
        </div>
      </Card>

      <Card title="How the numbers are produced">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-navy-800">
          <li>
            The bill is turned into one average day: how many kWh come from the grid and go to the grid in each hour. Bands on the bill
            are matched exactly, so the average day re-prices to the same total as the real bill.
          </li>
          <li>
            That day is re-priced on every plan, with and without a battery and extra solar. Monthly figures are the average day
            multiplied out (365 ÷ 12 days), so they don&apos;t show seasonal swings in sun or usage.
          </li>
          <li>
            The battery assumes it&apos;s set up to follow the plan (the optimised strategy) and never exports to the grid. Existing
            batteries in the bill aren&apos;t recognised - enter a bill from before the battery if there was one.
          </li>
          <li>
            Averages smooth out cloudy and sunny days, so treat results as a well-grounded estimate to guide a recommendation, not a
            guarantee.
          </li>
        </ul>
      </Card>
    </div>
  );
}
