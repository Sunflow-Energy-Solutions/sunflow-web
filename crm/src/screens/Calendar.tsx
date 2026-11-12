import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Download, Phone, Plus, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskSheet } from "../components/forms";
import { Button, Card, Empty, PageHeader, Select, Sheet } from "../components/ui";
import { KIND_STYLE, buildEvents, buildIcs, type CalEvent } from "../events";
import { useStore } from "../store";
import { addDays, dayLong, download, fmtTime, fullName, monthGrid, monthTitle, shiftMonth, startOfWeek, telHref, today } from "../utils";

type View = "month" | "week" | "agenda";
type Filter = "all" | "install" | "visit" | "followup";

const VIEW_KEY = "sunflow-crm-calendar-view";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Calendar() {
  const { db, me } = useStore();
  const [view, setView] = useState<View>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as View) || "month"; } catch { return "month"; }
  });
  const [anchor, setAnchor] = useState(today());
  const [selected, setSelected] = useState(today());
  const [filter, setFilter] = useState<Filter>("all");
  const [mine, setMine] = useState(false);
  const [addOn, setAddOn] = useState<string | null>(null);

  const all = useMemo(() => buildEvents(db, mine ? me.staffId : null), [db, mine, me.staffId]);
  const events = useMemo(
    () => all.filter((e) => filter === "all" || (filter === "install" ? e.kind === "install" : filter === "visit" ? e.kind === "visit" : e.kind !== "install" && e.kind !== "visit")),
    [all, filter],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    events.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]));
    return m;
  }, [events]);

  function pickView(v: View) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* optional preference */ }
  }

  const step = (n: number) => {
    if (view === "month") setAnchor(shiftMonth(anchor, n));
    else setAnchor(addDays(7 * n, anchor));
  };
  const goToday = () => { setAnchor(today()); setSelected(today()); };

  const weekStart = startOfWeek(anchor);
  const heading = view === "month" ? monthTitle(anchor) : view === "week" ? `Week of ${dayLong(weekStart).replace(/^\w+,? /, "")}` : "Coming up";

  return (
    <>
      <PageHeader
        title="Calendar"
        sub="Installs, site visits and follow-ups"
        right={<Button size="sm" onClick={() => setAddOn(selected)}><Plus className="size-4" /> Add</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-mist-100 p-1" role="tablist" aria-label="Calendar view">
          {(["month", "week", "agenda"] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => pickView(v)} className={clsx("min-h-9 rounded-lg px-3.5 text-sm font-semibold capitalize", view === v ? "bg-white text-navy-900 shadow-sm" : "text-mist-500")}>
              {v === "agenda" ? "Upcoming" : v}
            </button>
          ))}
        </div>
        {view !== "agenda" && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => step(-1)} aria-label="Previous" className="grid size-10 place-items-center rounded-full hover:bg-mist-100"><ChevronLeft className="size-5" /></button>
            <button onClick={goToday} className="min-h-9 rounded-full px-3 text-sm font-semibold text-navy-600 hover:bg-mist-100">Today</button>
            <button onClick={() => step(1)} aria-label="Next" className="grid size-10 place-items-center rounded-full hover:bg-mist-100"><ChevronRight className="size-5" /></button>
          </div>
        )}
      </div>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {([["all", "Everything"], ["install", "Installs"], ["visit", "Site visits"], ["followup", "Follow-ups"]] as [Filter, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={clsx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold", filter === id ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 bg-white text-mist-500")}>{label}</button>
        ))}
        {me.staffId && !me.isLimited && (
          <button onClick={() => setMine(!mine)} className={clsx("min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold", mine ? "border-solar-600 bg-solar-500 text-navy-900" : "border-mist-200 bg-white text-mist-500")}>Only mine</button>
        )}
      </div>

      {view !== "agenda" && <h2 className="mb-2 px-1 text-lg font-extrabold">{heading}</h2>}

      {view === "month" && (
        <MonthView anchor={anchor} byDate={byDate} selected={selected} onSelect={setSelected} onAdd={setAddOn} />
      )}
      {view === "week" && <WeekView start={weekStart} byDate={byDate} onAdd={setAddOn} />}
      {view === "agenda" && <Agenda events={events} />}

      <div className="mt-6 text-center">
        <button
          onClick={() => download("sunflow-calendar.ics", buildIcs(db, events.filter((e) => e.date >= today())), "text/calendar")}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-navy-600"
        >
          <Download className="size-4" /> Add upcoming events to my phone calendar (.ics)
        </button>
        <p className="mt-0.5 text-xs text-mist-400">A snapshot of what's here now. Download again to refresh it.</p>
      </div>

      {addOn && <Schedule date={addOn} onClose={() => setAddOn(null)} />}
    </>
  );
}

/* ---------------------------------------------------------------- month */

function MonthView({ anchor, byDate, selected, onSelect, onAdd }: { anchor: string; byDate: Map<string, CalEvent[]>; selected: string; onSelect: (d: string) => void; onAdd: (d: string) => void }) {
  const cells = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const t = today();
  const sel = byDate.get(selected) ?? [];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-mist-100 bg-mist-50 text-center text-[11px] font-bold uppercase tracking-wide text-mist-500">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const evs = byDate.get(d) ?? [];
            const installs = evs.filter((e) => e.kind === "install" && !e.done).length;
            const open = evs.filter((e) => !e.done);
            return (
              <button
                key={d}
                onClick={() => onSelect(d)}
                onDoubleClick={() => onAdd(d)}
                aria-label={`${dayLong(d)}, ${evs.length} item${evs.length === 1 ? "" : "s"}`}
                aria-pressed={d === selected}
                className={clsx(
                  "relative min-h-[3.75rem] border-b border-r border-mist-100 p-1 text-left md:min-h-24 md:p-1.5",
                  i % 7 === 6 && "border-r-0", i >= 35 && "border-b-0",
                  d.slice(0, 7) !== month && "bg-mist-50/60 text-mist-400",
                  d === selected && "bg-solar-300/30",
                )}
              >
                <span className={clsx("inline-grid size-6 place-items-center rounded-full text-xs font-bold md:text-sm", d === t && "bg-navy-900 text-white")}>{Number(d.slice(8))}</span>
                {installs > 1 && <span className="absolute right-1 top-1 rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800 md:text-[10px]" title="More than one install this day">{installs} installs</span>}
                {/* phone: coloured dots */}
                <span className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                  {open.slice(0, 6).map((e) => <span key={e.key} className={clsx("size-1.5 rounded-full", KIND_STYLE[e.kind].dot)} />)}
                </span>
                {/* desktop: short chips */}
                <span className="mt-0.5 hidden space-y-0.5 md:block">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.key} className={clsx("block truncate rounded px-1 text-[11px] font-semibold", KIND_STYLE[e.kind].chip, e.done && "line-through opacity-50")}>
                      {fmtTime(e.time) && `${fmtTime(e.time)} `}{e.title}
                    </span>
                  ))}
                  {evs.length > 3 && <span className="block px-1 text-[11px] font-semibold text-mist-500">+{evs.length - 3} more</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mb-2 mt-5 flex items-center justify-between px-1">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-mist-500">{dayLong(selected)}</h3>
        <button onClick={() => onAdd(selected)} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-navy-600"><Plus className="size-4" /> Add</button>
      </div>
      {sel.length === 0 ? <Empty title="Nothing on this day" hint="Tap Add to schedule a site visit, call or install." /> : <EventList events={sel} />}
    </>
  );
}

/* ----------------------------------------------------------------- week */

function WeekView({ start, byDate, onAdd }: { start: string; byDate: Map<string, CalEvent[]>; onAdd: (d: string) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(i, start));
  const t = today();
  return (
    <div className="space-y-3 md:grid md:grid-cols-7 md:gap-2 md:space-y-0">
      {days.map((d, i) => {
        const evs = byDate.get(d) ?? [];
        const weekend = i >= 5;
        return (
          <section key={d} className={clsx("rounded-2xl border bg-white p-2.5 md:min-h-56", d === t ? "border-solar-600 ring-1 ring-solar-500" : "border-mist-200", weekend && evs.length === 0 && "opacity-70")}>
            <header className="mb-2 flex items-center justify-between">
              <h3 className={clsx("text-sm font-bold", d === t && "text-solar-700")}>
                {WEEKDAYS[i]} <span className="text-mist-500">{Number(d.slice(8))}</span>
                {d === t && <span className="ml-1.5 rounded bg-solar-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">TODAY</span>}
              </h3>
              <button onClick={() => onAdd(d)} aria-label={`Add on ${dayLong(d)}`} className="grid size-8 place-items-center rounded-full text-mist-400 hover:bg-mist-100"><Plus className="size-4" /></button>
            </header>
            {evs.length === 0 ? <p className="px-1 pb-1 text-xs text-mist-400">Nothing booked</p> : <EventList events={evs} compact />}
          </section>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- agenda */

function Agenda({ events }: { events: CalEvent[] }) {
  const t = today();
  const overdue = events.filter((e) => e.date < t && !e.done && e.kind !== "install");
  const upcoming = events.filter((e) => e.date >= t && e.date <= addDays(90, t));
  const groups = new Map<string, CalEvent[]>();
  upcoming.forEach((e) => groups.set(e.date, [...(groups.get(e.date) ?? []), e]));

  return (
    <>
      {overdue.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-red-600">Overdue ({overdue.length})</h3>
          <EventList events={overdue} showDate />
        </section>
      )}
      {groups.size === 0 ? (
        <Empty title="Nothing scheduled in the next 90 days" hint="Add installs on a job's Edit screen, or schedule visits and calls with Add." />
      ) : (
        [...groups.entries()].map(([d, evs]) => (
          <section key={d} className="mb-5">
            <h3 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-wide text-mist-500">{d === t ? "Today · " : ""}{dayLong(d)}</h3>
            <EventList events={evs} />
          </section>
        ))
      )}
    </>
  );
}

/* ----------------------------------------------------------- shared bits */

function EventList({ events, compact, showDate }: { events: CalEvent[]; compact?: boolean; showDate?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {events.map((e) => <EventRow key={e.key} e={e} compact={compact} showDate={showDate} />)}
    </ul>
  );
}

function EventRow({ e, compact, showDate }: { e: CalEvent; compact?: boolean; showDate?: boolean }) {
  const { db, completeTask } = useStore();
  const c = db.customers.find((x) => x.id === e.customerId);
  const isTask = !!e.task;

  return (
    <li className={clsx("flex items-center gap-2.5 rounded-xl border border-mist-200 bg-white", compact ? "p-2" : "p-2.5", e.done && "opacity-55")}>
      {isTask ? (
        <button onClick={() => completeTask(e.task!.id, !e.done)} aria-label={e.done ? "Mark not done" : "Mark done"} className={clsx("grid shrink-0 place-items-center rounded-full border-2", compact ? "size-8" : "size-10", e.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-mist-300 text-transparent hover:text-emerald-500")}>
          <Check className="size-4" strokeWidth={3} />
        </button>
      ) : (
        <span className={clsx("grid shrink-0 place-items-center rounded-full text-white", compact ? "size-8" : "size-10", KIND_STYLE.install.dot)}><Wrench className="size-4" /></span>
      )}
      <a href={`#/customers/${e.customerId}`} className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-mist-500">
          <span className={clsx("rounded px-1.5 py-px", KIND_STYLE[e.kind].chip)}>{e.label}{e.day ? ` ${e.day.n}/${e.day.of}` : ""}</span>
          {e.time && <span>{fmtTime(e.time)}</span>}
          {showDate && <span>{dayLong(e.date)}</span>}
          {e.tentative && <span className="text-amber-700">date not confirmed</span>}
        </span>
        <span className={clsx("block truncate font-semibold", compact && "text-sm", e.done && "line-through")}>{e.title}</span>
        {!compact && e.sub && <span className="block truncate text-sm text-mist-500">{e.sub}</span>}
      </a>
      {!compact && c?.phone && !e.done && (
        <a href={telHref(c.phone)} aria-label={`Call ${fullName(c)}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-solar-500 text-navy-900"><Phone className="size-4" /></a>
      )}
    </li>
  );
}

/** Choose a customer, then fill in the follow-up / visit details. */
function Schedule({ date, onClose }: { date: string; onClose: () => void }) {
  const { db } = useStore();
  const [cid, setCid] = useState("");
  if (cid) return <TaskSheet customerId={cid} initialDue={date} onClose={onClose} />;

  const list = [...db.customers].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  return (
    <Sheet title={`Add on ${dayLong(date)}`} onClose={onClose}>
      {list.length === 0 ? (
        <p className="text-sm text-mist-500">Add a customer first (the + button), then schedule things for them.</p>
      ) : (
        <div className="space-y-3">
          <label className="block text-[13px] font-semibold text-navy-700">Who is it for?</label>
          <Select value={cid} onChange={(e) => setCid(e.target.value)} autoFocus>
            <option value="">Choose a customer...</option>
            {list.map((c) => <option key={c.id} value={c.id}>{fullName(c)}{c.suburb ? ` - ${c.suburb}` : ""}</option>)}
          </Select>
          <p className="text-xs text-mist-500">Next you'll pick what it is (site visit, call, install...) and the time. To book an install, open the customer and set the install date on their job.</p>
        </div>
      )}
    </Sheet>
  );
}
