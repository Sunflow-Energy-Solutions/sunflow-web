import clsx from "clsx";
import { Copy, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Empty, Field, Input, PageHeader, SectionTitle, Select, Textarea } from "../components/ui";
import { upgradeOpportunities } from "../automation";
import { cloudEnabled, supabase } from "../cloud";
import { useStore } from "../store";
import type { Customer, Db } from "../types";
import { fmtDate, fullName } from "../utils";

type Segment = { id: string; label: string; hint: string; match: (c: Customer, db: Db) => boolean };

const yearsSince = (d: string) => (Date.now() - new Date(`${d}T00:00:00`).getTime()) / (365.25 * 86400000);

function SEGMENTS(db: Db): Segment[] {
  const upgradeIds = new Set(upgradeOpportunities(db.deals).map((u) => u.customerId));
  const dealsOf = (c: Customer) => db.deals.filter((d) => d.customerId === c.id);
  return [
    { id: "all", label: "Everyone who agreed to emails", hint: "All customers and leads", match: () => true },
    { id: "installed", label: "Past customers (installed)", hint: "Great for referrals and reviews", match: (c) => dealsOf(c).some((d) => d.stage === "installed") },
    { id: "battery", label: "Solar, no battery yet", hint: "Battery specials", match: (c) => dealsOf(c).some((d) => d.stage === "installed" && d.system.solarKw && !d.system.batteryKwh) },
    { id: "ev", label: "No EV charger yet", hint: "EV charger specials", match: (c) => dealsOf(c).some((d) => d.stage === "installed" && !d.system.evCharger) },
    { id: "old", label: "Systems 5+ years old", hint: "Health check / upgrade", match: (c) => dealsOf(c).some((d) => d.stage === "installed" && d.installedOn && yearsSince(d.installedOn) >= 5) },
    { id: "upgrade", label: "Any upgrade opportunity", hint: "Matches the Today list", match: (c) => upgradeIds.has(c.id) },
    { id: "quoted", label: "Quoted, no decision", hint: "Nudge with a limited offer", match: (c) => dealsOf(c).some((d) => ["quoted", "negotiating"].includes(d.stage)) },
    { id: "lost", label: "Didn't go ahead", hint: "Win-back", match: (c) => dealsOf(c).some((d) => d.stage === "lost") && !dealsOf(c).some((d) => ["won", "installed"].includes(d.stage)) },
    { id: "leads", label: "Early leads", hint: "New / contacted / site visit", match: (c) => dealsOf(c).some((d) => ["new", "contacted", "assessment"].includes(d.stage)) },
  ];
}

const TEMPLATES = [
  {
    name: "Battery special",
    subject: "Battery special for Sunflow customers",
    body: "Hi {{firstName}},\n\nYou already have solar - now is a great time to add a battery and use more of your own power after the sun goes down.\n\nFor a limited time we are offering [DESCRIBE OFFER HERE]. Reply to this email or call us on (03) 9088 0322 and we will work out the right size for your home.\n\nThanks,\nThe Sunflow team",
  },
  {
    name: "EV charger special",
    subject: "Charge your EV from your own solar",
    body: "Hi {{firstName}},\n\nThinking about an EV, or already driving one? A smart home charger can run straight off your solar and cut your charging costs.\n\nThis month: [DESCRIBE OFFER HERE]. Just reply and we will book a time.\n\nThanks,\nThe Sunflow team",
  },
  {
    name: "System health check",
    subject: "Is your solar system still performing?",
    body: "Hi {{firstName}},\n\nIt has been a few years since we installed your system. We are offering a quick health check to make sure everything is performing and to see whether an upgrade would save you money.\n\nReply to book a time that suits.\n\nThanks,\nThe Sunflow team",
  },
  {
    name: "Quote reminder",
    subject: "Your Sunflow quote - special price this month",
    body: "Hi {{firstName}},\n\nJust a quick note about the quote we sent you. We are currently offering [DESCRIBE OFFER HERE] on new installations booked before [DATE].\n\nHappy to answer any questions - just reply to this email.\n\nThanks,\nThe Sunflow team",
  },
  { name: "Blank", subject: "", body: "Hi {{firstName}},\n\n" },
];

export default function Specials() {
  const { db, addCampaign } = useStore();
  const segments = useMemo(() => SEGMENTS(db), [db]);
  const [segId, setSegId] = useState("all");
  const [suburb, setSuburb] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "sending" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  const seg = segments.find((s) => s.id === segId)!;
  const withEmail = db.customers.filter((c) => c.email.trim());
  const eligible = withEmail.filter((c) => c.marketingConsent && !c.unsubscribed);
  const audience = eligible.filter((c) => seg.match(c, db) && (!suburb.trim() || c.suburb.toLowerCase().includes(suburb.trim().toLowerCase())));
  const skippedConsent = withEmail.filter((c) => !c.marketingConsent && !c.unsubscribed && seg.match(c, db)).length;

  const ready = subject.trim() && body.trim() && audience.length > 0 && !body.includes("[DESCRIBE OFFER HERE]") && !body.includes("[DATE]");

  async function send(test: boolean) {
    setState({ kind: "sending" });
    try {
      const { data } = await supabase!.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("You are signed out. Sign in again.");
      const email = data.session!.user.email!;
      const recipients = test
        ? [{ id: "test", email, firstName: "there" }]
        : audience.map((c) => ({ id: c.id, email: c.email.trim(), firstName: c.firstName.trim() || "there" }));
      const res = await fetch("/api/send-special", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, body, recipients, test }),
      });
      const out = (await res.json().catch(() => ({}))) as { sent?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(out.error ?? `Send failed (${res.status})`);
      if (!test) {
        addCampaign({ subject, body, audience: `${seg.label}${suburb ? ` - ${suburb}` : ""}`, recipients: out.sent ?? 0 });
      }
      setState({ kind: "ok", msg: test ? `Test sent to ${email}. Check your inbox.` : `Sent to ${out.sent} ${out.sent === 1 ? "person" : "people"}${out.failed ? `, ${out.failed} failed` : ""}.` });
    } catch (e) {
      setState({ kind: "error", msg: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  const sendDisabledReason = !cloudEnabled
    ? "Sending needs the shared database turned on (see Setup in More). Until then you can copy the list and send from your own email."
    : "";

  return (
    <>
      <PageHeader title="Email specials" sub="Send an offer to the right customers" />

      <SectionTitle>1. Who should get it?</SectionTitle>
      <Card className="p-4">
        <div className="space-y-2">
          {segments.map((s) => {
            const n = eligible.filter((c) => s.match(c, db)).length;
            return (
              <button key={s.id} onClick={() => setSegId(s.id)} className={clsx("flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 px-3.5 py-2 text-left", segId === s.id ? "border-solar-600 bg-solar-300/30" : "border-mist-200")}>
                <span>
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-xs text-mist-500">{s.hint}</span>
                </span>
                <span className="text-lg font-extrabold text-navy-700">{n}</span>
              </button>
            );
          })}
        </div>
        <Field label="Only this suburb (optional)" className="mt-3"><Input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Berwick" /></Field>
        <p className="mt-3 rounded-xl bg-mist-50 px-3 py-2 text-sm">
          <b>{audience.length}</b> {audience.length === 1 ? "person" : "people"} will receive this.
          {skippedConsent > 0 && <span className="text-mist-500"> {skippedConsent} more match but haven't agreed to emails, so they are left out.</span>}
          {db.customers.some((c) => c.unsubscribed) && <span className="text-mist-500"> Unsubscribed customers are always excluded.</span>}
        </p>
      </Card>

      <SectionTitle>2. Write it</SectionTitle>
      <Card className="space-y-3.5 p-4">
        <Field label="Start from a template">
          <Select value="" onChange={(e) => { const t = TEMPLATES.find((x) => x.name === e.target.value); if (t) { setSubject(t.subject); setBody(t.body); } }}>
            <option value="">Choose...</option>
            {TEMPLATES.map((t) => <option key={t.name}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message" hint="{{firstName}} becomes each person's first name. Fill in anything in [BRACKETS] before sending.">
          <Textarea rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <p className="text-xs text-mist-500">An unsubscribe link and the Sunflow business details are added automatically to every email, as the Spam Act requires.</p>
      </Card>

      <SectionTitle>3. Send</SectionTitle>
      <Card className="space-y-3 p-4">
        {sendDisabledReason && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{sendDisabledReason}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="soft" disabled={!cloudEnabled || !subject.trim() || !body.trim() || state.kind === "sending"} onClick={() => send(true)}>Send me a test</Button>
          <Button
            disabled={!cloudEnabled || !ready || state.kind === "sending"}
            onClick={() => confirm(`Send "${subject}" to ${audience.length} ${audience.length === 1 ? "person" : "people"}?`) && send(false)}
          >
            <Send className="size-4" /> {state.kind === "sending" ? "Sending..." : `Send to ${audience.length}`}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={audience.length === 0}
          onClick={() => {
            navigator.clipboard?.writeText(audience.map((c) => `${fullName(c)} <${c.email.trim()}>`).join(", "));
            setState({ kind: "ok", msg: `Copied ${audience.length} addresses. Paste them in the BCC box of your own email.` });
          }}
        >
          <Copy className="size-4" /> Copy the email list instead
        </Button>
        {state.msg && <p className={clsx("rounded-xl px-3 py-2 text-sm font-medium", state.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800")}>{state.msg}</p>}
      </Card>

      <SectionTitle>Sent so far</SectionTitle>
      {db.campaigns.length === 0 ? (
        <Empty title="No specials sent yet" />
      ) : (
        <Card className="divide-y divide-mist-100">
          {[...db.campaigns].sort((a, b) => b.sentAt.localeCompare(a.sentAt)).map((c) => (
            <div key={c.id} className="p-3.5">
              <p className="font-semibold">{c.subject}</p>
              <p className="text-sm text-mist-500">{fmtDate(c.sentAt)} · {c.recipients} sent · {c.audience}</p>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
