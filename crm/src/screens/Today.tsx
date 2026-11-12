import { ArrowUpRight, CalendarCheck, Sparkles, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import AssignLeads from "../components/AssignLeads";
import { TaskRow } from "../components/rows";
import { TaskSheet } from "../components/forms";
import { Card, Empty, PageHeader, SectionTitle, StageBadge } from "../components/ui";
import { upgradeOpportunities } from "../automation";
import { useStore } from "../store";
import type { Task } from "../types";
import { daysBetween, fmtDateShort, fmtMoney, fullName, systemSummary, today } from "../utils";

export default function Today() {
  const { db, me } = useStore();
  const [edit, setEdit] = useState<Task | null>(null);
  const [mine, setMine] = useState(() => {
    try { return localStorage.getItem("sunflow-crm-mine") === "1"; } catch { return false; }
  });
  const t = today();

  function toggleMine() {
    const v = !mine;
    setMine(v);
    try { localStorage.setItem("sunflow-crm-mine", v ? "1" : "0"); } catch { /* optional preference */ }
  }

  const owner = new Map(db.customers.map((c) => [c.id, c.assignedTo]));
  const open = db.tasks.filter((x) => !x.done && (!mine || owner.get(x.customerId) === me.staffId));
  const overdue = open.filter((x) => x.due < t).sort((a, b) => a.due.localeCompare(b.due));
  const dueToday = open.filter((x) => x.due === t);
  const soon = open.filter((x) => x.due > t && daysBetween(t, x.due) <= 3).sort((a, b) => a.due.localeCompare(b.due));

  const installs = db.deals
    .filter((d) => d.installDate && d.installDate >= t && d.stage !== "installed" && d.stage !== "lost")
    .sort((a, b) => a.installDate!.localeCompare(b.installDate!))
    .slice(0, 5);

  const upgrades = useMemo(() => upgradeOpportunities(db.deals), [db.deals]);
  const upgradeCustomers = useMemo(() => {
    const m = new Map<string, typeof upgrades>();
    upgrades.forEach((u) => m.set(u.customerId, [...(m.get(u.customerId) ?? []), u]));
    return [...m.entries()];
  }, [upgrades]);

  const pipelineValue = db.deals
    .filter((d) => ["quoted", "negotiating"].includes(d.stage))
    .reduce((n, d) => n + (d.value ?? 0), 0);
  const quotesOut = db.deals.filter((d) => d.stage === "quoted").length;
  const newLeads = db.deals.filter((d) => d.stage === "new").length;
  const monthStart = t.slice(0, 7);
  const wonThisMonth = db.deals.filter((d) => ["won", "installed"].includes(d.stage) && d.updatedAt.startsWith(monthStart)).length;

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nothing = overdue.length + dueToday.length === 0;

  return (
    <>
      <PageHeader
        title={hello}
        sub={new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
        right={me.staffId && !me.isLimited ? (
          <button onClick={toggleMine} className={`min-h-9 rounded-full border px-3.5 text-sm font-semibold ${mine ? "border-solar-600 bg-solar-500 text-navy-900" : "border-mist-200 bg-white text-mist-500"}`}>
            {mine ? "Showing mine" : "Show only mine"}
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="New leads" value={newLeads} href="#/pipeline" />
        <Stat label="Quotes out" value={quotesOut} sub={fmtMoney(pipelineValue)} href="#/pipeline" />
        <Stat label="Won this month" value={wonThisMonth} href="#/pipeline" />
        <Stat label="Customers" value={db.customers.length} href="#/customers" />
      </div>

      <div className="mt-4"><AssignLeads /></div>

      {overdue.length > 0 && (
        <>
          <SectionTitle>Overdue ({overdue.length})</SectionTitle>
          <div className="space-y-2">{overdue.map((x) => <TaskRow key={x.id} task={x} onEdit={setEdit} />)}</div>
        </>
      )}

      <SectionTitle action={<a href="#/tasks" className="text-sm font-semibold text-navy-600">All follow-ups</a>}>Today</SectionTitle>
      {dueToday.length > 0 ? (
        <div className="space-y-2">{dueToday.map((x) => <TaskRow key={x.id} task={x} onEdit={setEdit} />)}</div>
      ) : (
        <Empty
          title={nothing ? "You're all caught up" : "Nothing else due today"}
          hint={db.customers.length === 0 ? "Tap the + button to add your first customer." : "Follow-ups appear here on the day they are due."}
        />
      )}

      {soon.length > 0 && (
        <>
          <SectionTitle>Coming up</SectionTitle>
          <div className="space-y-2">{soon.map((x) => <TaskRow key={x.id} task={x} onEdit={setEdit} />)}</div>
        </>
      )}

      {installs.length > 0 && (
        <>
          <SectionTitle>Upcoming installations</SectionTitle>
          <Card className="divide-y divide-mist-100">
            {installs.map((d) => {
              const c = db.customers.find((x) => x.id === d.customerId);
              return (
                <a key={d.id} href={`#/customers/${d.customerId}`} className="flex items-center gap-3 p-3.5">
                  <span className="grid size-11 place-items-center rounded-xl bg-navy-900 text-solar-400"><Wrench className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c ? fullName(c) : "Customer"} <span className="text-mist-500">· {c?.suburb}</span></span>
                    <span className="block truncate text-sm text-mist-500">{systemSummary(d) || d.title}</span>
                  </span>
                  <span className="text-sm font-bold text-navy-700">{fmtDateShort(d.installDate!)}</span>
                </a>
              );
            })}
          </Card>
        </>
      )}

      {upgrades.length > 0 && (
        <>
          <SectionTitle>
            <span className="inline-flex items-center gap-1"><Sparkles className="size-3.5" /> Upgrade opportunities ({upgradeCustomers.length})</span>
          </SectionTitle>
          <Card className="divide-y divide-mist-100">
            {upgradeCustomers.slice(0, 6).map(([customerId, list]) => {
              const c = db.customers.find((x) => x.id === customerId);
              if (!c) return null;
              return (
                <a key={customerId} href={`#/customers/${c.id}`} className="flex items-center gap-3 p-3.5">
                  <span className="grid size-11 place-items-center rounded-xl bg-solar-300/50 text-solar-700"><ArrowUpRight className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{fullName(c)}</span>
                    <span className="block text-sm text-mist-500">{list.map((u) => u.reason).join(" · ")}</span>
                  </span>
                </a>
              );
            })}
          </Card>
          {upgradeCustomers.length > 6 && <p className="mt-2 px-1 text-xs text-mist-500">+ {upgradeCustomers.length - 6} more - use Specials to email them an offer.</p>}
        </>
      )}

      {db.deals.some((d) => d.stage === "new") && (
        <>
          <SectionTitle>New leads to call</SectionTitle>
          <Card className="divide-y divide-mist-100">
            {db.deals.filter((d) => d.stage === "new").slice(0, 5).map((d) => {
              const c = db.customers.find((x) => x.id === d.customerId);
              return c ? (
                <a key={d.id} href={`#/customers/${c.id}`} className="flex items-center gap-3 p-3.5">
                  <CalendarCheck className="size-5 text-mist-400" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{fullName(c)}<span className="font-normal text-mist-500"> · {c.suburb || c.source}</span></span>
                  <StageBadge stage={d.stage} />
                </a>
              ) : null;
            })}
          </Card>
        </>
      )}

      {edit && <TaskSheet customerId={edit.customerId} task={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: number; sub?: string; href: string }) {
  return (
    <a href={href}>
      <Card className="p-4 transition hover:border-solar-500">
        <div className="text-3xl font-extrabold tracking-tight">{value}</div>
        <div className="text-sm font-medium text-mist-500">{label}</div>
        {sub && <div className="text-xs font-semibold text-navy-600">{sub}</div>}
      </Card>
    </a>
  );
}
