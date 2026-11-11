import clsx from "clsx";
import { Calendar, Check, ChevronRight, Mail, Phone, Wrench } from "lucide-react";
import { useStore } from "../store";
import type { Customer, Deal, Task } from "../types";
import { TASK_KINDS } from "../types";
import { daysBetween, fmtTime, fullName, relativeDay, systemSummary, telHref, today } from "../utils";
import { Avatar, StageBadge } from "./ui";

export function TaskRow({ task, onEdit, showCustomer = true }: { task: Task; onEdit?: (t: Task) => void; showCustomer?: boolean }) {
  const { db, completeTask } = useStore();
  const c = db.customers.find((x) => x.id === task.customerId);
  const overdue = !task.done && daysBetween(today(), task.due) < 0;
  const kind = TASK_KINDS.find((k) => k.id === task.kind)?.label ?? task.kind;
  const Icon = task.kind === "email" ? Mail : task.kind === "install" ? Wrench : task.kind === "call" ? Phone : Calendar;

  return (
    <div className={clsx("flex items-center gap-3 rounded-2xl border bg-white p-3", overdue ? "border-red-200" : "border-mist-200", task.done && "opacity-60")}>
      <button
        onClick={() => completeTask(task.id, !task.done)}
        aria-label={task.done ? "Mark not done" : "Mark done"}
        className={clsx("grid size-11 shrink-0 place-items-center rounded-full border-2 transition", task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-mist-300 text-transparent hover:border-emerald-500 hover:text-emerald-500")}
      >
        <Check className="size-5" strokeWidth={3} />
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => (onEdit ? onEdit(task) : undefined)}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-mist-500">
          <Icon className="size-3.5" /> {kind}
          <span className={clsx("ml-1", overdue && "text-red-600")}>· {relativeDay(task.due)}{task.time ? ` ${fmtTime(task.time)}` : ""}</span>
        </span>
        {showCustomer && c && <span className="block truncate font-semibold text-navy-900">{fullName(c)}</span>}
        <span className="block truncate text-sm text-mist-500">{task.note || "(no note)"}</span>
      </button>
      {showCustomer && c?.phone && !task.done && (
        <a href={telHref(c.phone)} aria-label={`Call ${fullName(c)}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-solar-500 text-navy-900">
          <Phone className="size-5" />
        </a>
      )}
      {showCustomer && c && (
        <a href={`#/customers/${c.id}`} aria-label="Open customer" className="hidden size-9 shrink-0 place-items-center text-mist-400 sm:grid">
          <ChevronRight className="size-5" />
        </a>
      )}
    </div>
  );
}

export function CustomerRow({ c, deals }: { c: Customer; deals: Deal[] }) {
  const latest = [...deals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  return (
    <a href={`#/customers/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-mist-200 bg-white p-3 transition hover:border-solar-500 active:scale-[0.99]">
      <Avatar c={c} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-navy-900">{fullName(c)}</span>
        <span className="block truncate text-sm text-mist-500">
          {[c.suburb, latest && systemSummary(latest)].filter(Boolean).join(" · ") || c.phone || c.email}
        </span>
      </span>
      {latest && <StageBadge stage={latest.stage} />}
    </a>
  );
}
