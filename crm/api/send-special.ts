import { Resend } from "resend";
import { env, isAdmin, json, requireStaff, sign } from "./_lib.js";
import { renderEmail } from "./_mail.js";

type Recipient = { id: string; email: string; firstName: string };
const MAX_RECIPIENTS = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const render = (body: string, firstName: string, unsubscribeUrl: string) =>
  renderEmail({
    body: body.replace(/\{\{\s*firstName\s*\}\}/gi, firstName),
    unsubscribeUrl,
    reason: "You are receiving this because you have dealt with Sunflow and agreed to hear from us.",
  });

/** Any unexpected failure (e.g. a missing Vercel setting) is returned as a readable message instead of a bare 500. */
export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (e) {
    console.error("send-special failed", e);
    return json({ error: e instanceof Error ? e.message : "Sending failed." }, 500);
  }
}

async function handle(request: Request): Promise<Response> {
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
