import clsx from "clsx";
import { Heart } from "lucide-react";
import { useMemo, useState } from "react";
import { outstandingRequired, progress } from "../checklist";
import { Card, Empty, StageBadge } from "../components/ui";
import { useStore } from "../store";
import type { Deal } from "../types";
import { fmtDate, fmtDateShort, fullName, relativeDay, systemSummary } from "../utils";

type Row = { deal: Deal; left: ReturnType<typeof outstandingRequired>; p: ReturnType<typeof progress> };

/** Won and installed jobs with their paperwork progress, so anyone can see what's still outstanding. */
export function JobsProgress() {
  const { db, me } = useStore();
  const [mine, setMine] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const rows = useMemo(() => {
    const owner = new Map(db.customers.map((c) => [c.id, c.assignedTo]));
    return db.deals
      .filter((d) => (d.stage === "won" || d.stage === "installed") && (!mine || owner.get(d.customerId) === me.staffId))
      .map((d): Row => ({ deal: d, left: outstandingRequired(d), p: progress(d) }));
  }, [db.deals, db.customers, mine, me.staffId]);

  // "Complete" = installed, every required step done, thank-you sent
  const isComplete = (r: Row) => r.deal.stage === "installed" && !!r.p && r.left.length === 0 && !!r.deal.thanks;
  const active = rows.filter((r) => !isComplete(r)).sort((a, b) => (a.deal.installDate ?? "9999").localeCompare(b.deal.installDate ?? "9999"));
  const done = rows.filter(isComplete);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-mist-500">{active.length} job{active.length === 1 ? "" : "s"} in progress</p>
        {me.staffId && !me.isLimited && (
          <button onClick={() => setMine(!mine)} className={clsx("min-h-9 rounded-full border px-3.5 text-sm font-semibold", mine ? "border-solar-600 bg-solar-500 text-navy-900" : "border-mist-200 bg-white text-mist-500")}>Only mine</button>
        )}
      </div>

      {active.length === 0 ? (
        <Empty title="No jobs in progress" hint="When a job is marked Won, it appears here with its paperwork checklist." />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">{active.map((r) => <JobCard key={r.deal.id} r={r} />)}</div>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowDone(!showDone)} className="min-h-10 text-sm font-semibold text-navy-600">
            {showDone ? "Hide" : "Show"} completed jobs ({done.length})
          </button>
          {showDone && <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-3 opacity-80 md:grid-cols-2">{done.map((r) => <JobCard key={r.deal.id} r={r} />)}</div>}
        </div>
      )}
    </>
  );
}

function JobCard({ r }: { r: Row }) {
  const { db } = useStore();
  const { deal, left, p } = r;
  const c = db.customers.find((x) => x.id === deal.customerId);
  const files = db.files.filter((f) => f.customerId === deal.customerId && (f.dealId === deal.id || f.dealId === null)).length;
  if (!c) return null;
  const pct = p ? Math.round((p.done / p.total) * 100) : 0;

  return (
    <a href={`#/customers/${c.id}`} className="block min-w-0">
      <Card className="p-3.5 transition hover:border-solar-500">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold">{fullName(c)}</p>
            <p className="truncate text-xs text-mist-500">{[c.suburb, systemSummary(deal) || deal.title].filter(Boolean).join(" · ")}</p>
          </div>
          <StageBadge stage={deal.stage} />
        </div>

        <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-mist-500">
          {deal.stage === "installed" ? (
            <span>Installed {fmtDate(deal.installedOn)}</span>
          ) : deal.installDate ? (
            <span>Install {fmtDateShort(deal.installDate)} · {relativeDay(deal.installDate)}</span>
          ) : (
            <span className="text-amber-700">No install date yet</span>
          )}
          <span className="ml-auto">{files} file{files === 1 ? "" : "s"}</span>
        </div>

        {p ? (
          <>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist-200"><span className={clsx("block h-full", left.length ? "bg-solar-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} /></span>
              <span className="text-xs font-bold text-navy-700">{p.done}/{p.total}</span>
            </div>
            {left.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-[13px]">
                <li className="text-[11px] font-bold uppercase tracking-wide text-amber-700">{left.length} required left</li>
                {left.slice(0, 3).map((i) => <li key={i.id} className="truncate text-mist-600">• {i.label}</li>)}
                {left.length > 3 && <li className="text-xs text-mist-400">+ {left.length - 3} more</li>}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] font-semibold text-emerald-700">All required paperwork done</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-mist-500">Checklist not started yet</p>
        )}

        {deal.stage === "installed" && (
          <p className={clsx("mt-2 flex items-center gap-1 text-xs font-semibold", deal.thanks ? "text-emerald-700" : "text-amber-700")}>
            <Heart className="size-3.5" /> {deal.thanks ? `Thank-you sent ${fmtDate(deal.thanks.sentAt)}` : "Thank-you & review request not sent yet"}
          </p>
        )}
      </Card>
    </a>
  );
}
