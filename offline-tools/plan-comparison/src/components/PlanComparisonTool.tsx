"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Battery, FileText, LineChart, ListChecks, RotateCcw, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { buildBaseProfile } from "@/lib/energy/engine";
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_BATTERY_SIZES,
  DEFAULT_SOLAR_SIZES,
  SAMPLE_BILLS,
  SEED_PLANS,
} from "@/lib/energy/samples";
import type { Assumptions, BillInput, Plan, SizeOption } from "@/lib/energy/types";
import BillForm from "./BillForm";
import HardwareSettings from "./HardwareSettings";
import PlanLibrary from "./PlanLibrary";
import Results from "./Results";
import { SmallButton } from "./ui";

const STORAGE_KEY = "sunflow-plan-tool-v1";

interface ToolState {
  bill: BillInput;
  library: Plan[];
  excluded: string[];
  assumptions: Assumptions;
  batteries: SizeOption[];
  solars: SizeOption[];
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function defaults(): ToolState {
  return {
    bill: clone(SAMPLE_BILLS[0].bill),
    library: clone(SEED_PLANS),
    excluded: [],
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    batteries: DEFAULT_BATTERY_SIZES.map((size) => ({ size, price: null })),
    solars: DEFAULT_SOLAR_SIZES.map((size) => ({ size, price: null })),
  };
}

function load(): ToolState {
  const d = defaults();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw) as Partial<ToolState>;
    return {
      bill: s.bill && s.bill.plan ? { ...d.bill, ...s.bill, ev: { ...d.bill.ev, ...s.bill.ev } } : d.bill,
      library: Array.isArray(s.library) ? s.library : d.library,
      excluded: Array.isArray(s.excluded) ? s.excluded : d.excluded,
      assumptions: { ...d.assumptions, ...s.assumptions },
      batteries: Array.isArray(s.batteries) && s.batteries.length ? s.batteries : d.batteries,
      solars: Array.isArray(s.solars) && s.solars.length ? s.solars : d.solars,
    };
  } catch {
    return d;
  }
}

type Tab = "bill" | "plans" | "hardware" | "results";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "bill", label: "1. Customer bill", icon: FileText },
  { id: "plans", label: "2. Plans to compare", icon: ListChecks },
  { id: "hardware", label: "3. Battery & solar", icon: Battery },
  { id: "results", label: "4. Results", icon: LineChart },
];

export default function PlanComparisonTool() {
  const [state, setState] = useState<ToolState>(load);
  const [tab, setTab] = useState<Tab>("bill");
  const patch = (p: Partial<ToolState>) => setState((s) => ({ ...s, ...p }));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private window); the tool still works */
    }
  }, [state]);

  const { bill, library, excluded, assumptions, batteries, solars } = state;

  const comparisonPlans = useMemo<Plan[]>(() => {
    const current: Plan = { ...bill.plan, id: "current" };
    const others = library.filter(
      (p) => !excluded.includes(p.id) && !(p.retailer === current.retailer && p.name === current.name)
    );
    return [current, ...others];
  }, [bill.plan, library, excluded]);

  const base = useMemo(() => buildBaseProfile(bill, assumptions).profile, [bill, assumptions]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-mist-500">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Runs entirely in your browser. Bill details are never sent anywhere and are saved on this computer only.
          </p>
          {bill.customer && <p className="mt-1 font-display text-lg font-semibold text-navy-900">{bill.customer}</p>}
        </div>
        <SmallButton
          tone="danger"
          onClick={() => {
            if (window.confirm("Clear the customer bill, plans and settings and start again?")) {
              setState(defaults());
              setTab("bill");
            }
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Start over
        </SmallButton>
      </div>

      <nav aria-label="Steps" className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-mist-200 bg-white p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "step" : undefined}
            className={clsx(
              "flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === id ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-mist-100"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {tab === "bill" && <BillForm bill={bill} onChange={(b) => patch({ bill: b })} assumptions={assumptions} />}
      {tab === "plans" && (
        <PlanLibrary
          plans={library}
          onPlans={(p) => patch({ library: p })}
          excluded={excluded}
          onExcluded={(e) => patch({ excluded: e })}
          currentPlan={bill.plan}
        />
      )}
      {tab === "hardware" && (
        <HardwareSettings
          batteries={batteries}
          onBatteries={(b) => patch({ batteries: b })}
          solars={solars}
          onSolars={(s) => patch({ solars: s })}
          assumptions={assumptions}
          onAssumptions={(a) => patch({ assumptions: a })}
        />
      )}
      {tab === "results" && (
        <Results
          customer={bill.customer}
          plans={comparisonPlans}
          base={base}
          batteries={batteries}
          solars={solars}
          assumptions={assumptions}
        />
      )}

      {tab !== "results" && (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setTab(TABS[TABS.findIndex((t) => t.id === tab) + 1].id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-solar-500 px-6 py-3 font-semibold text-navy-950 shadow-lg shadow-solar-500/25 transition-colors hover:bg-solar-400"
          >
            {tab === "hardware" ? "See results" : "Next"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
