import { env, json } from "./_lib.js";
import { applySigned, matchDeal } from "./_pylon-apply.js";
import { getDesign, getProject, verifySignature } from "./_pylon.js";
import { newNote, nowIso, ownerOf, row, saveRows, type Rec, type Row } from "./_records.js";

/**
 * Receives Pylon webhooks (set up in Pylon -> API settings -> Webhook destination).
 *  - web_proposals.signed: the customer e-signed a proposal. The job in the CRM is filled from THAT design and moved to Won.
 *    Designs that were only sent, not signed, never reach the CRM.
 *  - gateway_payments.created: a deposit / payment was made through Pylon; recorded on the job.
 * Jobs are matched by the reference_number the CRM puts on the project when you click "Design in Pylon" (the job's id),
 * falling back to the customer's email. Replies 200 for events we ignore, 500 for temporary problems so Pylon retries.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (e) {
    console.error("pylon-webhook failed", e);
    return json({ error: e instanceof Error ? e.message : "Webhook failed." }, 500);
  }
}

async function handle(request: Request): Promise<Response> {
  const raw = await request.text();
  const ok = verifySignature(env("PYLON_WEBHOOK_SECRET"), request.headers.get("pylon-webhook-timestamp") ?? "", raw, request.headers.get("pylon-webhook-signature") ?? "");
  if (!ok) return json({ error: "Bad signature." }, 401);

  let body: Rec;
  try {
    body = JSON.parse(raw) as Rec;
  } catch {
    return json({ error: "Not JSON." }, 400);
  }
  const ev = (body.data ?? body) as Rec;
  const a = (ev.attributes ?? ev) as Rec;
  const name = String(a.name ?? ev.name ?? "");
  const rel = (ev.relationships ?? {}) as Rec;
  const idOf = (r: unknown) => String(((r as Rec)?.data as Rec | undefined)?.id ?? (r as Rec)?.id ?? "");
  const designId = idOf(rel.solar_design);
  const projectId = idOf(rel.solar_project);

  if (name === "web_proposals.signed") return signed(a, designId, projectId);
  if (name === "gateway_payments.created") return payment(a, projectId);
  return json({ ok: true, ignored: name || "unknown event" });
}

async function signed(a: Rec, designId: string, projectId: string): Promise<Response> {
  if (!designId || !projectId) return json({ ok: true, ignored: "signed event without a design or project" });
  const project = await getProject(projectId);
  const design = await getDesign(designId);
  const r = await applySigned({ project, projectId, design, designId, eventEmail: String(a.customer_email ?? ""), projectUrl: String(a.project_in_app_url ?? "") });
  return json({ ok: true, duplicate: r.status === "duplicate" || undefined, dealId: r.dealId, customerId: r.customerId, created: r.newCustomer });
}

async function payment(a: Rec, projectId: string): Promise<Response> {
  if (!projectId) return json({ ok: true, ignored: "payment without a project" });
  const project = await getProject(projectId);
  const { deal, customer } = await matchDeal(project, "");
  if (!deal || !customer) return json({ ok: true, ignored: "no matching job" });

  const dollars = typeof a.amount === "number" ? a.amount / 100 : null;
  const purpose = String(a.purpose ?? "payment");
  const t = nowIso();
  const checklist = Array.isArray(deal.checklist)
    ? deal.checklist.map((i: Rec) => (purpose === "deposit" && i.key === "deposit" && !i.done ? { ...i, done: true, doneAt: t, doneBy: "Pylon payment" } : i))
    : deal.checklist;
  const rows: Row[] = [
    ...(checklist ? [row("deal", { ...deal, checklist, updatedAt: t }, false, ownerOf(customer))] : []),
    row("note", newNote(String(customer.id), String(deal.id),
      `${purpose === "deposit" ? "Deposit" : "Payment"} ${dollars != null ? `of $${dollars.toLocaleString("en-AU")} ` : ""}received through Pylon${a.receipt_url ? ` (receipt: ${a.receipt_url})` : ""}.`), false, ownerOf(customer)),
  ];
  await saveRows(rows);
  return json({ ok: true, dealId: deal.id });
}
