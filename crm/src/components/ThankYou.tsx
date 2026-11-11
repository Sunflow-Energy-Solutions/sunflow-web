import { Copy, Mail, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { callApi } from "../api";
import { cloudEnabled } from "../cloud";
import { useStore } from "../store";
import type { Customer, Deal } from "../types";
import { fmtDate, fullName } from "../utils";
import { fill, reviewLinks, smsLink, thanksVars } from "../thanks";
import { Button, Card, Field, Input, Sheet, Textarea } from "./ui";

/**
 * After a job is complete: thank the customer and ask for a review. Email goes out from the CRM; the text opens on the
 * staff member's own phone, ready to send. Wording and review links come from More -> Thank-you & reviews.
 */
export function ThankYouSheet({ deal, customer, onClose }: { deal: Deal; customer: Customer; onClose: () => void }) {
  const { settings, markThanks, addNote, me } = useStore();
  const vars = thanksVars(customer, deal, settings);
  const links = reviewLinks(settings);
  const [subject, setSubject] = useState(fill(settings.thankYouSubject, vars));
  const [body, setBody] = useState(fill(settings.thankYouBody, vars));
  const [sms, setSms] = useState(fill(settings.thankYouSms, vars));
  const [busy, setBusy] = useState<"" | "email" | "preview">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const canEmail = cloudEnabled && !!customer.email.trim() && !customer.unsubscribed;
  const emailWhy = !cloudEnabled ? "Email sending needs the shared database switched on." : customer.unsubscribed ? `${fullName(customer)} has unsubscribed from emails.` : !customer.email.trim() ? "No email address on file for this customer." : "";

  async function sendEmail(preview: boolean) {
    setBusy(preview ? "preview" : "email");
    setMsg(null);
    try {
      await callApi("/api/send-thanks", { customerId: customer.id, subject, body, buttons: links, preview });
      if (preview) setMsg({ ok: true, text: `Preview sent to ${me.email || "you"}. Check your inbox.` });
      else {
        markThanks(deal.id, ["email"]);
        addNote({ customerId: customer.id, dealId: deal.id, kind: "system", text: `Thank-you and review request emailed to ${customer.email}` });
        setMsg({ ok: true, text: `Sent to ${customer.email}.` });
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not send" });
    } finally {
      setBusy("");
    }
  }

  function textSent() {
    markThanks(deal.id, ["sms"]);
    addNote({ customerId: customer.id, dealId: deal.id, kind: "system", text: `Thank-you and review request texted to ${customer.phone}` });
    setMsg({ ok: true, text: "Marked as sent." });
  }

  return (
    <Sheet title="Thank you & review request" onClose={onClose}>
      <div className="space-y-4">
        {deal.thanks && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Already sent by {deal.thanks.by || "someone"} on {fmtDate(deal.thanks.sentAt)} ({deal.thanks.channels.join(" and ")}). Only send again if you need to.
          </p>
        )}

        {links.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No review links set up yet, so these messages will thank the customer but won't ask for a review. {me.isAdmin ? <>Add them in <a href="#/settings" onClick={onClose} className="font-semibold underline">More → Thank-you &amp; reviews</a>.</> : "Ask an admin to add them in More."}
          </p>
        ) : (
          <p className="text-sm text-mist-500">Review links included: {links.map((l) => l.label.replace("Review us on ", "")).join(", ")}.</p>
        )}

        <Card className="space-y-3 p-3.5">
          <h3 className="flex items-center gap-2 font-bold"><Mail className="size-4" /> Email to {customer.email || "customer"}</h3>
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <Field label="Message" hint={links.length ? "Review buttons are added under your message automatically." : undefined}>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          {emailWhy && <p className="text-sm text-amber-800">{emailWhy}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" size="sm" disabled={!cloudEnabled || !!busy} onClick={() => sendEmail(true)}>{busy === "preview" ? "Sending..." : "Send me a preview"}</Button>
            <Button size="sm" disabled={!canEmail || !!busy || !subject.trim() || !body.trim()} onClick={() => sendEmail(false)}><Send className="size-4" /> {busy === "email" ? "Sending..." : "Send email"}</Button>
          </div>
        </Card>

        <Card className="space-y-3 p-3.5">
          <h3 className="flex items-center gap-2 font-bold"><MessageSquare className="size-4" /> Text to {customer.phone || "customer"}</h3>
          <Textarea rows={4} value={sms} onChange={(e) => setSms(e.target.value)} aria-label="Text message" />
          <p className="text-xs text-mist-500">{sms.length} characters. This opens your phone's Messages app with the text ready; you tap Send there, then tap "Mark as sent" so the team can see it's done.</p>
          <div className="flex flex-wrap gap-2">
            {customer.phone ? <a href={smsLink(customer.phone, sms)} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-navy-900 px-3 text-sm font-semibold text-white"><MessageSquare className="size-4" /> Open in Messages</a> : <span className="text-sm text-amber-800">No phone number on file.</span>}
            <Button size="sm" variant="soft" onClick={() => navigator.clipboard?.writeText(sms).then(() => setMsg({ ok: true, text: "Text copied." }))}><Copy className="size-4" /> Copy</Button>
            <Button size="sm" variant="soft" onClick={textSent}>Mark as sent</Button>
          </div>
        </Card>

        {msg && <p className={`rounded-xl px-3 py-2 text-sm font-medium ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
        <p className="text-xs text-mist-400">Emails include an unsubscribe link and Sunflow's business details. Only ask customers whose job went well; if they were unhappy, call them first.</p>
      </div>
    </Sheet>
  );
}
