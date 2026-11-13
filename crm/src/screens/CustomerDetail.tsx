import { ArrowLeft, CalendarPlus, Check, Copy, ExternalLink, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Checklist from "../components/Checklist";
import Files from "../components/Files";
import { ThankYouSheet } from "../components/ThankYou";
import { CustomerSheet, DealSheet, LostSheet, QuoteSheet, TaskSheet, XeroSheet } from "../components/forms";
import { outstandingRequired } from "../checklist";
import { useXeroStatus } from "../xero";
import { TaskRow } from "../components/rows";
import { Avatar, Button, Card, Empty, Input, SectionTitle, Select, StageBadge } from "../components/ui";
import { useStore } from "../store";
import { STAGES, type Customer, type Deal, type Note, type Stage, type Task } from "../types";
import { KIND_STYLE, buildEvents } from "../events";
import { fmtDate, fmtDateShort, fmtMoney, fmtTime, fullName, mapsHref, pylonLink, relativeDay, smsHref, systemSummary, telHref, today } from "../utils";

export default function CustomerDetail({ id }: { id: string }) {
  const { db, me, deleteCustomer, addNote, deleteNote } = useStore();
  const c = db.customers.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [dealSheet, setDealSheet] = useState<{ deal?: Deal } | null>(null);
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; dealId?: string | null } | null>(null);
  const [quoteFor, setQuoteFor] = useState<Deal | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteKind, setNoteKind] = useState<Note["kind"]>("note");

  if (!c) {
    return (
      <Empty title="Customer not found" hint="They may have been deleted, or are still syncing from another device." action={<Button onClick={() => (location.hash = "#/customers")}>Back to customers</Button>} />
    );
  }

  const deals = db.deals.filter((d) => d.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tasks = db.tasks.filter((t) => t.customerId === id);
  const open = tasks.filter((t) => !t.done).sort((a, b) => a.due.localeCompare(b.due));
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "")).slice(0, 3);
  const notes = db.notes.filter((n) => n.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const upcoming = buildEvents(db).filter((e) => e.customerId === id && !e.done && e.date >= today()).slice(0, 8);

  function addLogged() {
    if (!noteText.trim()) return;
    addNote({ customerId: id, kind: noteKind, text: noteText.trim() });
    setNoteText("");
  }

  return (
    <>
      <a href="#/customers" className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-navy-600">
        <ArrowLeft className="size-4" /> Customers
      </a>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Avatar c={c} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{fullName(c)}</h1>
            <p className="truncate text-sm text-mist-500">{[c.kind, c.suburb, c.source].filter(Boolean).join(" · ")}</p>
          </div>
          <Button variant="soft" size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Action href={c.phone ? telHref(c.phone) : undefined} icon={<Phone className="size-5" />} label="Call" primary />
          <Action href={c.phone ? smsHref(c.phone) : undefined} icon={<MessageSquare className="size-5" />} label="Text" />
          <Action href={c.email ? `mailto:${c.email}` : undefined} icon={<Mail className="size-5" />} label="Email" />
          <Action href={c.address || c.suburb ? mapsHref(c) : undefined} icon={<MapPin className="size-5" />} label="Map" external />
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          {c.phone && <Row k="Phone" v={c.phone} />}
          {c.email && <Row k="Email" v={c.email} />}
          {(c.address || c.postcode) && <Row k="Address" v={[c.address, c.suburb, [c.state, c.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />}
          {c.assignedTo && db.staff.find((s) => s.id === c.assignedTo) && <Row k="Looked after by" v={db.staff.find((s) => s.id === c.assignedTo)!.name} />}
          <Row k="Marketing" v={c.unsubscribed ? "Unsubscribed" : c.marketingConsent ? "OK to email specials" : "No consent recorded"} />
          {c.notes && <Row k="Notes" v={c.notes} />}
        </dl>
      </Card>

      <SectionTitle action={<button onClick={() => setDealSheet({})} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-navy-600"><Plus className="size-4" /> Add system</button>}>
        Systems &amp; quotes
      </SectionTitle>
      {deals.length === 0 ? (
        <Empty title="No system chosen yet" hint="Add the system they're interested in so quotes and follow-ups are tracked." action={<Button onClick={() => setDealSheet({})}>Add system</Button>} />
      ) : (
        <div className="space-y-3">
          {deals.map((d) => <DealCard key={d.id} deal={d} customer={c} onEdit={() => setDealSheet({ deal: d })} onQuote={() => setQuoteFor(d)} onTask={() => setTaskSheet({ dealId: d.id })} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionTitle action={<a href="#/calendar" className="text-sm font-semibold text-navy-600">Open calendar</a>}>Coming up</SectionTitle>
          <Card className="divide-y divide-mist-100">
            {upcoming.map((e) => (
              <div key={e.key} className="flex items-center gap-3 p-3">
                <span className={`rounded px-2 py-1 text-xs font-bold ${KIND_STYLE[e.kind].chip}`}>{e.label}{e.day ? ` ${e.day.n}/${e.day.of}` : ""}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{fmtDateShort(e.date)}{e.time ? ` · ${fmtTime(e.time)}` : ""}{e.tentative ? " · date not confirmed" : ""}</span>
                  {e.sub && <span className="block truncate text-xs text-mist-500">{e.sub}</span>}
                </span>
                <span className="text-xs font-semibold text-mist-500">{relativeDay(e.date)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Photos &amp; documents</SectionTitle>
      <Files customerId={id} />

      <SectionTitle action={<button onClick={() => setTaskSheet({})} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-navy-600"><CalendarPlus className="size-4" /> Add follow-up</button>}>
        Follow-ups
      </SectionTitle>
      {open.length === 0 ? (
        <Empty title="No follow-ups scheduled" hint="Every customer should have a next step. Add one." />
      ) : (
        <div className="space-y-2">{open.map((t) => <TaskRow key={t.id} task={t} showCustomer={false} onEdit={(x) => setTaskSheet({ task: x })} />)}</div>
      )}
      {done.length > 0 && (
        <div className="mt-2 space-y-2">{done.map((t) => <TaskRow key={t.id} task={t} showCustomer={false} onEdit={(x) => setTaskSheet({ task: x })} />)}</div>
      )}

      <SectionTitle>History</SectionTitle>
      <Card className="p-3">
        <div className="mb-2 flex gap-2">
          <Select value={noteKind} onChange={(e) => setNoteKind(e.target.value as Note["kind"])} className="w-32 shrink-0" aria-label="Type">
            <option value="note">Note</option>
            <option value="call">Call</option>
            <option value="visit">Visit</option>
            <option value="email">Email</option>
          </Select>
          <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLogged()} placeholder="What happened?" />
          <Button onClick={addLogged} disabled={!noteText.trim()}>Add</Button>
        </div>
        {notes.length === 0 ? (
          <p className="px-1 py-3 text-sm text-mist-500">Calls, visits and notes you log appear here.</p>
        ) : (
          <ul className="divide-y divide-mist-100">
            {notes.map((n) => (
              <li key={n.id} className="group flex gap-3 px-1 py-2.5">
                <span className="mt-0.5 w-14 shrink-0 text-[11px] font-bold uppercase tracking-wide text-mist-400">{n.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className={n.kind === "system" ? "text-sm text-mist-500" : "text-[15px]"}>{n.text}</span>
                  <span className="block text-xs text-mist-400">{fmtDate(n.createdAt)} {new Date(n.createdAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</span>
                </span>
                {n.kind !== "system" && (
                  <button onClick={() => deleteNote(n.id)} aria-label="Delete note" className="grid size-8 place-items-center rounded-full text-mist-300 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {me.isAdmin && (
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              if (confirm(`Delete ${fullName(c)} and everything recorded about them, including photos and documents? This cannot be undone.`)) {
                deleteCustomer(id);
                location.hash = "#/customers";
              }
            }}
            className="min-h-10 text-sm font-semibold text-red-600"
          >
            Delete this customer
          </button>
        </div>
      )}

      {editing && <CustomerSheet customer={c} onClose={() => setEditing(false)} />}
      {dealSheet && <DealSheet customerId={id} deal={dealSheet.deal} onClose={() => setDealSheet(null)} />}
      {quoteFor && <QuoteSheet deal={quoteFor} onClose={() => setQuoteFor(null)} />}
      {taskSheet && <TaskSheet customerId={id} dealId={taskSheet.dealId} task={taskSheet.task} onClose={() => setTaskSheet(null)} />}
    </>
  );
}

function Action({ href, icon, label, primary, external }: { href?: string; icon: React.ReactNode; label: string; primary?: boolean; external?: boolean }) {
  const cls = `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold ${primary ? "bg-solar-500 text-navy-900" : "bg-mist-100 text-navy-800"}`;
  if (!href) return <span className={`${cls} opacity-40`}>{icon}{label}</span>;
  return <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{icon}{label}</a>;
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-3"><dt className="w-20 shrink-0 text-mist-500">{k}</dt><dd className="min-w-0 break-words font-medium">{v}</dd></div>
);

function DealCard({ deal, customer, onEdit, onQuote, onTask }: { deal: Deal; customer: Customer; onEdit: () => void; onQuote: () => void; onTask: () => void }) {
  const { moveDeal, deleteDeal, updateDeal, addNote, me } = useStore();
  const pylon = pylonLink(customer, deal);
  const [lost, setLost] = useState(false);
  const [xeroOpen, setXeroOpen] = useState(false);
  const [thanksOpen, setThanksOpen] = useState(false);
  const { refreshChecklist } = useStore();
  // Jobs won outside the app (e.g. a customer e-signs in Pylon) arrive without a checklist: set it up when the job is opened.
  useEffect(() => {
    refreshChecklist(deal.id);
  }, [deal.id, deal.stage, deal.system.solarKw, deal.system.batteryKwh, deal.system.evCharger, refreshChecklist]);
  const xeroStatus = useXeroStatus();
  const invoiced = (deal.xero ?? []).reduce((n, x) => n + x.amount, 0);

  function move(stage: Stage) {
    if (stage === deal.stage) return;
    if (stage === "lost") return setLost(true);
    if (stage === "installed") {
      const left = outstandingRequired(deal);
      if (left.length && !confirm(`${left.length} required paperwork item${left.length > 1 ? "s are" : " is"} not ticked yet:\n\n- ${left.slice(0, 6).map((i) => i.label).join("\n- ")}${left.length > 6 ? "\n- ..." : ""}\n\nMark as installed anyway?`)) return;
    }
    moveDeal(deal.id, stage);
    if (stage === "won" && xeroStatus.connected && !me.isLimited && deal.value) setXeroOpen(true);
    if (stage === "installed" && !deal.thanks) setThanksOpen(true);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{deal.title || "System"}</p>
          <p className="text-sm text-mist-500">{systemSummary(deal) || "System details not entered yet"}</p>
          {deal.source && <p className="text-xs font-semibold text-navy-600">Came from: {deal.source}{deal.campaign ? ` - ${deal.campaign}` : ""}</p>}
        </div>
        <StageBadge stage={deal.stage} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {deal.value != null && <Pair k="Price" v={fmtMoney(deal.value)} />}
        <label className="contents">
          <span className="text-mist-500">Install date</span>
          <input type="date" value={deal.installDate ?? ""} onChange={(e) => updateDeal(deal.id, { installDate: e.target.value || null })} className="min-h-9 rounded-lg border border-mist-200 px-2 font-medium" />
        </label>
        {deal.installedOn && <Pair k="Installed" v={fmtDate(deal.installedOn)} />}
        {deal.stage === "lost" && deal.lostReason && <Pair k="Lost because" v={deal.lostReason} />}
      </div>

      {deal.quotes.length > 0 && (
        <ul className="mt-3 divide-y divide-mist-100 rounded-xl bg-mist-50 px-3 text-sm">
          {deal.quotes.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2 py-2">
              <span><b>{q.number}</b> <span className="text-mist-500">· {fmtDate(q.date)}</span></span>
              <span className="flex items-center gap-2 font-semibold">
                {fmtMoney(q.amount)}
                <select
                  value={q.status}
                  onChange={(e) => updateDeal(deal.id, { quotes: deal.quotes.map((x) => (x.id === q.id ? { ...x, status: e.target.value as typeof q.status } : x)) })}
                  className="rounded-lg border border-mist-200 bg-white px-1.5 py-1 text-xs"
                  aria-label={`Status of ${q.number}`}
                >
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                </select>
              </span>
            </li>
          ))}
        </ul>
      )}

      {deal.pylon && (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Customer signed this design in Pylon on {fmtDate(deal.pylon.signedAt)} - details above came from the signed proposal.
        </p>
      )}

      {deal.equipment && deal.equipment.length > 0 && (
        <div className="mt-3 rounded-xl bg-mist-50 px-3 py-2.5 text-sm">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-mist-500">Equipment on the signed design</div>
          <ul className="divide-y divide-mist-100">
            {deal.equipment.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-1.5">
                <span className="min-w-0"><span className="text-xs text-mist-500">{e.category}</span><br /><span className="font-medium">{e.description || "(no description)"}</span>{e.sku ? <span className="text-xs text-mist-500"> · {e.sku}</span> : null}</span>
                <span className="shrink-0 font-bold tabular-nums">x {e.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!["new", "lost"].includes(deal.stage) && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-mist-50 px-3 py-2 text-xs text-mist-500">
          <span className="flex-1">CRM job ID for Bridge Select (paste into External Software Package ID): <b className="select-all break-all text-navy-900">{deal.id}</b></span>
          <CopyButton text={deal.id} />
        </div>
      )}

      {(deal.site || deal.install) && <SiteSummary deal={deal} />}

      {["won", "installed"].includes(deal.stage) && xeroStatus.connected && !me.isLimited && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-mist-50 px-3 py-2.5 text-sm">
          <span className="flex-1 text-mist-500">
            {deal.xero?.length ? <>Xero drafts: <b className="text-navy-900">{fmtMoney(invoiced)}</b> of {fmtMoney(deal.value)}</> : "No Xero invoice yet"}
          </span>
          {deal.xero?.map((x, i) => <a key={x.invoiceId} href={x.url} target="_blank" rel="noreferrer" className="font-semibold text-navy-600 underline">Invoice {i + 1}</a>)}
          <Button size="sm" variant="soft" onClick={() => setXeroOpen(true)}>{deal.xero?.length ? "Another invoice" : "Create Xero invoice"}</Button>
        </div>
      )}

      {deal.stage === "installed" && (
        <div className={`mt-3 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${deal.thanks ? "bg-emerald-50" : "bg-solar-300/30"}`}>
          <span className={`flex-1 ${deal.thanks ? "text-emerald-800" : "font-semibold text-navy-900"}`}>
            {deal.thanks ? `Thank-you sent ${fmtDate(deal.thanks.sentAt)} (${deal.thanks.channels.join(" + ")})` : "Job complete? Thank them and ask for a review."}
          </span>
          <Button size="sm" variant={deal.thanks ? "soft" : "primary"} onClick={() => setThanksOpen(true)}>{deal.thanks ? "Send again" : "Thank you & review"}</Button>
        </div>
      )}

      <Checklist deal={deal} customer={customer} />

      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-mist-500">Move to stage</label>
        <Select value={deal.stage} onChange={(e) => move(e.target.value as Stage)}>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label} - {s.hint}</option>)}
        </Select>
      </div>

      {deal.stage !== "lost" && deal.stage !== "installed" && (
        <div className="mt-3">
          {deal.pylonUrl ? (
            <a href={deal.pylonUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 text-[15px] font-semibold text-white">
              <ExternalLink className="size-4" /> Open design in Pylon
            </a>
          ) : pylon ? (
            <a
              href={pylon}
              target="_blank"
              rel="noreferrer"
              onClick={() => addNote({ customerId: deal.customerId, dealId: deal.id, kind: "system", text: "Opened in Pylon to start the design" })}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 text-[15px] font-semibold text-white"
            >
              <ExternalLink className="size-4" /> Design in Pylon
            </a>
          ) : (
            <p className="rounded-xl bg-mist-50 px-3 py-2 text-xs text-mist-500">Add the customer's address or suburb to design this in Pylon with their details filled in.</p>
          )}
          {!deal.pylonUrl && pylon && <p className="mt-1 text-xs text-mist-500">Opens Pylon at their address with name, phone and email filled in. Afterwards, paste the project link into Edit so you can jump straight back.</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="dark" onClick={onQuote}>Log quote sent</Button>
        <Button size="sm" variant="soft" onClick={onTask}>Follow-up</Button>
        <Button size="sm" variant="soft" onClick={onEdit}>Edit</Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => confirm("Delete this system and its follow-ups?") && deleteDeal(deal.id)}
          aria-label="Delete system"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {thanksOpen && <ThankYouSheet deal={deal} customer={customer} onClose={() => setThanksOpen(false)} />}
      {xeroOpen && <XeroSheet deal={deal} customer={customer} onClose={() => setXeroOpen(false)} />}
      {lost && (
        <LostSheet
          onClose={() => setLost(false)}
          onConfirm={(reason) => {
            moveDeal(deal.id, "lost", { lostReason: reason });
            setLost(false);
          }}
        />
      )}
    </Card>
  );
}

const Pair = ({ k, v }: { k: string; v: string }) => (
  <>
    <span className="text-mist-500">{k}</span>
    <span className="font-semibold">{v}</span>
  </>
);

/** Compact read-out of the site details and install record entered under Edit. */
/** Copies text and says so: the button turns green and reads "Copied" for two seconds. */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { alert("Could not copy automatically. Press and hold the ID to copy it."); }
  }
  return (
    <button type="button" onClick={copy} aria-live="polite" className={done ? "inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white" : "inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-mist-100 px-3 text-sm font-semibold text-navy-900 hover:bg-mist-200"}>
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function SiteSummary({ deal }: { deal: Deal }) {
  const s = deal.site;
  const i = deal.install;
  const site = s ? [s.roofType, s.phase && `${s.phase} phase`, s.distributor, s.nmi && `NMI ${s.nmi}`, s.retailer].filter(Boolean).join(" · ") : "";
  const kit = i
    ? [i.panelCount && `${i.panelCount} x ${i.panelModel || "panels"}`, i.inverterSerial && `Inverter S/N ${i.inverterSerial}`, i.batterySerial && `Battery S/N ${i.batterySerial}`, i.cesNumber && `CES ${i.cesNumber}`, i.installer && `Electrician ${i.installer}`].filter(Boolean).join(" · ")
    : "";
  if (!site && !kit) return null;
  return (
    <div className="mt-3 space-y-1 rounded-xl bg-mist-50 px-3 py-2.5 text-xs text-mist-500">
      {site && <p><b className="text-navy-700">Site:</b> {site}</p>}
      {kit && <p><b className="text-navy-700">Installed:</b> {kit}</p>}
    </div>
  );
}
