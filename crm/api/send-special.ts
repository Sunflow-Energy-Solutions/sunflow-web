import { Resend } from "resend";
import { BUSINESS, env, escapeHtml, isAdmin, json, requireStaff, sign } from "./_lib.js";

type Recipient = { id: string; email: string; firstName: string };
const MAX_RECIPIENTS = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function render(body: string, firstName: string, unsubscribeUrl: string): string {
  const text = escapeHtml(body.replace(/\{\{\s*firstName\s*\}\}/gi, firstName)).replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#0a1730">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a1730;padding:18px 24px;color:#fdb813;font-size:20px;font-weight:bold">${BUSINESS.name}</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.6">${text}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e5eb;font-size:12px;line-height:1.5;color:#6b7386">
${BUSINESS.name} · ${BUSINESS.abn} · ${BUSINESS.phone} · <a href="${BUSINESS.web}" style="color:#6b7386">${BUSINESS.web.replace("https://", "")}</a><br>
You are receiving this because you have dealt with Sunflow and agreed to hear from us.
<a href="${unsubscribeUrl}" style="color:#6b7386">Unsubscribe</a>
</td></tr></table></td></tr></table></body></html>`;
}

export async function POST(request: Request): Promise<Response> {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return json({ error: "Please sign in again." }, 401);
  if (!(await isAdmin(staff.email))) return json({ error: "Only an admin can send specials." }, 403);

  const input = (await request.json().catch(() => null)) as { subject?: string; body?: string; recipients?: Recipient[]; test?: boolean } | null;
  const subject = input?.subject?.trim();
  const body = input?.body?.trim();
  if (!subject || !body) return json({ error: "Add a subject and a message." }, 400);

  const recipients = (input?.recipients ?? []).filter((r) => r && EMAIL_RE.test(r.email));
  if (recipients.length === 0) return json({ error: "No valid email addresses." }, 400);
  if (recipients.length > MAX_RECIPIENTS) return json({ error: `Send to ${MAX_RECIPIENTS} or fewer at a time.` }, 400);

  const appUrl = env("APP_URL").replace(/\/$/, "");
  const from = env("MAIL_FROM");
  const replyTo = process.env.MAIL_REPLY_TO;
  const resend = new Resend(env("RESEND_API_KEY"));

  const messages = recipients.map((r) => {
    const unsubscribeUrl = input?.test ? `${appUrl}/api/unsubscribe` : `${appUrl}/api/unsubscribe?id=${encodeURIComponent(r.id)}&sig=${sign(r.id)}`;
    return {
      from,
      to: r.email,
      replyTo: replyTo || undefined,
      subject: input?.test ? `[TEST] ${subject}` : subject,
      html: render(body, r.firstName || "there", unsubscribeUrl),
      headers: input?.test ? undefined : { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    };
  });

  let sent = 0;
  let failed = 0;
  let lastError = "";
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const { error } = await resend.batch.send(chunk);
    if (error) {
      failed += chunk.length;
      lastError = error.message;
    } else sent += chunk.length;
  }

  if (sent === 0) return json({ error: `The email service rejected the send: ${lastError}` }, 502);
  return json({ sent, failed });
}
