import { useState } from "react";
import { CATALOGUE_BRANDS } from "../catalogue.generated";
import { installClashes } from "../events";
import { useStore } from "../store";
import { xeroCall } from "../xero";
import {
  AU_STATES, SOURCES, TASK_KINDS, emptyInstall, emptySite, emptySystem,
  type Customer, type Deal, type InstallRecord, type Quote, type SiteDetails, type Task, type TaskKind,
} from "../types";
import { addDays, fullName, today, uid } from "../utils";
import AddressInput from "./AddressInput";
import { Button, Check, Field, Input, Select, Sheet, Textarea, inputCls } from "./ui";

const HAS_PLACES = !!import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

/** Brand suggestions come from the Sunflow supplier catalogue (scripts/import-brands.mjs). Any other brand can still be typed. */
function BrandLists() {
  const lists = { "brands-panel": CATALOGUE_BRANDS.panels, "brands-battery": CATALOGUE_BRANDS.batteries, "brands-inverter": CATALOGUE_BRANDS.inverters, "brands-ev": CATALOGUE_BRANDS.evChargers };
  return (
    <>
      {Object.entries(lists).map(([id, brands]) => (
        <datalist key={id} id={id}>
          {brands.map((b) => <option key={b} value={b} />)}
        </datalist>
      ))}
    </>
  );
}

const num = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? null : Number(s));

/* ---------------------------------------------------------------- customer */

/** Quick add: just a name and a phone number is enough. Everything else is optional. */
export function CustomerSheet({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved?: (c: Customer) => void }) {
  const { addCustomer, updateCustomer, addDeal, db, me } = useStore();
  const [f, setF] = useState({
    assignedTo: customer?.assignedTo ?? me.staffId,
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    suburb: customer?.suburb ?? "",
    postcode: customer?.postcode ?? "",
    state: customer?.state ?? "VIC",
    kind: customer?.kind ?? ("Residential" as Customer["kind"]),
    source: customer?.source ?? "Phone call",
    notes: customer?.notes ?? "",
    marketingConsent: customer?.marketingConsent ?? false,
  });
  const [interest, setInterest] = useState({ solar: false, battery: false, ev: false });
  const [more, setMore] = useState(!!customer);
  const [err, setErr] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const anyInterest = interest.solar || interest.battery || interest.ev;

  const duplicate =
    !customer && f.phone.replace(/\D/g, "").length >= 8
      ? db.customers.find((c) => c.phone.replace(/\D/g, "") === f.phone.replace(/\D/g, ""))
      : undefined;

  function save() {
    if (!f.firstName.trim() && !f.lastName.trim()) return setErr("Please enter a name.");
    if (!f.phone.trim() && !f.email.trim()) return setErr("Add a phone number or an email so you can reach them.");
    if (customer) {
      updateCustomer(customer.id, f);
      onSaved?.({ ...customer, ...f });
    } else {
      const c = addCustomer(f);
      if (anyInterest) {
        const parts = [interest.solar && "Solar", interest.battery && "Battery", interest.ev && "EV charger"].filter(Boolean).join(" + ");
        addDeal(c.id, {
          title: parts,
          system: {
            ...emptySystem(),
            solarKw: interest.solar ? 0 : null,
            batteryKwh: interest.battery ? 0 : null,
            evCharger: interest.ev ? "TBC" : "",
          },
        });
      }
      onSaved?.(c);
    }
    onClose();
  }

  return (
    <Sheet
      title={customer ? "Edit customer" : "New customer"}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-[2]" onClick={save}>{customer ? "Save changes" : "Save customer"}</Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><Input autoFocus value={f.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="off" /></Field>
          <Field label="Last name"><Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="off" /></Field>
        </div>
        <Field label="Mobile / phone">
          <Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0412 345 678" />
        </Field>
        {duplicate && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This number already belongs to <b>{fullName(duplicate)}</b>. Open them instead of adding a duplicate?
            <a href={`#/customers/${duplicate.id}`} onClick={onClose} className="ml-1 font-semibold underline">Open</a>
          </p>
        )}
        <Field label="Email"><Input type="email" inputMode="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoCapitalize="off" /></Field>
        <Field label="Street address" hint={HAS_PLACES ? "Start typing and pick the address - suburb, state and postcode fill in for you." : undefined}>
          <AddressInput
            value={f.address}
            onChange={(v) => set("address", v)}
            onSelect={(p) => setF((x) => ({ ...x, address: p.street || x.address, suburb: p.suburb || x.suburb, state: AU_STATES.includes(p.state) ? p.state : x.state, postcode: p.postcode || x.postcode }))}
            className={inputCls}
            placeholder="e.g. 12 Smith Street"
          />
        </Field>
        <div className="grid grid-cols-[1fr_5.5rem_6.5rem] gap-3">
          <Field label="Suburb"><Input value={f.suburb} onChange={(e) => set("suburb", e.target.value)} /></Field>
          <Field label="State">
            <Select value={f.state} onChange={(e) => set("state", e.target.value)} className="px-2">
              {AU_STATES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Postcode"><Input inputMode="numeric" value={f.postcode} onChange={(e) => set("postcode", e.target.value)} maxLength={4} /></Field>
        </div>

        {!customer && (
          <div>
            <span className="mb-1 block text-[13px] font-semibold text-navy-700">What are they interested in?</span>
            <div className="grid grid-cols-3 gap-2">
              {([["solar", "Solar"], ["battery", "Battery"], ["ev", "EV charger"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setInterest((i) => ({ ...i, [k]: !i[k] }))}
                  className={`min-h-12 rounded-xl border-2 px-2 text-sm font-semibold transition ${interest[k] ? "border-solar-600 bg-solar-300/40 text-navy-900" : "border-mist-200 bg-white text-mist-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-mist-500">Picking one creates an enquiry and a "call them" reminder for today.</p>
          </div>
        )}

        {db.staff.length > 0 && (
          <Field label="Looked after by">
            <Select value={f.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
              <option value="">Nobody yet</option>
              {db.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}

        <Field label="How did they find us?">
          <Select value={f.source} onChange={(e) => set("source", e.target.value)}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>

        <button type="button" onClick={() => setMore(!more)} className="text-sm font-semibold text-navy-600 underline-offset-2 hover:underline">
          {more ? "Hide extra details" : "More details (type, notes, email consent)"}
        </button>
        {more && (
          <div className="space-y-3.5">
            <Field label="Type">
              <Select value={f.kind} onChange={(e) => set("kind", e.target.value as Customer["kind"])}>
                <option>Residential</option>
                <option>Commercial</option>
              </Select>
            </Field>
            <Field label="Notes"><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Roof type, gate code, dog, best time to call..." /></Field>
            <Check
              checked={f.marketingConsent}
              onChange={(v) => set("marketingConsent", v)}
              label="OK to email them specials"
              hint="Only tick if they have agreed (e.g. on the quote form or in person). Specials are only sent to people with this ticked."
            />
          </div>
        )}
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------- deal */

export function DealSheet({ customerId, deal, onClose }: { customerId: string; deal?: Deal; onClose: () => void }) {
  const { addDeal, updateDeal, db } = useStore();
  const s = deal?.system ?? emptySystem();
  const [f, setF] = useState({
    title: deal?.title ?? "",
    solarKw: s.solarKw?.toString() ?? "",
    panelBrand: s.panelBrand,
    batteryKwh: s.batteryKwh?.toString() ?? "",
    batteryBrand: s.batteryBrand,
    inverterBrand: s.inverterBrand,
    evCharger: s.evCharger,
    value: deal?.value?.toString() ?? "",
    installDate: deal?.installDate ?? "",
    installDays: deal?.installDays?.toString() ?? "",
    installedOn: deal?.installedOn ?? "",
    pylonUrl: deal?.pylonUrl ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const clashes = installClashes(db, f.installDate || null, deal?.id);
  const [site, setSite] = useState<SiteDetails>(deal?.site ?? emptySite());
  const [inst, setInst] = useState<InstallRecord>(deal?.install ?? emptyInstall());
  const [showSite, setShowSite] = useState(!!deal?.site);
  const [showInst, setShowInst] = useState(!!deal?.install);
  const setS = <K extends keyof SiteDetails>(k: K, v: SiteDetails[K]) => setSite((x) => ({ ...x, [k]: v }));
  const setI = <K extends keyof InstallRecord>(k: K, v: InstallRecord[K]) => setInst((x) => ({ ...x, [k]: v }));

  function save() {
    const system = {
      solarKw: num(f.solarKw), panelBrand: f.panelBrand.trim(),
      batteryKwh: num(f.batteryKwh), batteryBrand: f.batteryBrand.trim(),
      inverterBrand: f.inverterBrand.trim(), evCharger: f.evCharger.trim(),
    };
    const title =
      f.title.trim() ||
      [system.solarKw && `${system.solarKw}kW solar`, system.batteryKwh && `${system.batteryKwh}kWh battery`, system.evCharger && "EV charger"].filter(Boolean).join(" + ") ||
      "New system";
    const patch = { title, system, value: num(f.value), installDate: f.installDate || null, installDays: num(f.installDays), installedOn: f.installedOn || null, pylonUrl: f.pylonUrl.trim(), site, install: inst };
    if (deal) updateDeal(deal.id, patch);
    else addDeal(customerId, patch);
    onClose();
  }

  return (
    <Sheet
      title={deal ? "Edit system" : "New system / enquiry"}
      onClose={onClose}
      footer={<Button className="w-full" onClick={save}>Save</Button>}
    >
      <BrandLists />
      <div className="space-y-3.5">
        <Field label="Job name (optional)"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 13.2kW + 20kWh Sigenergy" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Solar size (kW)"><Input inputMode="decimal" value={f.solarKw} onChange={(e) => set("solarKw", e.target.value)} placeholder="6.6" /></Field>
          <Field label="Panel brand"><Input list="brands-panel" value={f.panelBrand} onChange={(e) => set("panelBrand", e.target.value)} /></Field>
          <Field label="Battery (kWh)"><Input inputMode="decimal" value={f.batteryKwh} onChange={(e) => set("batteryKwh", e.target.value)} placeholder="10" /></Field>
          <Field label="Battery brand"><Input list="brands-battery" value={f.batteryBrand} onChange={(e) => set("batteryBrand", e.target.value)} /></Field>
        </div>
        <Field label="Inverter brand"><Input list="brands-inverter" value={f.inverterBrand} onChange={(e) => set("inverterBrand", e.target.value)} /></Field>
        <Field label="EV charger"><Input list="brands-ev" value={f.evCharger} onChange={(e) => set("evCharger", e.target.value)} placeholder="Brand and model, if any" /></Field>
        <Field label="Pylon project link" hint="Paste the address of this job's project in Pylon so you can jump straight back to it.">
          <Input type="url" inputMode="url" value={f.pylonUrl} onChange={(e) => set("pylonUrl", e.target.value)} placeholder="https://app.getpylon.com/..." autoCapitalize="off" />
        </Field>
        <Field label="Price ($ inc GST)"><Input inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} placeholder="Latest quote or agreed price" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Install date"><Input type="date" value={f.installDate} onChange={(e) => set("installDate", e.target.value)} /></Field>
          <Field label="Install takes (days)"><Input inputMode="numeric" value={f.installDays} onChange={(e) => set("installDays", e.target.value)} placeholder="1" /></Field>
          <Field label="Installed on" hint="Date system went live"><Input type="date" value={f.installedOn} onChange={(e) => set("installedOn", e.target.value)} /></Field>
        </div>

        {clashes.length > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Heads up: {clashes.join(", ")} {clashes.length > 1 ? "are" : "is"} also booked for install that day.
          </p>
        )}

        <button type="button" onClick={() => setShowSite(!showSite)} className="text-sm font-semibold text-navy-600 underline-offset-2 hover:underline">
          {showSite ? "Hide site details" : "Site details (roof, phase, NMI, network)"}
        </button>
        {showSite && (
          <div className="space-y-3.5 rounded-xl bg-mist-50 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Roof type">
                <Select value={site.roofType} onChange={(e) => setS("roofType", e.target.value)}>
                  <option value="">-</option>
                  {["Colorbond / metal", "Concrete tile", "Terracotta tile", "Slate", "Flat / membrane", "Ground mount", "Other"].map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Phase">
                <Select value={site.phase} onChange={(e) => setS("phase", e.target.value as SiteDetails["phase"])}>
                  <option value="">-</option>
                  <option>Single</option>
                  <option>Three</option>
                </Select>
              </Field>
              <Field label="Network (distributor)">
                <Select value={site.distributor} onChange={(e) => setS("distributor", e.target.value)}>
                  <option value="">-</option>
                  {["AusNet Services", "CitiPower", "Powercor", "Jemena", "United Energy", "Other"].map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Electricity retailer"><Input value={site.retailer} onChange={(e) => setS("retailer", e.target.value)} /></Field>
              <Field label="NMI"><Input value={site.nmi} onChange={(e) => setS("nmi", e.target.value)} inputMode="text" /></Field>
              <Field label="Meter number"><Input value={site.meterNumber} onChange={(e) => setS("meterNumber", e.target.value)} /></Field>
            </div>
            <Field label="Existing solar / battery"><Input value={site.existingSystem} onChange={(e) => setS("existingSystem", e.target.value)} placeholder="e.g. 5kW Fronius from 2016, none" /></Field>
            <Field label="Switchboard notes"><Textarea rows={2} value={site.switchboardNotes} onChange={(e) => setS("switchboardNotes", e.target.value)} placeholder="Space, age, ceramic fuses, upgrade needed..." /></Field>
          </div>
        )}

        <button type="button" onClick={() => setShowInst(!showInst)} className="block text-sm font-semibold text-navy-600 underline-offset-2 hover:underline">
          {showInst ? "Hide install record" : "Install record (serial numbers, certificates, warranty)"}
        </button>
        {showInst && (
          <div className="space-y-3.5 rounded-xl bg-mist-50 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Panel model"><Input value={inst.panelModel} onChange={(e) => setI("panelModel", e.target.value)} /></Field>
              <Field label="Panel count"><Input inputMode="numeric" value={inst.panelCount?.toString() ?? ""} onChange={(e) => setI("panelCount", num(e.target.value))} /></Field>
              <Field label="Inverter model"><Input value={inst.inverterModel} onChange={(e) => setI("inverterModel", e.target.value)} /></Field>
              <Field label="Inverter serial"><Input value={inst.inverterSerial} onChange={(e) => setI("inverterSerial", e.target.value)} /></Field>
              <Field label="Battery model"><Input value={inst.batteryModel} onChange={(e) => setI("batteryModel", e.target.value)} /></Field>
              <Field label="Battery serial"><Input value={inst.batterySerial} onChange={(e) => setI("batterySerial", e.target.value)} /></Field>
              <Field label="EV charger serial"><Input value={inst.evChargerSerial} onChange={(e) => setI("evChargerSerial", e.target.value)} /></Field>
              <Field label="Product warranty (years)"><Input inputMode="numeric" value={inst.warrantyYears?.toString() ?? ""} onChange={(e) => setI("warrantyYears", num(e.target.value))} /></Field>
            </div>
            <Field label="Panel serial numbers" hint="One per line, or paste from the installer app"><Textarea rows={3} value={inst.panelSerials} onChange={(e) => setI("panelSerials", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Licensed electrician"><Input value={inst.installer} onChange={(e) => setI("installer", e.target.value)} /></Field>
              <Field label="CES number"><Input value={inst.cesNumber} onChange={(e) => setI("cesNumber", e.target.value)} /></Field>
            </div>
            <Field label="Distributor approval ref / export limit"><Input value={inst.gridApprovalRef} onChange={(e) => setI("gridApprovalRef", e.target.value)} /></Field>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------- quote */

export function QuoteSheet({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { updateDeal, moveDeal, addNote } = useStore();
  const [f, setF] = useState({
    number: `Q-${String(deal.quotes.length + 1).padStart(3, "0")}`,
    date: today(),
    amount: deal.value?.toString() ?? "",
    summary: deal.title,
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  function save() {
    const quote: Quote = { id: uid(), number: f.number.trim() || "Quote", date: f.date, amount: num(f.amount), summary: f.summary.trim(), status: "sent" };
    updateDeal(deal.id, { quotes: [...deal.quotes, quote], value: quote.amount ?? deal.value });
    addNote({ customerId: deal.customerId, dealId: deal.id, kind: "system", text: `Quote ${quote.number} sent${quote.amount ? ` for $${quote.amount.toLocaleString("en-AU")}` : ""}` });
    if (["new", "contacted", "assessment"].includes(deal.stage)) moveDeal(deal.id, "quoted");
    onClose();
  }

  return (
    <Sheet title="Log a quote sent" onClose={onClose} footer={<Button className="w-full" onClick={save}>Save quote &amp; set follow-ups</Button>}>
      <div className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quote number"><Input value={f.number} onChange={(e) => set("number", e.target.value)} /></Field>
          <Field label="Date sent"><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        </div>
        <Field label="Quote total ($ inc GST)"><Input autoFocus inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <Field label="What was quoted"><Textarea value={f.summary} onChange={(e) => set("summary", e.target.value)} placeholder="e.g. 13.2kW Sungrow + 20kWh battery, 3-phase" /></Field>
        <p className="text-xs text-mist-500">If this job is still at New / Contacted / Site visit, it moves to "Quote sent" and follow-up calls are scheduled for 3 and 10 days.</p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------- task */

export function TaskSheet({ customerId, dealId, task, initialDue, onClose }: { customerId: string; dealId?: string | null; task?: Task; initialDue?: string; onClose: () => void }) {
  const { addTask, updateTask, deleteTask } = useStore();
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? "call");
  const [due, setDue] = useState(task?.due ?? initialDue ?? addDays(1));
  const [time, setTime] = useState(task?.time ?? "");
  const [note, setNote] = useState(task?.note ?? "");

  function save() {
    if (task) updateTask(task.id, { kind, due, time: time || undefined, note });
    else addTask({ customerId, dealId: dealId ?? null, kind, due, time: time || undefined, note });
    onClose();
  }

  return (
    <Sheet
      title={task ? "Edit follow-up" : "New follow-up"}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          {task && <Button variant="danger" onClick={() => { deleteTask(task.id); onClose(); }}>Delete</Button>}
          <Button className="flex-1" onClick={save}>Save</Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="What">
          <div className="flex flex-wrap gap-2">
            {TASK_KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`min-h-10 rounded-full border-2 px-3.5 text-sm font-semibold ${kind === k.id ? "border-solar-600 bg-solar-300/40" : "border-mist-200 text-mist-500"}`}>
                {k.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="When">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Date" />
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (optional)" className="w-32" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[["Tomorrow", 1], ["In 3 days", 3], ["Next week", 7], ["In 2 weeks", 14], ["In a month", 30]].map(([l, n]) => (
              <button key={l} type="button" onClick={() => setDue(addDays(n as number))} className="rounded-full bg-mist-100 px-3 py-1.5 text-xs font-semibold text-navy-700">{l}</button>
            ))}
          </div>
        </Field>
        <Field label="Note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to say or ask" /></Field>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------- lost reason */

export const LOST_REASONS = ["Price too high", "Went with another installer", "Not ready / timing", "Moved / sold house", "Can't get finance", "No response", "Other"];

export function LostSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  return (
    <Sheet title="Why was it lost?" onClose={onClose} footer={<Button className="w-full" onClick={() => onConfirm(reason)}>Mark as lost</Button>}>
      <div className="space-y-2">
        {LOST_REASONS.map((r) => (
          <button key={r} onClick={() => setReason(r)} className={`flex min-h-12 w-full items-center rounded-xl border-2 px-4 text-left font-medium ${reason === r ? "border-solar-600 bg-solar-300/30" : "border-mist-200"}`}>
            {r}
          </button>
        ))}
        <p className="pt-2 text-xs text-mist-500">We will remind you to check in again in 30 days and again at 6 months - lost is rarely lost forever.</p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------- xero */

/** Creates a DRAFT invoice in Xero for a won job. Nothing is sent to the customer from here. */
export function XeroSheet({ deal, customer, onClose }: { deal: Deal; customer: Customer; onClose: () => void }) {
  const { updateDeal, addNote } = useStore();
  const price = deal.value ?? 0;
  const already = (deal.xero ?? []).reduce((n, x) => n + x.amount, 0);
  const [pct, setPct] = useState(already > 0 ? 100 : 10);
  const [amount, setAmount] = useState(String(Math.round(((price - already) * (already > 0 ? 100 : 10)) / 100)));
  const [desc, setDesc] = useState(`${deal.title || "Solar installation"} - ${[customer.address, customer.suburb].filter(Boolean).join(", ")}`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function pick(p: number) {
    setPct(p);
    setAmount(String(Math.round(((price - already) * p) / 100)));
  }

  async function create() {
    setBusy(true);
    setErr("");
    try {
      const r = await xeroCall<{ invoiceId: string; url: string }>("invoice", {
        contact: { name: fullName(customer), email: customer.email, phone: customer.phone, address: customer.address, suburb: customer.suburb, state: customer.state, postcode: customer.postcode },
        amount: Number(amount),
        description: desc,
        reference: deal.title,
      });
      updateDeal(deal.id, { xero: [...(deal.xero ?? []), { invoiceId: r.invoiceId, url: r.url, amount: Number(amount), createdAt: new Date().toISOString() }] });
      addNote({ customerId: customer.id, dealId: deal.id, kind: "system", text: `Draft invoice for $${Number(amount).toLocaleString("en-AU")} created in Xero` });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create the invoice");
      setBusy(false);
    }
  }

  return (
    <Sheet title="Create Xero invoice" onClose={onClose} footer={<Button className="w-full" disabled={busy || !(Number(amount) > 0)} onClick={create}>{busy ? "Creating..." : "Create draft in Xero"}</Button>}>
      <div className="space-y-3.5">
        <p className="rounded-xl bg-mist-50 px-3 py-2 text-sm text-mist-500">
          Creates a <b>draft</b> invoice for {fullName(customer)}. Nothing is sent: open it in Xero, check it, then approve it.
          {price ? <> Job price <b>${price.toLocaleString("en-AU")}</b>{already ? <>, already invoiced ${already.toLocaleString("en-AU")}</> : null}.</> : <> This job has no price entered yet.</>}
        </p>
        <Field label="How much?">
          <div className="mb-2 flex flex-wrap gap-2">
            {[10, 20, 30, 50, 100].map((p) => (
              <button key={p} type="button" onClick={() => pick(p)} className={`min-h-10 rounded-full border-2 px-3.5 text-sm font-semibold ${pct === p ? "border-solar-600 bg-solar-300/40" : "border-mist-200 text-mist-500"}`}>
                {p === 100 ? (already ? "Balance" : "Full") : `${p}% deposit`}
              </button>
            ))}
          </div>
          <Input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setPct(0); }} />
        </Field>
        <Field label="Description on the invoice"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <p className="text-xs text-mist-500">Amounts include GST. If this job has a rebate or STC discount, enter the customer's amount only and check the invoice with your bookkeeper.</p>
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{err}</p>}
      </div>
    </Sheet>
  );
}
