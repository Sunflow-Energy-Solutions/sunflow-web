import { Cloud, CloudOff, Download, LogOut, Mail, Printer, RefreshCw, Smartphone, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { printChecklist } from "../checklist";
import { Button, Card, Field, Input, PageHeader, SectionTitle, Select, Textarea } from "../components/ui";
import { useXeroStatus, xeroCall } from "../xero";
import { cloudEnabled, supabase } from "../cloud";
import { demoData } from "../demo";
import { useStore } from "../store";
import { emptyDb, stageLabel, type Db } from "../types";
import { csvEscape, download, fmtDate, fullName, nowIso, systemSummary, today, uid } from "../utils";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const HEADERS: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first", "given name"],
  lastName: ["last name", "lastname", "last", "surname"],
  name: ["name", "full name", "customer", "customer name"],
  phone: ["phone", "mobile", "phone number", "mobile number", "tel"],
  email: ["email", "email address", "e-mail"],
  address: ["address", "street", "street address"],
  suburb: ["suburb", "city", "town"],
  postcode: ["postcode", "post code", "zip"],
  notes: ["notes", "note", "comments"],
};

export default function Settings({ email }: { email?: string }) {
  const { db, me, sync, syncError, pending, syncNow, importAll, addCustomer } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function exportCsv() {
    const head = ["First name", "Last name", "Phone", "Email", "Address", "Suburb", "Postcode", "Type", "Source", "Email consent", "Stage", "System", "Price", "Install date", "Installed on", "Last quote", "Created"];
    const lines = [head.map(csvEscape).join(",")];
    for (const c of db.customers) {
      const deals = db.deals.filter((d) => d.customerId === c.id);
      const rows = deals.length ? deals : [undefined];
      for (const d of rows) {
        const q = d?.quotes.at(-1);
        lines.push([c.firstName, c.lastName, c.phone, c.email, c.address, c.suburb, c.postcode, c.kind, c.source, c.marketingConsent ? "Yes" : "No",
          d ? stageLabel(d.stage) : "", d ? systemSummary(d) : "", d?.value ?? "", d?.installDate ?? "", d?.installedOn ?? "",
          q ? `${q.number} ${q.date} $${q.amount ?? ""}` : "", c.createdAt.slice(0, 10)].map(csvEscape).join(","));
      }
    }
    download(`sunflow-customers-${today()}.csv`, "﻿" + lines.join("\r\n"));
  }

  function backup() {
    download(`sunflow-crm-backup-${today()}.json`, JSON.stringify(db, null, 2), "application/json");
  }

  async function restore(file: File) {
    try {
      const data = JSON.parse(await file.text()) as Partial<Db>;
      const merged = { ...emptyDb(), ...data };
      if (!Array.isArray(merged.customers)) throw new Error("not a backup");
      if (confirm(`Restore ${merged.customers.length} customers from this backup? Existing records with the same ID are overwritten.`)) {
        importAll(merged);
        setMsg(`Restored ${merged.customers.length} customers.`);
      }
    } catch {
      setMsg("That file isn't a Sunflow CRM backup.");
    }
  }

  async function importCsv(file: File) {
    const rows = parseCsv((await file.text()).replace(/^﻿/, ""));
    if (rows.length < 2) return setMsg("The file has no rows.");
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (key: string) => header.findIndex((h) => HEADERS[key].includes(h));
    const idx = Object.fromEntries(Object.keys(HEADERS).map((k) => [k, col(k)]));
    if (idx.name < 0 && idx.firstName < 0) return setMsg("Couldn't find a Name or First name column. Check the first row has headings.");
    const existing = new Set(db.customers.map((c) => c.phone.replace(/\D/g, "")).filter(Boolean));
    let added = 0, skipped = 0;
    for (const r of rows.slice(1)) {
      const get = (k: string) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
      let first = get("firstName"), last = get("lastName");
      if (!first && !last) {
        const [f, ...rest] = get("name").split(/\s+/);
        first = f ?? ""; last = rest.join(" ");
      }
      const phone = get("phone");
      const digits = phone.replace(/\D/g, "");
      if ((!first && !last) || (digits && existing.has(digits))) { skipped++; continue; }
      if (digits) existing.add(digits);
      addCustomer({ firstName: first, lastName: last, phone, email: get("email"), address: get("address"), suburb: get("suburb"), postcode: get("postcode"), notes: get("notes"), source: "Imported" });
      added++;
    }
    setMsg(`Imported ${added} customers${skipped ? `, skipped ${skipped} (blank or already in the CRM)` : ""}. Email consent is off for imported people - tick it only where they have agreed.`);
  }

  function loadDemo() {
    if (!confirm("Add sample customers so you can try things out? You can delete them later.")) return;
    importAll(demoData(uid, nowIso));
    setMsg("Sample customers added.");
  }

  const syncText = !cloudEnabled
    ? "Saved on this device only"
    : sync === "synced" ? "Up to date" : sync === "syncing" ? "Syncing..." : sync === "offline" ? "Offline - will sync when back online" : "Sync problem";

  return (
    <>
      <PageHeader title="More" sub={email ? `Signed in as ${email}` : undefined} />

      <Card className="p-4">
        <div className="flex items-center gap-3">
          {cloudEnabled ? <Cloud className="size-6 text-emerald-600" /> : <CloudOff className="size-6 text-amber-600" />}
          <div className="flex-1">
            <p className="font-semibold">{syncText}</p>
            <p className="text-sm text-mist-500">
              {cloudEnabled ? (pending ? `${pending} change${pending > 1 ? "s" : ""} waiting to upload` : "Everyone on the team sees the same data") : "Not shared with other phones yet - see Setup below"}
            </p>
          </div>
          {cloudEnabled && <Button variant="soft" size="sm" onClick={() => void syncNow()}><RefreshCw className="size-4" /> Sync</Button>}
        </div>
        {syncError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{syncError}</p>}
      </Card>

      {me.isAdmin && (
        <div className="md:hidden">
          <SectionTitle>Marketing</SectionTitle>
          <Card className="divide-y divide-mist-100">
            <ActionRow icon={<Mail className="size-5" />} title="Email specials" sub="Send an offer to the right group of customers" onClick={() => (location.hash = "#/specials")} />
          </Card>
        </div>
      )}

      <SectionTitle>Job paperwork</SectionTitle>
      <Card className="divide-y divide-mist-100">
        <ActionRow icon={<Printer className="size-5" />} title="Print blank job checklist" sub="The standard Sunflow paperwork checklist for the office or the van" onClick={() => printChecklist()} />
      </Card>

      {me.isAdmin && <TeamSection />}
      {me.isAdmin && <ThanksSettings />}
      {me.isAdmin && <XeroSection />}

      {me.isAdmin && (
        <>
          <SectionTitle>Your data</SectionTitle>
          <Card className="divide-y divide-mist-100">
            <ActionRow icon={<Download className="size-5" />} title="Export to Excel (CSV)" sub="Customers with their systems, prices and dates" onClick={exportCsv} />
            <ActionRow icon={<Download className="size-5" />} title="Download full backup" sub="Everything, including follow-ups and history" onClick={backup} />
            <ActionRow icon={<Upload className="size-5" />} title="Import customers from a spreadsheet" sub="CSV with headings like Name, Phone, Email, Suburb" onClick={() => csvRef.current?.click()} />
            <ActionRow icon={<Upload className="size-5" />} title="Restore from backup" sub="Pick a backup file you downloaded earlier" onClick={() => fileRef.current?.click()} />
          </Card>
        </>
      )}
      <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ""; }} />
      {msg && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{msg}</p>}

      <SectionTitle>Install on your phone</SectionTitle>
      <Card className="flex gap-3 p-4 text-sm">
        <Smartphone className="mt-0.5 size-6 shrink-0 text-navy-600" />
        <div className="space-y-1.5">
          <p><b>iPhone:</b> open this page in Safari, tap the Share button, then <b>Add to Home Screen</b>.</p>
          <p><b>Android:</b> open in Chrome, tap the menu (⋮), then <b>Install app</b> / <b>Add to Home screen</b>.</p>
          <p className="text-mist-500">It then opens full-screen like a normal app and keeps working with no signal.</p>
        </div>
      </Card>

      {!cloudEnabled && (
        <>
          <SectionTitle>Setup: share between phones</SectionTitle>
          <Card className="space-y-2 p-4 text-sm">
            <p>Right now the CRM works, but the data lives only on this device. To share one customer list across everyone's phone and computer, connect the free Supabase database - step-by-step instructions are in <b>crm/README.md</b>.</p>
            <Button variant="soft" size="sm" onClick={loadDemo}>Try it with sample customers</Button>
          </Card>
        </>
      )}

      {cloudEnabled && (
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => supabase?.auth.signOut()}><LogOut className="size-4" /> Sign out</Button>
        </div>
      )}
      <p className="mt-8 text-center text-xs text-mist-400">{db.customers.length} customers · {fmtDate(nowIso())}</p>
    </>
  );
}

function ActionRow({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-16 w-full items-center gap-3 p-3.5 text-left">
      <span className="grid size-10 place-items-center rounded-xl bg-mist-100 text-navy-700">{icon}</span>
      <span className="flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-mist-500">{sub}</span></span>
    </button>
  );
}

/** Who can sign in is controlled in Supabase; this list sets names and who is an admin. */
function TeamSection() {
  const { db, me, addStaff, updateStaff, deleteStaff } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!cloudEnabled) {
    return (
      <>
        <SectionTitle>Team</SectionTitle>
        <Card className="p-4 text-sm text-mist-500">Staff, roles and "looked after by" become available once the shared database is switched on.</Card>
      </>
    );
  }

  return (
    <>
      <SectionTitle>Team</SectionTitle>
      <Card className="divide-y divide-mist-100">
        {db.staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 p-3">
            <div className="min-w-0 flex-1">
              <input
                defaultValue={s.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && updateStaff(s.id, { name: e.target.value.trim() })}
                aria-label="Name"
                className="w-full rounded-lg border border-transparent px-1 font-semibold hover:border-mist-200 focus:border-solar-600 focus:outline-none"
              />
              <p className="truncate px-1 text-xs text-mist-500">{s.email}</p>
            </div>
            <Select
              value={s.role}
              disabled={s.email === me.email}
              onChange={(e) => updateStaff(s.id, { role: e.target.value as "admin" | "staff" })}
              className="w-28"
              aria-label={`Role for ${s.name}`}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </Select>
            {s.email !== me.email && (
              <button onClick={() => confirm(`Remove ${s.name} from the team list? Also remove their login in Supabase to stop them signing in.`) && deleteStaff(s.id)} aria-label={`Remove ${s.name}`} className="grid size-9 place-items-center rounded-full text-mist-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
            )}
          </div>
        ))}
        <div className="space-y-2 p-3">
          <p className="text-xs text-mist-500">
            <b>Admin</b> can send specials, connect Xero, delete customers, export and manage the team. <b>Staff</b> can do everything else. Everyone sees every customer.
            People appear here automatically the first time they sign in; to add someone before then, enter the same email you gave them in Supabase.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="off" /></Field>
          </div>
          <Button size="sm" variant="soft" disabled={!email.includes("@")} onClick={() => { addStaff({ name, email, role: "staff" }); setName(""); setEmail(""); }}>Add team member</Button>
        </div>
      </Card>
    </>
  );
}

function XeroSection() {
  const [tick, setTick] = useState(0);
  const status = useXeroStatus(tick);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const flag = location.hash.split("?")[1] ?? "";

  useEffect(() => {
    if (flag.includes("xero=")) setTick((t) => t + 1);
  }, [flag]);

  async function connect() {
    setBusy(true);
    setErr("");
    try {
      const { url } = await xeroCall<{ url: string }>("connect");
      location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start the Xero connection");
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect Xero? Invoices already created stay in Xero.")) return;
    try {
      await xeroCall("disconnect");
      setTick((t) => t + 1);
      location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not disconnect");
    }
  }

  return (
    <>
      <SectionTitle>Xero</SectionTitle>
      <Card className="space-y-2 p-4 text-sm">
        {!cloudEnabled ? (
          <p className="text-mist-500">Xero needs the shared database switched on first.</p>
        ) : !status.configured ? (
          <p className="text-mist-500">Not set up yet. Add the Xero keys on the server (steps in <b>crm/README.md</b>), then come back here to connect.</p>
        ) : status.connected ? (
          <div className="flex items-center gap-3">
            <span className="flex-1"><b>Connected</b>{status.org ? ` to ${status.org}` : ""}. When a job is won you'll be offered a draft invoice.</span>
            <Button size="sm" variant="ghost" onClick={disconnect}>Disconnect</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex-1 text-mist-500">Connect your Xero organisation to create draft invoices from won jobs.</span>
            <Button size="sm" onClick={connect} disabled={busy}>Connect Xero</Button>
          </div>
        )}
        {flag.includes("xero=connected") && <p className="rounded-xl bg-emerald-50 px-3 py-2 font-medium text-emerald-800">Xero connected.</p>}
        {flag.includes("xero=failed") && <p className="rounded-xl bg-red-50 px-3 py-2 font-medium text-red-700">Xero didn't connect. Try again.</p>}
        {err && <p className="rounded-xl bg-red-50 px-3 py-2 font-medium text-red-700">{err}</p>}
      </Card>
    </>
  );
}

/** Review links and thank-you wording used by "Thank you & review" on completed jobs. */
function ThanksSettings() {
  const { settings, saveSettings } = useStore();
  const [f, setF] = useState({
    googleReviewUrl: settings.googleReviewUrl,
    facebookReviewUrl: settings.facebookReviewUrl,
    otherReviewLabel: settings.otherReviewLabel,
    otherReviewUrl: settings.otherReviewUrl,
    thankYouSubject: settings.thankYouSubject,
    thankYouBody: settings.thankYouBody,
    thankYouSms: settings.thankYouSms,
  });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setSaved(false); };
  const bad = (u: string) => !!u.trim() && !/^https:\/\/\S+$/i.test(u.trim());

  return (
    <>
      <SectionTitle>Thank-you &amp; reviews</SectionTitle>
      <Card className="space-y-3.5 p-4">
        <Field label="Google review link" hint="Google Business Profile -> Home -> Get more reviews -> Share review form -> copy the link.">
          <Input type="url" value={f.googleReviewUrl} onChange={(e) => set("googleReviewUrl", e.target.value)} placeholder="https://g.page/r/..." autoCapitalize="off" />
        </Field>
        <Field label="Facebook review link" hint="Your page address followed by /reviews, e.g. https://www.facebook.com/yourpage/reviews">
          <Input type="url" value={f.facebookReviewUrl} onChange={(e) => set("facebookReviewUrl", e.target.value)} autoCapitalize="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Another site (name)"><Input value={f.otherReviewLabel} onChange={(e) => set("otherReviewLabel", e.target.value)} placeholder="e.g. Review us on ProductReview" /></Field>
          <Field label="Another site (link)"><Input type="url" value={f.otherReviewUrl} onChange={(e) => set("otherReviewUrl", e.target.value)} autoCapitalize="off" /></Field>
        </div>
        {[f.googleReviewUrl, f.facebookReviewUrl, f.otherReviewUrl].some(bad) && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Links must start with https:// or they'll be left out.</p>}
        <Field label="Email subject"><Input value={f.thankYouSubject} onChange={(e) => set("thankYouSubject", e.target.value)} /></Field>
        <Field label="Email message" hint="{{firstName}} = customer's first name, {{system}} = what was installed. Review buttons are added under it automatically.">
          <Textarea rows={8} value={f.thankYouBody} onChange={(e) => set("thankYouBody", e.target.value)} />
        </Field>
        <Field label="Text message" hint="{{reviewLink}} = your first review link above. Keep it short.">
          <Textarea rows={3} value={f.thankYouSms} onChange={(e) => set("thankYouSms", e.target.value)} />
        </Field>
        <div className="flex items-center gap-3">
          <Button onClick={() => { saveSettings(f); setSaved(true); }}>Save</Button>
          {saved && <span className="text-sm font-medium text-emerald-700">Saved - the whole team now uses this.</span>}
        </div>
      </Card>
    </>
  );
}
