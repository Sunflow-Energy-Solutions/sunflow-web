"use client";

import { AlertTriangle, CheckCircle2, FilePlus2 } from "lucide-react";
import { buildBaseProfile, modelBillTotal } from "@/lib/energy/engine";
import { DEFAULT_EV, SAMPLE_BILLS, newBlankPlan } from "@/lib/energy/samples";
import type { Assumptions, BillInput, HouseholdPattern } from "@/lib/energy/types";
import TariffEditor from "./TariffEditor";
import { Card, Field, NumInput, SmallButton, inputClass, money, num } from "./ui";

const PATTERNS: { value: HouseholdPattern; label: string }[] = [
  { value: "typical", label: "Typical - evening peak" },
  { value: "evening", label: "Out at work - mostly evening use" },
  { value: "homeDay", label: "Home during the day / WFH" },
];

function blankBill(): BillInput {
  const plan = { ...newBlankPlan("tou"), id: "current", retailer: "Current retailer", name: "Current plan" };
  return {
    customer: "",
    days: 30,
    plan,
    importKwh: {},
    exportKwh: {},
    existingSolarKw: 0,
    generationKwh: null,
    bonusExportKwh: null,
    billTotal: null,
    pattern: "typical",
    ev: { ...DEFAULT_EV },
  };
}

export default function BillForm({
  bill,
  onChange,
  assumptions,
}: {
  bill: BillInput;
  onChange: (b: BillInput) => void;
  assumptions: Assumptions;
}) {
  const set = (p: Partial<BillInput>) => onChange({ ...bill, ...p });
  const base = buildBaseProfile(bill, assumptions);
  const modelled = modelBillTotal(bill, base.profile);
  const diff = bill.billTotal != null ? modelled - bill.billTotal : null;
  const diffPct = diff != null && bill.billTotal ? Math.abs(diff) / Math.max(1, Math.abs(bill.billTotal)) : 0;

  const importTotal = Object.values(bill.importKwh).reduce((s, v) => s + v, 0);
  const exportTotal = Object.values(bill.exportKwh).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">
      <Card
        title="Customer & bill period"
        subtitle="Type in what's on the customer's electricity bill. Everything stays in this browser."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Load a sample bill"
              className={inputClass + " !w-auto"}
              value=""
              onChange={(e) => {
                const sample = SAMPLE_BILLS.find((s) => s.id === e.target.value);
                if (sample) onChange(JSON.parse(JSON.stringify(sample.bill)));
              }}
            >
              <option value="">Load a sample bill...</option>
              {SAMPLE_BILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <SmallButton onClick={() => onChange(blankBill())}>
              <FilePlus2 className="h-3.5 w-3.5" /> New blank bill
            </SmallButton>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Customer / reference" className="col-span-2">
            <input
              className={inputClass}
              value={bill.customer}
              onChange={(e) => set({ customer: e.target.value })}
              placeholder="e.g. J. Smith, Berwick"
            />
          </Field>
          <Field label="Days on this bill">
            <NumInput value={bill.days} onChange={(v) => set({ days: Math.max(1, v ?? 1) })} min={1} step={1} />
          </Field>
          <Field label="Bill total $ (incl. GST)" hint="Optional - used for a sanity check">
            <NumInput allowEmpty value={bill.billTotal} onChange={(v) => set({ billTotal: v })} step={0.01} />
          </Field>
        </div>
      </Card>

      <Card
        title="Tariff & usage from the bill"
        subtitle="One row per charge on the bill. Enter the hours it applies to (e.g. 16-23, or 14-16, 23-11) so the tool can see when the customer uses power."
      >
        <TariffEditor
          plan={bill.plan}
          onChange={(plan) => set({ plan })}
          usage={{
            days: bill.days,
            importKwh: bill.importKwh,
            exportKwh: bill.exportKwh,
            bonusExportKwh: bill.bonusExportKwh,
            onImport: (id, v) => set({ importKwh: { ...bill.importKwh, [id]: v } }),
            onExport: (id, v) => set({ exportKwh: { ...bill.exportKwh, [id]: v } }),
            onBonusExport: (v) => set({ bonusExportKwh: v }),
          }}
        />
      </Card>

      <Card title="About the household" subtitle="Bills show totals, not when the power was used. These help the model place it.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="When do they use power?" className="col-span-2">
            <select
              className={inputClass}
              value={bill.pattern}
              onChange={(e) => set({ pattern: e.target.value as HouseholdPattern })}
            >
              {PATTERNS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Existing solar (kW)" hint="0 if none">
            <NumInput value={bill.existingSolarKw} onChange={(v) => set({ existingSolarKw: v ?? 0 })} min={0} step={0.1} />
          </Field>
          <Field label="Solar generated on bill (kWh)" hint="Optional, from the inverter app">
            <NumInput allowEmpty value={bill.generationKwh} onChange={(v) => set({ generationKwh: v })} min={0} step={0.1} />
          </Field>
          <Field label="Add EV charging (kWh/day)" hint="What-if on top of the bill">
            <NumInput
              value={bill.ev.kwhPerDay}
              onChange={(v) => set({ ev: { ...bill.ev, kwhPerDay: v ?? 0 } })}
              min={0}
              step={1}
            />
          </Field>
          <Field label="EV charging hours" hint="e.g. 11-14 for the free window">
            <input
              className={inputClass}
              value={bill.ev.hours}
              onChange={(e) => set({ ev: { ...bill.ev, hours: e.target.value } })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Check against the bill">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-mist-500">Grid usage</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-navy-900">
              {num(importTotal / Math.max(1, bill.days), 1)} kWh/day
            </dd>
            <dd className="text-xs text-mist-500">
              {num((importTotal / Math.max(1, bill.days)) * 7, 0)} /week · {num((importTotal / Math.max(1, bill.days)) * (365 / 12), 0)} /month
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-mist-500">Solar exported</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-navy-900">
              {num(exportTotal / Math.max(1, bill.days), 1)} kWh/day
            </dd>
            <dd className="text-xs text-mist-500">
              {base.generationPerDay > 0
                ? `${num(base.generationPerDay, 1)} kWh/day generated${base.generationEstimated ? " (estimated)" : ""}`
                : "No solar"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-mist-500">Bill as modelled</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-navy-900">{money(modelled, true)}</dd>
            <dd className="text-xs text-mist-500">{money((modelled / Math.max(1, bill.days)) * (365 / 12))} per month</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-mist-500">Versus bill total</dt>
            {diff == null ? (
              <dd className="mt-1 text-sm text-mist-500">Enter the bill total above to compare.</dd>
            ) : diffPct <= 0.02 ? (
              <dd className="mt-1 flex items-center gap-1.5 font-semibold text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Matches ({money(diff, true)})
              </dd>
            ) : (
              <dd className="mt-1 flex items-center gap-1.5 font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" /> Off by {money(diff, true)}
              </dd>
            )}
          </div>
        </dl>
        {diff != null && diffPct > 0.02 && (
          <p className="mt-3 text-sm text-amber-800">
            The modelled bill doesn&apos;t match the bill total. Usually that&apos;s a mistyped kWh or rate, a concession or one-off
            credit on the bill, a credit/bonus that isn&apos;t set up in the plan above, or a bill that includes a different period.
          </p>
        )}
        {base.warnings.map((w) => (
          <p key={w} className="mt-2 text-sm text-amber-800">
            {w}
          </p>
        ))}
      </Card>
    </div>
  );
}
