import { Resend } from "resend";
import { renderInternalEmail } from "./_mail.js";
import { env, json, requireStaff, sb, staffRole } from "./_lib.js";

/**
 * Emails a team member when a lead has been given to them. Called by the app right after an admin / full-staff person assigns a customer.
 * The recipient address comes from the team list in the database (never from the request), and limited logins can't use this.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (e) {
    console.error("notify-assignment failed", e);
    return json({ error: e instanceof Error ? e.message : "Could not send the email." }, 500);
  }
}

type Rec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function one(path: string): Promise<Rec | null> {
  const res = await sb(path);
  return res.ok ? (((await res.json()) as { data: Rec }[])[0]?.data ?? null) : null;
}
async function many(path: string): Promise<Rec[]> {
  const res = await sb(path);
  return res.ok ? ((await res.json()) as { data: Rec }[]).map((r) => r.data) : [];
}

async function handle(request: Request): Promise<Response> {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return json({ error: "Please sign in again." }, 401);
  const caller = await staffRole(staff.email);
  if (caller.role === "limited") return json({ error: "Only an admin or staff member can assign leads." }, 403);

  const input = (await request.json().catch(() => null)) as { customerId?: string; staffId?: string } | null;
  if (!input?.customerId || !input?.staffId) return json({ error: "Missing customer or team member." }, 400);

  const customer = await one(`records?id=eq.${encodeURIComponent(input.customerId)}&kind=eq.customer&deleted=eq.false&select=data`);
  if (!customer) return json({ error: "Customer not found." }, 404);
  const assignee = await one(`records?id=eq.${encodeURIComponent(input.staffId)}&kind=eq.staff&deleted=eq.false&select=data`);
  if (!assignee?.email) return json({ error: "That team member has no email address on file." }, 404);

  // What they asked for: the newest job's title, and the enquiry's own note (the first system note, written when the lead arrived).
  const deals = (await many(`records?kind=eq.deal&deleted=eq.false&select=data&data->>customerId=eq.${encodeURIComponent(input.customerId)}`))
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const deal = deals[0];
  const notes = (await many(`records?kind=eq.note&deleted=eq.false&select=data&data->>customerId=eq.${encodeURIComponent(input.customerId)}`))
    .filter((n) => n.kind === "system" && !String(n.text ?? "").startsWith("Assigned to"))
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));

  const name = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "New customer";
  const place = [customer.suburb, customer.state, customer.postcode].filter(Boolean).join(" ");
  const appUrl = env("APP_URL").replace(/\/$/, "");
  const first = String(assignee.name ?? "").split(/\s+/)[0] || "there";

  const resend = new Resend(env("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: env("MAIL_FROM"),
    to: String(assignee.email),
    subject: `New lead for you: ${name}${customer.suburb ? ` (${customer.suburb})` : ""}`,
    html: renderInternalEmail({
      heading: `A new lead has been given to you, ${first}`,
      intro: `Assigned by ${staff.email}. Please call them as soon as you can.`,
      rows: [
        ["Name", name],
        ["Phone", String(customer.phone ?? "")],
        ["Email", String(customer.email ?? "")],
        ["Address", [customer.address, place].filter(Boolean).join(", ")],
        ["Interested in", String(deal?.title ?? "")],
        ["Came from", [deal?.source || customer.source, deal?.campaign].filter(Boolean).join(" - ")],
        ["Their enquiry", String(notes[0]?.text ?? "").slice(0, 400)],
      ],
      button: { label: "Open in the CRM", url: `${appUrl}/#/customers/${encodeURIComponent(input.customerId)}` },
      footer: "You are getting this because a lead was assigned to you in the Sunflow CRM.",
    }),
  });
  if (error) return json({ error: `The email service rejected the send: ${error.message}` }, 502);
  return json({ sent: true, to: String(assignee.name ?? assignee.email) });
}
