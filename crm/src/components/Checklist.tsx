import { Plus, Printer, X } from "lucide-react";
import { useState } from "react";
import { CHECKLIST_GROUPS, printChecklist, progress } from "../checklist";
import { useStore } from "../store";
import type { Customer, Deal } from "../types";
import { fmtDate } from "../utils";
import { Button, Input } from "./ui";

/** Per-job paperwork checklist. Starts automatically when a job is Won; can be started earlier by hand. */
export default function Checklist({ deal, customer }: { deal: Deal; customer: Customer }) {
  const { startChecklist, setCheck, addCheckItem, removeCheckItem } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const p = progress(deal);

  if (!deal.checklist) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-mist-50 px-3 py-2.5">
        <span className="text-sm text-mist-500">Paperwork checklist starts when the job is won.</span>
        <Button size="sm" variant="soft" onClick={() => { startChecklist(deal.id); setOpen(true); }}>Start now</Button>
      </div>
    );
  }

  const outstanding = deal.checklist.filter((c) => c.required && !c.done).length;
  const groups = [...CHECKLIST_GROUPS, ...new Set(deal.checklist.map((c) => c.group).filter((g) => !CHECKLIST_GROUPS.includes(g)))];

  return (
    <div className="mt-3 rounded-xl border border-mist-200">
      <button onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-3 px-3 text-left">
        <span className="flex-1">
          <span className="block text-sm font-bold">Paperwork checklist</span>
          <span className="block text-xs text-mist-500">{p!.done} of {p!.total} done{outstanding ? ` · ${outstanding} required left` : " · all required done"}</span>
        </span>
        <span className="h-2 w-20 overflow-hidden rounded-full bg-mist-200"><span className="block h-full bg-emerald-500" style={{ width: `${(p!.done / p!.total) * 100}%` }} /></span>
        <span className="text-xs font-semibold text-navy-600">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="border-t border-mist-100 px-3 pb-3">
          {groups.map((gr) => {
            const items = deal.checklist!.filter((i) => i.group === gr);
            if (!items.length) return null;
            return (
              <div key={gr}>
                <h4 className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-mist-500">{gr}</h4>
                <ul>
                  {items.map((i) => (
                    <li key={i.id} className="group flex items-start gap-3 py-1.5">
                      <input id={i.id} type="checkbox" checked={i.done} onChange={(e) => setCheck(deal.id, i.id, e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-[#f7931e]" />
                      <label htmlFor={i.id} className="min-w-0 flex-1 text-[14.5px] leading-snug">
                        <span className={i.done ? "text-mist-500 line-through" : ""}>{i.label}</span>
                        {i.required && !i.done && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">REQUIRED</span>}
                        {i.done && i.doneAt && <span className="block text-[11px] text-mist-400">{fmtDate(i.doneAt)}{i.doneBy ? ` · ${i.doneBy}` : ""}</span>}
                      </label>
                      {!i.key && (
                        <button onClick={() => removeCheckItem(deal.id, i.id)} aria-label="Remove item" className="grid size-7 place-items-center rounded-full text-mist-300 hover:text-red-600"><X className="size-4" /></button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="mt-3 flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add your own item for this job" onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { addCheckItem(deal.id, text.trim(), "Other"); setText(""); } }} />
            <Button variant="soft" disabled={!text.trim()} onClick={() => { addCheckItem(deal.id, text.trim(), "Other"); setText(""); }} aria-label="Add item"><Plus className="size-4" /></Button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={() => printChecklist(customer, deal)}><Printer className="size-4" /> Print job sheet</Button>
            <span className="text-[11px] text-mist-400">Starter list for Victoria - have your electrician confirm it.</span>
          </div>
        </div>
      )}
    </div>
  );
}
