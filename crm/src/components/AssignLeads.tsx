import { UserPlus } from "lucide-react";
import { useState } from "react";
import { callApi } from "../api";
import { cloudEnabled } from "../cloud";
import { useStore } from "../store";
import { fullName, relativeDay } from "../utils";
import { Card, Select, SectionTitle } from "./ui";

/**
 * New leads from the website, ads, Pylon or phone calls arrive with nobody looking after them. Only admins and full staff can
 * see them until one is given to someone here; after that the person it's given to (including a "limited" person) sees it,
 * with its follow-ups, and nobody else limited does. Giving a lead to someone can also email them the details.
 */
export default function AssignLeads() {
  const { db, me, updateCustomer, addNote, syncNow } = useStore();
  const [tell, setTell] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const waiting = db.customers
    .filter((c) => !c.assignedTo)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (me.isLimited || db.staff.length === 0 || (waiting.length === 0 && !msg)) return null;

  async function give(customerId: string, staffId: string) {
    if (!staffId) return;
    const who = db.staff.find((s) => s.id === staffId);
    const name = who?.name ?? "a team member";
    updateCustomer(customerId, { assignedTo: staffId });
    addNote({ customerId, kind: "system", text: `Assigned to ${name} by ${me.name}` });

    if (!tell || !cloudEnabled || staffId === me.staffId) {
      setMsg({ ok: true, text: `Given to ${staffId === me.staffId ? "you" : name}.` });
      return;
    }
    setMsg({ ok: true, text: `Given to ${name}. Emailing them...` });
    try {
      await syncNow(); // make sure the database has the customer before the email is built from it
      await callApi("/api/notify-assignment", { customerId, staffId });
      setMsg({ ok: true, text: `Given to ${name}, and they've been emailed.` });
    } catch (e) {
      setMsg({ ok: false, text: `Given to ${name}, but the email didn't send: ${e instanceof Error ? e.message : "unknown problem"}. They will still see it in the CRM.` });
    }
  }

  return (
    <>
      <SectionTitle>
        <span className="inline-flex items-center gap-1 text-amber-700"><UserPlus className="size-3.5" /> New leads to assign ({waiting.length})</span>
      </SectionTitle>

      {msg && <p className={`mb-2 rounded-xl px-3 py-2 text-sm font-medium ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} role="status">{msg.text}</p>}

      {waiting.length > 0 && (
        <Card className="divide-y divide-mist-100 border-amber-200">
          {cloudEnabled && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 bg-amber-50/60 px-3.5 text-sm font-medium text-navy-800">
              <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} className="size-5 accent-[#f7931e]" />
              Email them the lead's details when I give it to them
            </label>
          )}
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
                <Select value="" onChange={(e) => void give(c.id, e.target.value)} className="w-44" aria-label={`Assign ${fullName(c)} to`}>
                  <option value="">Give to...</option>
                  {db.staff.map((s) => <option key={s.id} value={s.id}>{s.id === me.staffId ? `Me (${s.name})` : s.name}{s.role === "limited" ? "" : s.role === "admin" ? " - admin" : " - staff"}</option>)}
                </Select>
              </div>
            );
          })}
          {waiting.length > 8 && <p className="px-3.5 py-2.5 text-xs text-mist-500">+ {waiting.length - 8} more - open Customers and use the Unassigned filter.</p>}
        </Card>
      )}
    </>
  );
}
