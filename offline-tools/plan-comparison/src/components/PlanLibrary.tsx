"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Plus, RotateCcw, Trash2, Download } from "lucide-react";
import clsx from "clsx";
import { SEED_PLANS, newBlankPlan } from "@/lib/energy/samples";
import type { Plan } from "@/lib/energy/types";
import TariffEditor from "./TariffEditor";
import { Card, SmallButton } from "./ui";

function summary(plan: Plan) {
  const rates = plan.importBands.map((b) => `${b.name} ${(b.rate * 100).toFixed(1)}c`).join(" · ");
  const fit = plan.feedInBands.map((b) => b.rate).filter((r, i, a) => a.indexOf(r) === i);
  const fitText = fit.length ? `feed-in ${fit.map((r) => `${(r * 100).toFixed(1)}c`).join("/")}` : "";
  return `${(plan.dailySupply * 100).toFixed(1)}c/day supply · ${rates} · ${fitText}`;
}

export default function PlanLibrary({
  plans,
  onPlans,
  excluded,
  onExcluded,
  currentPlan,
}: {
  plans: Plan[];
  onPlans: (p: Plan[]) => void;
  excluded: string[];
  onExcluded: (ids: string[]) => void;
  currentPlan: Plan;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const update = (p: Plan) => onPlans(plans.map((x) => (x.id === p.id ? p : x)));
  const add = (p: Plan) => {
    onPlans([...plans, p]);
    setOpen(p.id);
  };

  return (
    <div className="space-y-6">
      <Card
        title="Plans to compare against"
        subtitle="Add the offers you want to test. The customer's current plan is always included automatically. Tick a plan to include it."
        action={
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={() => add(newBlankPlan("single"))}>
              <Plus className="h-3.5 w-3.5" /> Single rate
            </SmallButton>
            <SmallButton onClick={() => add(newBlankPlan("tou"))}>
              <Plus className="h-3.5 w-3.5" /> Time of use
            </SmallButton>
            <SmallButton onClick={() => add(newBlankPlan("free"))}>
              <Plus className="h-3.5 w-3.5" /> Free 11am-2pm
            </SmallButton>
          </div>
        }
      >
        <p className="mb-4 rounded-lg bg-solar-300/20 px-3 py-2 text-sm text-navy-800">
          Rates here are only as current as you make them. The three seeded plans were read off real invoices (dates in each plan&apos;s
          notes) - check each retailer or Victorian Energy Compare before quoting a customer. New plans start with placeholder
          numbers you must overwrite.
        </p>

        <ul className="divide-y divide-mist-200 rounded-xl border border-mist-200">
          {plans.map((plan) => {
            const isOpen = open === plan.id;
            const included = !excluded.includes(plan.id);
            return (
              <li key={plan.id} className="bg-white first:rounded-t-xl last:rounded-b-xl">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    aria-label={`Include ${plan.name} in comparison`}
                    checked={included}
                    onChange={() => onExcluded(included ? [...excluded, plan.id] : excluded.filter((id) => id !== plan.id))}
                    className="h-4 w-4 cursor-pointer accent-solar-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={clsx("font-semibold text-navy-900", !included && "opacity-50")}>
                      {plan.retailer} - {plan.name}
                    </p>
                    <p className="truncate text-xs text-mist-500">{summary(plan)}</p>
                  </div>
                  <div className="flex gap-2">
                    <SmallButton
                      onClick={() => {
                        const copy: Plan = { ...JSON.parse(JSON.stringify(plan)), id: newBlankPlan("single").id, name: `${plan.name} (copy)` };
                        add(copy);
                      }}
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </SmallButton>
                    <SmallButton
                      tone="danger"
                      onClick={() => {
                        if (window.confirm(`Delete "${plan.retailer} - ${plan.name}"?`)) onPlans(plans.filter((x) => x.id !== plan.id));
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </SmallButton>
                    <SmallButton onClick={() => setOpen(isOpen ? null : plan.id)}>
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isOpen ? "Close" : "Edit"}
                    </SmallButton>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-mist-200 bg-mist-50/60 p-4 sm:p-5">
                    <TariffEditor plan={plan} onChange={update} />
                    <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-mist-500">
                      Notes
                      <textarea
                        value={plan.notes ?? ""}
                        onChange={(e) => update({ ...plan, notes: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-navy-900 focus:border-solar-500 focus:outline-none focus:ring-2 focus:ring-solar-500/30"
                        placeholder="Where the rates came from, conditions, date checked..."
                      />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
          {plans.length === 0 && <li className="p-6 text-center text-sm text-mist-500">No plans yet - add one above.</li>}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <SmallButton
            onClick={() => {
              const copy: Plan = {
                ...JSON.parse(JSON.stringify(currentPlan)),
                id: newBlankPlan("single").id,
                name: `${currentPlan.name} (from bill)`,
              };
              add(copy);
            }}
          >
            <Download className="h-3.5 w-3.5" /> Save the current bill&apos;s plan to the library
          </SmallButton>
          <SmallButton
            tone="danger"
            onClick={() => {
              if (window.confirm("Replace the library with just the three seeded plans?")) {
                onPlans(JSON.parse(JSON.stringify(SEED_PLANS)));
                onExcluded([]);
              }
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset library
          </SmallButton>
        </div>
        <p className="mt-3 text-xs text-mist-500">The library is saved in this browser only.</p>
      </Card>
    </div>
  );
}
