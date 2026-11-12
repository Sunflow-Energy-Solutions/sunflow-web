import { env, isAdmin, json, requireStaff, sb, staffRole } from "./_lib.js";
import {
  AUTHORIZE, SCOPES, accessToken, configured, findOrCreateContact, loadTokens, redirectUri, stateFor, xero, type ContactIn,
} from "./_xero.js";

/**
 * Xero actions for the CRM: status, connect, disconnect and create-draft-invoice.
 * An admin connects one Xero organisation. Invoices are only ever created as DRAFTS - nothing is approved or sent automatically.
 */
export async function POST(request: Request): Promise<Response> {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return json({ error: "Please sign in again." }, 401);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    if (body.action === "status") {
      if (!configured()) return json({ configured: false, connected: false });
      const t = await loadTokens();
      return json({ configured: true, connected: !!t, org: t?.tenant_name ?? "" });
    }

    if (body.action === "connect") {
      if (!configured()) return json({ error: "Xero isn't set up on the server yet (XERO_CLIENT_ID / XERO_CLIENT_SECRET)." }, 400);
      if (!(await isAdmin(staff.email))) return json({ error: "Only an admin can connect Xero." }, 403);
      const ts = String(Date.now());
      const url = `${AUTHORIZE}?${new URLSearchParams({
        response_type: "code", client_id: env("XERO_CLIENT_ID"), redirect_uri: redirectUri(), scope: SCOPES, state: `${ts}.${stateFor(ts)}`,
      })}`;
      return json({ url });
    }

    if (body.action === "disconnect") {
      if (!(await isAdmin(staff.email))) return json({ error: "Only an admin can disconnect Xero." }, 403);
      await sb("private_settings?key=eq.xero", { method: "DELETE" });
      return json({ ok: true });
    }

    if (body.action === "invoice") {
      // Invoices are created from details the app sends, so limited logins aren't allowed to (they could invoice any contact).
      if ((await staffRole(staff.email)).role === "limited") return json({ error: "Ask an admin to create the invoice." }, 403);
      const auth = await accessToken();
      if (!auth) return json({ error: "Xero isn't connected. An admin can connect it in More." }, 400);
      const contact = body.contact as ContactIn | undefined;
      const amount = Number(body.amount);
      if (!contact?.name || !(amount > 0)) return json({ error: "Missing customer name or amount." }, 400);

      const contactId = await findOrCreateContact(auth, contact);
      const now = new Date();
      const due = new Date(now.getTime() + (Number(body.dueDays) || 7) * 86400000);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      const out = await xero("Invoices", auth, {
        method: "POST",
        body: JSON.stringify({
          Invoices: [{
            Type: "ACCREC",
            Status: "DRAFT",
            Contact: { ContactID: contactId },
            Date: iso(now),
            DueDate: iso(due),
            LineAmountTypes: "Inclusive", // prices in the CRM include GST
            Reference: String(body.reference ?? "").slice(0, 255),
            LineItems: [{
              Description: String(body.description ?? "Solar / battery installation").slice(0, 4000),
              Quantity: 1,
              UnitAmount: Math.round(amount * 100) / 100,
              AccountCode: process.env.XERO_SALES_ACCOUNT_CODE ?? "200",
              TaxType: process.env.XERO_TAX_TYPE ?? "OUTPUT", // GST on income (Australia)
            }],
          }],
        }),
      });
      const inv = out.Invoices[0];
      return json({ invoiceId: inv.InvoiceID, url: `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${inv.InvoiceID}` });
    }

    return json({ error: "Unknown request." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Xero request failed." }, 502);
  }
}
