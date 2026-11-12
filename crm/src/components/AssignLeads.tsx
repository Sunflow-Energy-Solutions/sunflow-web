import { UserPlus } from "lucide-react";
import { useStore } from "../store";
import { fullName, relativeDay } from "../utils";
import { Card, Select, SectionTitle } from "./ui";

/**
 * New leads from the website, ads, Pylon or phone calls arrive with nobody looking after them. Only admins and full staff can
 * see them until one is given to someone here; after that the person it's given to (including a "limited" person) sees it,
 * with its follow-ups, and nobody else limited does.
 */
export default function AssignLeads() {
  const { db, me, updateCustomer, addNote } = useStore();
  const waiting = db.customers
    .filter((c) => !c.assignedTo)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (me.isLimited || waiting.length === 0 || db.staff.length === 0) return null;

  function give(customerId: string, staffId: string) {
    if (!staffId) return;
    const who = db.staff.find((s) => s.id === staffId);
    updateCustomer(customerId, { assignedTo: staffId });
    addNote({ customerId, kind: "system", text: `Assigned to ${who?.name ?? "a team member"} by ${me.name}` });
  }

  return (
    <>
      <SectionTitle>
        <span className="inline-flex items-center gap-1 text-amber-700"><UserPlus className="size-3.5" /> New leads to assign ({waiting.length})</span>
      </SectionTitle>
      <Card className="divide-y divide-mist-100 border-amber-200">
        {waiting.slice(0, 8).map((c) => {
          const deal = db.deals.filter((d) => d.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <a href={`#/customers/${c.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{fullName(c)}{c.suburb ? <span className="font-normal text-mist-500"> · {c.suburb}</span> : null}</span>
                <span className="block truncate text-xs text-mist-500">
                  {[deal?.title, c.source && `from ${deal?.source || c.source}${deal?.campaign ? ` - ${deal.campaign}` : ""}`, relativeDay(c.createdAt.slice(0, 10)).toLowerCase()].filter(Boolean).join(" · ")}
                </span>
              </a>
              <Select value="" onChange={(e) => give(c.id, e.target.value)} className="w-44" aria-label={`Assign ${fullName(c)} to`}>
                <option value="">Give to...</option>
                {db.staff.map((s) => <option key={s.id} value={s.id}>{s.id === me.staffId ? `Me (${s.name})` : s.name}{s.role === "limited" ? "" : s.role === "admin" ? " - admin" : " - staff"}</option>)}
              </Select>
            </div>
          );
        })}
        {waiting.length > 8 && <p className="px-3.5 py-2.5 text-xs text-mist-500">+ {waiting.length - 8} more - open Customers and use the Unassigned filter.</p>}
      </Card>
    </>
  );
}
