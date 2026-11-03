import { useMemo, useState } from "react";
import { filterPackages } from "@/lib/energy/analysis";
import { DEFAULT_ASSUMPTIONS } from "@/lib/energy/samples";
import { PACKAGES, PRICE_LIST_DATE } from "@/lib/energy/catalogue.generated";
import type { Assumptions, SystemFilters } from "@/lib/energy/types";
import { Card, Field, NumInput, SmallButton, inputClass, money, num } from "./ui";

const BRANDS = Array.from(new Set(PACKAGES.map((p) => p.brand))).sort();

export default function HardwareSettings({
  filters,
  onFilters,
  assumptions,
  onAssumptions,
}: {
  filters: SystemFilters;
  onFilters: (f: SystemFilters) => void;
  assumptions: Assumptions;
  onAssumptions: (a: Assumptions) => void;
}) {
  const set = (p: Partial<Assumptions>) => onAssumptions({ ...assumptions, ...p });
  const setF = (p: Partial<SystemFilters>) => onFilters({ ...filters, ...p });
  const [showList, setShowList] = useState(false);
  const shown = useMemo(() => filterPackages(PACKAGES, filters), [filters]);
  const allBrands = filters.brands.length === 0;

  return (
    <div className="space-y-6">
      <Card
        title="Which systems to price"
        subtitle={`Preset Sunflow packages from the ${new Date(PRICE_LIST_DATE).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} price list. Prices are what the customer pays after the government rebate.`}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-500">Brands</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setF({ brands: [] })}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium ${allBrands ? "border-navy-900 bg-navy-900 text-white" : "border-mist-300 bg-white text-navy-800 hover:bg-mist-50"}`}
              >
                All brands
              </button>
              {BRANDS.map((b) => {
                const on = filters.brands.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setF({ brands: on ? filters.brands.filter((x) => x !== b) : [...filters.brands, b] })}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium ${on ? "border-navy-900 bg-navy-900 text-white" : "border-mist-300 bg-white text-navy-800 hover:bg-mist-50"}`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Electrical phase" hint="Check the switchboard or meter">
              <select className={inputClass} value={filters.phase} onChange={(e) => setF({ phase: e.target.value as SystemFilters["phase"] })}>
                <option value="Single">Single phase (most homes)</option>
                <option value="Three">Three phase</option>
                <option value="Any">Show both</option>
              </select>
            </Field>
            <div className="space-y-2 self-end text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-navy-800">
                <input type="checkbox" className="h-4 w-4 cursor-pointer accent-solar-500" checked={filters.includeBattery} onChange={(e) => setF({ includeBattery: e.target.checked })} />
                Battery only
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-navy-800">
                <input type="checkbox" className="h-4 w-4 cursor-pointer accent-solar-500" checked={filters.includeSolarBattery} onChange={(e) => setF({ includeSolarBattery: e.target.checked })} />
                Solar + battery
              </label>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-navy-800">
          <strong>{shown.length}</strong> systems selected out of {PACKAGES.length}.{" "}
          <button type="button" className="cursor-pointer font-semibold underline" onClick={() => setShowList(!showList)}>
            {showList ? "Hide price list" : "View price list"}
          </button>
        </p>
        <p className="mt-1 text-xs text-mist-500">
          Solar+battery packages include new panels. If the customer already has enough solar, untick &quot;Solar + battery&quot;. To change prices,
          update the Sunflow_Package_Pricing workbooks and run <code>npm run import-prices</code> then <code>npm run build</code> (see the README).
        </p>

        {showList && (
          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-mist-200">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-mist-100 text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Package</th>
                  <th className="px-3 py-2 font-semibold">Brand</th>
                  <th className="px-3 py-2 text-right font-semibold">Price</th>
                  <th className="px-3 py-2 text-right font-semibold">Rebate</th>
                  <th className="px-3 py-2 text-right font-semibold">You pay</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className="border-t border-mist-200">
                    <td className="px-3 py-1.5">
                      {p.solarKw > 0 ? `${num(p.solarKw, 2)} kW solar + ` : ""}
                      {num(p.batteryKwh, 1)} kWh battery
                      {p.phase ? <span className="text-mist-500"> · {p.phase}</span> : null}
                    </td>
                    <td className="px-3 py-1.5">{p.brand}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{money(p.price)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">-{money(p.rebate)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{money(p.youPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Battery & solar assumptions" subtitle="Defaults suit a typical Melbourne home. Change them to match the product you're quoting.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Round-trip efficiency %">
            <NumInput value={Math.round(assumptions.roundTrip * 1000) / 10} onChange={(v) => set({ roundTrip: Math.min(100, Math.max(50, v ?? 90)) / 100 })} step={0.5} />
          </Field>
          <Field label="Backup reserve %" hint="Held back, never used for bill savings">
            <NumInput value={Math.round(assumptions.reserve * 1000) / 10} onChange={(v) => set({ reserve: Math.min(50, Math.max(0, v ?? 0)) / 100 })} step={1} />
          </Field>
          <Field label="Battery power (kW per kWh)" hint="How fast it charges/discharges: 0.4 means a 13.5 kWh battery delivers 5.4 kW">
            <NumInput value={assumptions.powerPerKwh} onChange={(v) => set({ powerPerKwh: Math.max(0.1, v ?? 0.4) })} step={0.05} />
          </Field>
          <Field label="Minimum power kW">
            <NumInput value={assumptions.minPowerKw} onChange={(v) => set({ minPowerKw: Math.max(0.5, v ?? 3) })} step={0.5} />
          </Field>
          <Field label="Solar yield kWh per kW per day" hint="Melbourne annual average is about 3.8">
            <NumInput value={assumptions.solarYield} onChange={(v) => set({ solarYield: Math.max(0.5, v ?? 3.8) })} step={0.1} />
          </Field>
          <Field label="Battery strategy" className="col-span-2">
            <select className={inputClass} value={assumptions.strategy} onChange={(e) => set({ strategy: e.target.value as Assumptions["strategy"] })}>
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
          <li>The bill is turned into one average day of grid use and solar export. Bands on the bill are matched exactly, so the average day re-prices to the same total as the real bill.</li>
          <li>That day is re-priced on every plan, with and without each system. Monthly figures are the average day multiplied out, so they don&apos;t show seasonal swings.</li>
          <li>The battery is assumed to be set up to follow the plan (the optimised strategy) and never exports to the grid. A bill from a home that already has a battery isn&apos;t recognised - use one from before it was installed.</li>
          <li>Payback = what the customer pays after rebates &divide; what the system itself saves each year (versus the best they could do without it). 10-year net is 10 years of that saving minus the price, with no allowance for tariff changes or battery ageing.</li>
          <li>Averages smooth out cloudy and sunny days, so treat results as a well-grounded estimate to guide a recommendation, not a guarantee.</li>
        </ul>
      </Card>
    </div>
  );
}
