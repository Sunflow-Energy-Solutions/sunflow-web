import { Paperclip, Plus, Printer, X } from "lucide-react";
import { useState } from "react";
import { CATEGORY_FOR, CHECKLIST_GROUPS, TEMPLATE, printChecklist, progress } from "../checklist";
import { cloudEnabled } from "../cloud";
import { useStore } from "../store";
import type { Customer, Deal } from "../types";
import { fmtDate } from "../utils";
import Files from "./Files";
import { Button, Input, Select } from "./ui";

/**
 * Per-job paperwork checklist. Starts automatically when a job is Won (or by hand). Everyone on the team sees the same ticks,
 * who did them and when; each step can hold its own photos / documents as proof; steps can be added from the standard list,
 * removed if they don't apply, or written in for this one job.
 */
export default function Checklist({ deal, customer }: { deal: Deal; customer: Customer }) {
  const { db, startChecklist, setCheck, addCheckItem, removeCheckItem, addTemplateItem } = useStore();
  const [open, setOpen] = useState(false);
  const [attach, setAttach] = useState<string | null>(null);
  const [jobFiles, setJobFiles] = useState(false);
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

  const fileCount = (checkId: string) => db.files.filter((f) => f.checkId === checkId).length;
  const jobFileCount = db.files.filter((f) => f.customerId === customer.id && (f.dealId === deal.id || f.dealId === null)).length;
  const outstanding = deal.checklist.filter((c) => c.required && !c.done).length;
  const groups = [...CHECKLIST_GROUPS, ...new Set(deal.checklist.map((c) => c.group).filter((g) => !CHECKLIST_GROUPS.includes(g)))];
  const onJob = new Set(deal.checklist.map((c) => c.key).filter(Boolean));
  const addable = TEMPLATE.filter((t) => !onJob.has(t.key));

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
                  {items.map((i) => {
                    const n = fileCount(i.id);
                    return (
                      <li key={i.id} className="py-1.5">
                        <div className="flex items-start gap-3">
                          <input id={i.id} type="checkbox" checked={i.done} onChange={(e) => setCheck(deal.id, i.id, e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-[#f7931e]" />
                          <label htmlFor={i.id} className="min-w-0 flex-1 text-[14.5px] leading-snug">
                            <span className={i.done ? "text-mist-500 line-through" : ""}>{i.label}</span>
                            {i.required && !i.done && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">REQUIRED</span>}
                            {i.done && i.doneAt && <span className="block text-[11px] text-mist-400">{fmtDate(i.doneAt)}{i.doneBy ? ` · ${i.doneBy}` : ""}</span>}
                          </label>
                          <button
                            onClick={() => setAttach(attach === i.id ? null : i.id)}
                            aria-label={`Photos and documents for: ${i.label}`}
                            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold ${n ? "bg-navy-900 text-white" : "text-mist-400 hover:bg-mist-100"}`}
                          >
                            <Paperclip className="size-4" />{n > 0 && n}
                          </button>
                          <button
                            onClick={() => {
                              if (!i.done || confirm("This step is already ticked. Remove it from this job?")) removeCheckItem(deal.id, i.id);
                            }}
                            aria-label={`Remove: ${i.label}`}
                            className="grid size-7 shrink-0 place-items-center rounded-full text-mist-300 hover:text-red-600"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        {attach === i.id && (
                          <div className="ml-9 mt-1.5">
                            <Files customerId={customer.id} dealId={deal.id} checkId={i.id} defaultCategory={CATEGORY_FOR[i.key]} compact />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <div className="mt-3 space-y-2">
            {addable.length > 0 && (
              <Select
                value=""
                onChange={(e) => e.target.value && addTemplateItem(deal.id, e.target.value)}
                aria-label="Add a standard step to this job"
              >
                <option value="">+ Add a standard step ({addable.length} not on this job)...</option>
                {CHECKLIST_GROUPS.map((g) => {
                  const rows = addable.filter((t) => t.group === g);
                  return rows.length ? <optgroup key={g} label={g}>{rows.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup> : null;
                })}
              </Select>
            )}
            <div className="flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Or write your own step for this job" onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { addCheckItem(deal.id, text.trim(), "Other"); setText(""); } }} />
              <Button variant="soft" disabled={!text.trim()} onClick={() => { addCheckItem(deal.id, text.trim(), "Other"); setText(""); }} aria-label="Add step"><Plus className="size-4" /></Button>
            </div>
          </div>

          <div className="mt-3 border-t border-mist-100 pt-3">
            <button onClick={() => setJobFiles(!jobFiles)} className="flex min-h-10 w-full items-center justify-between text-left text-sm font-bold">
              <span>Everything stored for this job <span className="font-normal text-mist-500">({jobFileCount} file{jobFileCount === 1 ? "" : "s"})</span></span>
              <span className="text-xs font-semibold text-navy-600">{jobFiles ? "Hide" : "Show"}</span>
            </button>
            {jobFiles && <div className="mt-1.5">{cloudEnabled ? <Files customerId={customer.id} dealId={deal.id} /> : <p className="text-sm text-mist-500">Photos and documents need the shared database.</p>}</div>}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={() => printChecklist(customer, deal)}><Printer className="size-4" /> Print job sheet</Button>
            <span className="text-[11px] text-mist-400">Starter list for Victoria - have your electrician confirm it.</span>
          </div>
        </div>
      )}
    </div>
  );
}
