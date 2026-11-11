import clsx from "clsx";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { CustomerRow } from "../components/rows";
import { Empty, PageHeader } from "../components/ui";
import { useStore } from "../store";
import { STAGES, type Stage } from "../types";
import { fullName } from "../utils";

export default function Customers() {
  const { db, me } = useStore();
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const dq = useDeferredValue(q);

  const dealsBy = useMemo(() => {
    const m = new Map<string, typeof db.deals>();
    db.deals.forEach((d) => m.set(d.customerId, [...(m.get(d.customerId) ?? []), d]));
    return m;
  }, [db]);

  const list = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return db.customers
      .filter((c) => {
        const deals = dealsBy.get(c.id) ?? [];
        if (mine && c.assignedTo !== me.staffId) return false;
        if (stage !== "all" && !deals.some((d) => d.stage === stage)) return false;
        if (!needle) return true;
        const hay = [fullName(c), c.email, c.suburb, c.address, c.postcode, ...deals.map((d) => `${d.title} ${d.system.panelBrand} ${d.system.batteryBrand} ${d.system.inverterBrand}`)].join(" ").toLowerCase();
        return hay.includes(needle) || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits));
      })
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [db.customers, dealsBy, dq, stage, mine, me.staffId]);

  return (
    <>
      <PageHeader title="Customers" sub={`${db.customers.length} in total`} />
      <div className="sticky top-0 z-10 -mx-4 bg-mist-50/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-mist-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Search name, phone, suburb, brand..."
            className="min-h-12 w-full rounded-2xl border border-mist-300 bg-white pl-11 pr-4 shadow-sm focus:border-solar-600 focus:outline-none focus:ring-2 focus:ring-solar-400/40"
          />
        </div>
        <div className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1">
          {me.staffId && (
            <button onClick={() => setMine(!mine)} className={clsx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold", mine ? "border-solar-600 bg-solar-500 text-navy-900" : "border-mist-200 bg-white text-mist-500")}>
              My customers
            </button>
          )}
          {([{ id: "all", label: "All" }, ...STAGES] as { id: Stage | "all"; label: string }[]).map((s) => (
            <button
              key={s.id}
              onClick={() => setStage(s.id)}
              className={clsx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold", stage === s.id ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 bg-white text-mist-500")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty
          title={db.customers.length === 0 ? "No customers yet" : "No matches"}
          hint={db.customers.length === 0 ? "Tap the yellow + button to add your first customer, or import a list from More." : "Try a different spelling or clear the filter."}
        />
      ) : (
        <div className="space-y-2">{list.map((c) => <CustomerRow key={c.id} c={c} deals={dealsBy.get(c.id) ?? []} />)}</div>
      )}
    </>
  );
}
