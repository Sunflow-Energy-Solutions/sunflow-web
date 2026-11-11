import clsx from "clsx";
import { useState } from "react";
import { TaskSheet } from "../components/forms";
import { TaskRow } from "../components/rows";
import { Empty, PageHeader, SectionTitle } from "../components/ui";
import { useStore } from "../store";
import { TASK_KINDS, type Task, type TaskKind } from "../types";
import { daysBetween, today } from "../utils";

export default function Tasks() {
  const { db } = useStore();
  const [kind, setKind] = useState<TaskKind | "all">("all");
  const [edit, setEdit] = useState<Task | null>(null);
  const t = today();

  const open = db.tasks.filter((x) => !x.done && (kind === "all" || x.kind === kind)).sort((a, b) => a.due.localeCompare(b.due));
  const groups: [string, Task[]][] = [
    ["Overdue", open.filter((x) => x.due < t)],
    ["Today", open.filter((x) => x.due === t)],
    ["This week", open.filter((x) => x.due > t && daysBetween(t, x.due) <= 7)],
    ["Later", open.filter((x) => daysBetween(t, x.due) > 7)],
  ];

  return (
    <>
      <PageHeader title="Follow-ups" sub={`${db.tasks.filter((x) => !x.done).length} open`} />
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {([{ id: "all", label: "All" }, ...TASK_KINDS] as { id: TaskKind | "all"; label: string }[]).map((k) => (
          <button key={k.id} onClick={() => setKind(k.id)} className={clsx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold", kind === k.id ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 bg-white text-mist-500")}>
            {k.label}
          </button>
        ))}
      </div>
      {open.length === 0 ? (
        <Empty title="No open follow-ups" hint="Follow-ups are created automatically when you move a job between stages, or add your own from a customer." />
      ) : (
        groups.filter(([, l]) => l.length).map(([title, list]) => (
          <div key={title}>
            <SectionTitle>{title} ({list.length})</SectionTitle>
            <div className="space-y-2">{list.map((x) => <TaskRow key={x.id} task={x} onEdit={setEdit} />)}</div>
          </div>
        ))
      )}
      {edit && <TaskSheet customerId={edit.customerId} task={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
