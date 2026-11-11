import { Resend } from "resend";
import { cleanButtons, renderEmail } from "./_mail.js";
import { env, json, requireStaff, sb, sign } from "./_lib.js";

/**
 * Sends one thank-you / review-request email for a finished job. Any signed-in staff member can use it.
 * The address is read from the customer's record on the server (never from the request), and unsubscribed
 * customers are refused. `preview: true` sends the same email to the staff member instead, to check it first.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (e) {
    console.error("send-thanks failed", e);
    return json({ error: e instanceof Error ? e.message : "Sending failed." }, 500);
  }
}

async function handle(request: Request): Promise<Response> {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return json({ error: "Please sign in again." }, 401);

  const input = (await request.json().catch(() => null)) as { customerId?: string; subject?: string; body?: string; buttons?: unknown; preview?: boolean } | null;
  const subject = input?.subject?.trim().slice(0, 200);
  const body = input?.body?.trim().slice(0, 5000);
  if (!subject || !body) return json({ error: "Add a subject and a message." }, 400);
  if (!input?.customerId) return json({ error: "No customer given." }, 400);

  const res = await sb(`records?id=eq.${encodeURIComponent(input.customerId)}&kind=eq.customer&deleted=eq.false&select=data`);
  const rows = (await res.json().catch(() => [])) as { data: { email?: string; unsubscribed?: boolean } }[];
  const customer = res.ok ? rows[0]?.data : undefined;
  if (!customer) return json({ error: "Customer not found." }, 404);
  if (customer.unsubscribed && !input.preview) return json({ error: "This customer has unsubscribed from emails." }, 409);

  const to = input.preview ? staff.email : (customer.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "This customer has no valid email address." }, 400);

  const appUrl = env("APP_URL").replace(/\/$/, "");
  const unsubscribeUrl = input.preview ? `${appUrl}/api/unsubscribe` : `${appUrl}/api/unsubscribe?id=${encodeURIComponent(input.customerId)}&sig=${sign(input.customerId)}`;
  const resend = new Resend(env("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: env("MAIL_FROM"),
    to,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
    subject: input.preview ? `[PREVIEW] ${subject}` : subject,
    html: renderEmail({
      body,
      buttons: cleanButtons(input.buttons),
      unsubscribeUrl,
      reason: "You are receiving this because Sunflow recently completed work for you.",
    }),
    headers: input.preview ? undefined : { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  if (error) return json({ error: `The email service rejected the send: ${error.message}` }, 502);
  return json({ sent: true, to: input.preview ? staff.email : "customer" });
}
