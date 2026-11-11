import { useState } from "react";
import { outstandingRequired, progress } from "../checklist";
import { LostSheet } from "../components/forms";
import { PageHeader, stageColour } from "../components/ui";
import { useStore } from "../store";
import { STAGES, type Deal, type Stage } from "../types";
import { fmtMoney, fullName, systemSummary } from "../utils";

/** Board of deals by stage. Tap a card to open the customer; use the small selector to move it. */
export default function Pipeline() {
  const { db, moveDeal } = useStore();
  const [lostDeal, setLostDeal] = useState<Deal | null>(null);
  const [showLost, setShowLost] = useState(false);
  const stages = STAGES.filter((s) => showLost || s.id !== "lost");

  function move(d: Deal, stage: Stage) {
    if (stage === "lost") return setLostDeal(d);
    if (stage === "installed") {
      const left = outstandingRequired(d);
      if (left.length && !confirm(`${left.length} required paperwork item${left.length > 1 ? "s are" : " is"} not ticked yet. Mark as installed anyway?`)) return;
    }
    moveDeal(d.id, stage);
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        sub="Every job by stage"
        right={
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-mist-500">
            <input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} className="size-4 accent-[#f7931e]" /> Show lost
          </label>
        }
      />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {stages.map((s) => {
          const deals = db.deals.filter((d) => d.stage === s.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          const total = deals.reduce((n, d) => n + (d.value ?? 0), 0);
          return (
            <section key={s.id} className="w-[78vw] max-w-72 shrink-0 snap-start rounded-2xl bg-mist-100 p-2.5 md:w-64">
              <header className="mb-2 flex items-center justify-between px-1.5 pt-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${stageColour[s.id]}`}>{s.label}</span>
                <span className="text-xs font-semibold text-mist-500">{deals.length}{total ? ` · ${fmtMoney(total)}` : ""}</span>
              </header>
              <div className="space-y-2">
                {deals.length === 0 && <p className="px-2 py-6 text-center text-xs text-mist-400">Nothing here</p>}
                {deals.map((d) => {
                  const c = db.customers.find((x) => x.id === d.customerId);
                  return (
                    <div key={d.id} className="rounded-xl bg-white p-3 shadow-sm">
                      <a href={`#/customers/${d.customerId}`} className="block">
                        <span className="block truncate font-semibold">{c ? fullName(c) : "Customer"}</span>
                        <span className="block truncate text-xs text-mist-500">{[c?.suburb, systemSummary(d) || d.title].filter(Boolean).join(" · ")}</span>
                        {d.value != null && <span className="mt-1 block text-sm font-bold text-navy-700">{fmtMoney(d.value)}</span>}
                        {progress(d) && <span className="mt-1 block text-xs font-semibold text-emerald-700">Paperwork {progress(d)!.done}/{progress(d)!.total}</span>}
                      </a>
                      <select
                        value={d.stage}
                        onChange={(e) => move(d, e.target.value as Stage)}
                        aria-label="Move to stage"
                        className="mt-2 min-h-9 w-full rounded-lg border border-mist-200 bg-mist-50 px-2 text-xs font-semibold text-navy-700"
                      >
                        {STAGES.map((x) => <option key={x.id} value={x.id}>{x.id === d.stage ? `Stage: ${x.label}` : `Move to ${x.label}`}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {lostDeal && (
        <LostSheet
          onClose={() => setLostDeal(null)}
          onConfirm={(reason) => {
            moveDeal(lostDeal.id, "lost", { lostReason: reason });
            setLostDeal(null);
          }}
        />
      )}
    </>
  );
}
