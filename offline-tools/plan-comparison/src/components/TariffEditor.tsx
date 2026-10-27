"use client";

import { Plus, Trash2, Gift } from "lucide-react";
import clsx from "clsx";
import { effectiveBands, parseHours } from "@/lib/energy/hours";
import type { Band, Plan } from "@/lib/energy/types";
import { BAND_COLORS, Field, HourStrip, NumInput, SmallButton, inputClass, money, num } from "./ui";

export interface UsageBinding {
  days: number;
  importKwh: Record<string, number>;
  exportKwh: Record<string, number>;
  bonusExportKwh: number | null;
  onImport: (bandId: string, kwh: number) => void;
  onExport: (bandId: string, kwh: number) => void;
  onBonusExport: (kwh: number | null) => void;
}

const newId = () => `b-${Math.random().toString(36).slice(2, 8)}`;

function BandTable({
  title,
  bands,
  onBands,
  kwh,
  onKwh,
  days,
  kind,
}: {
  title: string;
  bands: Band[];
  onBands: (b: Band[]) => void;
  kwh?: Record<string, number>;
  onKwh?: (id: string, v: number) => void;
  days: number;
  kind: "import" | "export";
}) {
  const eff = effectiveBands(bands);
  const showUsage = !!kwh && !!onKwh;
  const patch = (i: number, p: Partial<Band>) => onBands(bands.map((b, k) => (k === i ? { ...b, ...p } : b)));
  const totalKwh = showUsage ? bands.reduce((s, b) => s + (kwh![b.id] ?? 0), 0) : 0;
  const totalCost = showUsage ? bands.reduce((s, b) => s + (kwh![b.id] ?? 0) * b.rate, 0) : 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-navy-900">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {kind === "import" && (
            <SmallButton
              onClick={() =>
                onBands([...bands, { id: newId(), name: "Free power", rate: 0, hours: "11-14" }])
              }
              title="Adds a $0/kWh band for 11am-2pm that overrides the bands above it"
            >
              <Gift className="h-3.5 w-3.5" /> Free 11am-2pm
            </SmallButton>
          )}
          <SmallButton
            onClick={() =>
              onBands([
                ...bands,
                { id: newId(), name: kind === "import" ? "New band" : "Feed-in band", rate: 0, hours: bands.length ? "0-24" : "all" },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add band
          </SmallButton>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-mist-500">
              <th className="pb-1 pr-2 font-semibold">Name</th>
              <th className="pb-1 pr-2 font-semibold">Hours</th>
              <th className="pb-1 pr-2 font-semibold">Rate $/kWh</th>
              {showUsage && <th className="pb-1 pr-2 font-semibold">kWh on bill</th>}
              {showUsage && <th className="pb-1 pr-2 font-semibold">{kind === "import" ? "Cost $" : "Credit $"}</th>}
              {showUsage && <th className="pb-1 pr-2 font-semibold">Per day</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {bands.map((b, i) => {
              const used = showUsage ? kwh![b.id] ?? 0 : 0;
              const hoursError = eff.errors[i];
              return (
                <tr key={b.id} className="align-top">
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: BAND_COLORS[i % BAND_COLORS.length] }}
                      />
                      <input
                        aria-label="Band name"
                        value={b.name}
                        onChange={(e) => patch(i, { name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label="Hours"
                      value={b.hours}
                      onChange={(e) => patch(i, { hours: e.target.value })}
                      placeholder="e.g. 16-23"
                      className={clsx(inputClass, hoursError && "border-red-400 focus:border-red-500 focus:ring-red-200")}
                    />
                    {hoursError && <p className="mt-0.5 text-xs text-red-600">{hoursError}</p>}
                    {!hoursError && eff.hidden.includes(i) && (
                      <p className="mt-0.5 text-xs text-amber-700">Fully overridden by a later band</p>
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    <NumInput ariaLabel="Rate per kWh" value={b.rate} onChange={(v) => patch(i, { rate: v ?? 0 })} step={0.001} />
                  </td>
                  {showUsage && (
                    <td className="py-1 pr-2">
                      <NumInput ariaLabel="kWh on bill" value={used} onChange={(v) => onKwh!(b.id, v ?? 0)} step={0.01} min={0} />
                    </td>
                  )}
                  {showUsage && (
                    <td className="py-1 pr-2">
                      <NumInput
                        ariaLabel="Cost on bill"
                        value={Math.round(used * b.rate * 100) / 100}
                        onChange={(v) => {
                          if (used > 0) patch(i, { rate: (v ?? 0) / used });
                        }}
                        step={0.01}
                      />
                    </td>
                  )}
                  {showUsage && (
                    <td className="whitespace-nowrap py-2 pr-2 text-xs text-mist-500">
                      {num(used / Math.max(1, days), 2)} kWh
                    </td>
                  )}
                  <td className="py-1">
                    <button
                      type="button"
                      aria-label={`Remove ${b.name}`}
                      disabled={bands.length <= 1}
                      onClick={() => onBands(bands.filter((_, k) => k !== i))}
                      className="cursor-pointer rounded-md p-2 text-mist-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {showUsage && (
            <tfoot>
              <tr className="text-xs font-semibold text-navy-800">
                <td className="pt-2" colSpan={3}>
                  Total
                </td>
                <td className="pt-2 pr-2">{num(totalKwh, 2)} kWh</td>
                <td className="pt-2 pr-2">{money(totalCost, true)}</td>
                <td className="pt-2 pr-2 whitespace-nowrap">
                  {num(totalKwh / Math.max(1, days), 2)} kWh
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <HourStrip eff={eff.eff} names={bands.map((b) => b.name)} />
      {eff.uncovered.length > 0 && (
        <p className="mt-1 text-xs text-amber-700">
          {eff.uncovered.length} hour(s) aren&apos;t covered by any band and are priced at the first band. Make the first band &quot;all&quot;
          to make that explicit.
        </p>
      )}
      {showUsage && totalKwh > 0 && (
        <p className="mt-1 text-xs text-mist-500">
          That&apos;s {num(totalKwh / Math.max(1, days), 1)} kWh/day, {num((totalKwh / Math.max(1, days)) * 7, 0)} kWh/week and{" "}
          {num((totalKwh / Math.max(1, days)) * (365 / 12), 0)} kWh/month.
        </p>
      )}
    </div>
  );
}

export default function TariffEditor({
  plan,
  onChange,
  usage,
  showIdentity = true,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
  usage?: UsageBinding;
  showIdentity?: boolean;
}) {
  const set = (p: Partial<Plan>) => onChange({ ...plan, ...p });
  const bonusHoursError = plan.exportBonus ? parseHours(plan.exportBonus.hours).error : undefined;
  const creditHoursError = plan.dailyCredit ? parseHours(plan.dailyCredit.hours).error : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {showIdentity && (
          <>
            <Field label="Retailer">
              <input className={inputClass} value={plan.retailer} onChange={(e) => set({ retailer: e.target.value })} />
            </Field>
            <Field label="Plan name">
              <input className={inputClass} value={plan.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
          </>
        )}
        <Field label="Daily supply charge $/day" hint="As shown on the bill, incl. GST">
          <NumInput value={plan.dailySupply} onChange={(v) => set({ dailySupply: v ?? 0 })} step={0.001} min={0} />
        </Field>
        <Field label="Guaranteed discount %" hint="Off supply + usage (optional)">
          <NumInput
            value={plan.discountPct ?? 0}
            onChange={(v) => set({ discountPct: v ?? 0 })}
            step={0.5}
            min={0}
          />
        </Field>
      </div>

      <BandTable
        title="Usage charges (what the customer pays to import)"
        kind="import"
        bands={plan.importBands}
        onBands={(importBands) => set({ importBands })}
        kwh={usage?.importKwh}
        onKwh={usage?.onImport}
        days={usage?.days ?? 1}
      />

      <BandTable
        title="Solar export credits"
        kind="export"
        bands={plan.feedInBands}
        onBands={(feedInBands) => set({ feedInBands })}
        kwh={usage?.exportKwh}
        onKwh={usage?.onExport}
        days={usage?.days ?? 1}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-mist-200 bg-mist-50 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy-900">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-solar-500"
              checked={!!plan.exportBonus}
              onChange={(e) =>
                set({ exportBonus: e.target.checked ? { rate: 0.08, hours: "18-20", capKwhPerDay: 10 } : undefined })
              }
            />
            Export bonus (e.g. GloBird Super Export)
          </label>
          {plan.exportBonus && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Field label="Extra $/kWh">
                <NumInput
                  value={plan.exportBonus.rate}
                  onChange={(v) => set({ exportBonus: { ...plan.exportBonus!, rate: v ?? 0 } })}
                  step={0.01}
                />
              </Field>
              <Field label="Hours">
                <input
                  className={clsx(inputClass, bonusHoursError && "border-red-400")}
                  value={plan.exportBonus.hours}
                  onChange={(e) => set({ exportBonus: { ...plan.exportBonus!, hours: e.target.value } })}
                />
              </Field>
              <Field label="Cap kWh/day">
                <NumInput
                  value={plan.exportBonus.capKwhPerDay}
                  onChange={(v) => set({ exportBonus: { ...plan.exportBonus!, capKwhPerDay: v ?? 0 } })}
                />
              </Field>
              {bonusHoursError && <p className="col-span-3 text-xs text-red-600">{bonusHoursError}</p>}
              {usage && (
                <Field label="kWh exported in window on this bill" className="col-span-3" hint="Optional. Tells the model how much of the export happened in these hours.">
                  <NumInput
                    allowEmpty
                    value={usage.bonusExportKwh}
                    onChange={usage.onBonusExport}
                    step={0.01}
                    min={0}
                    placeholder="Leave blank if not on the bill"
                  />
                </Field>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-mist-200 bg-mist-50 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy-900">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-solar-500"
              checked={!!plan.dailyCredit}
              onChange={(e) =>
                set({ dailyCredit: e.target.checked ? { amount: 1, hours: "18-20", maxImportKwh: 0.06 } : undefined })
              }
            />
            Daily credit for low grid use (e.g. GloBird ZeroHero)
          </label>
          {plan.dailyCredit && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Field label="Credit $/day">
                <NumInput
                  value={plan.dailyCredit.amount}
                  onChange={(v) => set({ dailyCredit: { ...plan.dailyCredit!, amount: v ?? 0 } })}
                  step={0.1}
                />
              </Field>
              <Field label="Hours">
                <input
                  className={clsx(inputClass, creditHoursError && "border-red-400")}
                  value={plan.dailyCredit.hours}
                  onChange={(e) => set({ dailyCredit: { ...plan.dailyCredit!, hours: e.target.value } })}
                />
              </Field>
              <Field label="Max import kWh">
                <NumInput
                  value={plan.dailyCredit.maxImportKwh}
                  onChange={(v) => set({ dailyCredit: { ...plan.dailyCredit!, maxImportKwh: v ?? 0 } })}
                  step={0.01}
                />
              </Field>
              {creditHoursError && <p className="col-span-3 text-xs text-red-600">{creditHoursError}</p>}
              <p className="col-span-3 text-xs text-mist-500">
                Earned on days when total grid import across those hours is at or under the limit.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
