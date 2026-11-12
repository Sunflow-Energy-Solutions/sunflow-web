import { env, json } from "./_lib.js";
import { brandOf, getDesign, getProject, kwText, verifySignature, type PylonProject } from "./_pylon.js";
import {
  addDays, dealsFor, findCustomerByEmail, getRecord, melbourneToday, newCustomer, newDeal, newNote, newTask, nowIso, openAutoTasks, row, saveRows, type Rec, type Row,
} from "./_records.js";

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

/** The deal this Pylon project belongs to: by reference_number (the deal id), else by the customer's email. */
async function matchDeal(p: PylonProject, eventEmail: string): Promise<{ deal: Rec | null; customer: Rec | null }> {
  if (p.reference) {
    const deal = await getRecord("deal", p.reference);
    if (deal) return { deal, customer: await getRecord("customer", String(deal.customerId)) };
  }
  const customer = await findCustomerByEmail(p.email || eventEmail);
  if (!customer) return { deal: null, customer: null };
  const deals = (await dealsFor(String(customer.id))).filter((d) => d.stage !== "lost" && d.stage !== "installed");
  // newest enquiry that hasn't been won yet
  const open = deals.filter((d) => d.stage !== "won").sort((x, y) => String(y.updatedAt).localeCompare(String(x.updatedAt)));
  return { deal: open[0] ?? deals.sort((x, y) => String(y.updatedAt).localeCompare(String(x.updatedAt)))[0] ?? null, customer };
}

async function signed(a: Rec, designId: string, projectId: string): Promise<Response> {
  if (!designId || !projectId) return json({ ok: true, ignored: "signed event without a design or project" });
  const project = await getProject(projectId);
  const design = await getDesign(designId);
  let { deal, customer } = await matchDeal(project, String(a.customer_email ?? ""));

  // Already processed this exact signed design (Pylon retries and can deliver twice): nothing to do.
  if (deal?.pylon?.designId === designId && deal.pylon?.signedAt) return json({ ok: true, duplicate: true, dealId: deal.id });

  const rows: Row[] = [];
  const title = [design.kw ? `${kwText(design.kw)}kW solar` : "", design.kwh ? `${kwText(design.kwh)}kWh battery` : "", design.evChargers.length ? "EV charger" : ""].filter(Boolean).join(" + ") || "Pylon design";
  const system = {
    solarKw: design.kw ?? deal?.system?.solarKw ?? null,
    panelBrand: brandOf(design.panels[0]?.description ?? "", "panels") || deal?.system?.panelBrand || "",
    batteryKwh: design.kwh ?? deal?.system?.batteryKwh ?? null,
    batteryBrand: brandOf(design.batteries[0]?.description ?? "", "batteries") || deal?.system?.batteryBrand || "",
    inverterBrand: brandOf(design.inverters[0]?.description ?? "", "inverters") || deal?.system?.inverterBrand || "",
    evCharger: design.evChargers[0]?.description ?? deal?.system?.evCharger ?? "",
  };
  const t = nowIso();

  let createdNew = false;
  if (!customer) {
    createdNew = true;
    customer = newCustomer({
      name: project.name || String(a.customer_name ?? "Pylon customer"), phone: project.phone, email: project.email || String(a.customer_email ?? ""),
      address: project.address, suburb: project.suburb, state: project.state, postcode: project.postcode, source: "Pylon",
    });
    rows.push(row("customer", customer));
  } else {
    // fill gaps only; never overwrite what staff have typed
    const fill: Rec = {};
    if (!customer.phone && project.phone) fill.phone = project.phone;
    if (!customer.email && project.email) fill.email = project.email;
    if (!customer.address && project.address) fill.address = project.address;
    if (!customer.suburb && project.suburb) fill.suburb = project.suburb;
    if (!customer.postcode && project.postcode) fill.postcode = project.postcode;
    if (!customer.state && project.state) fill.state = project.state;
    if (Object.keys(fill).length) rows.push(row("customer", { ...customer, ...fill, updatedAt: t }));
  }
  if (!deal) deal = newDeal(String(customer.id), { stage: "new" });

  const wasStage = String(deal.stage);
  const nextDeal: Rec = {
    ...deal,
    title,
    system,
    value: design.total ?? deal.value ?? null,
    stage: wasStage === "installed" ? "installed" : "won",
    quotes: [
      ...((deal.quotes as Rec[] | undefined) ?? []),
      { id: crypto.randomUUID(), number: "Pylon", date: melbourneToday(), amount: design.total, summary: title, status: "accepted" },
    ],
    install: {
      ...(deal.install ?? {}),
      panelModel: design.panels[0]?.description ?? deal.install?.panelModel ?? "",
      panelCount: design.panels.reduce((n, p) => n + p.quantity, 0) || deal.install?.panelCount || null,
      inverterModel: design.inverters[0]?.description ?? deal.install?.inverterModel ?? "",
      batteryModel: design.batteries[0]?.description ?? deal.install?.batteryModel ?? "",
    },
    pylonUrl: deal.pylonUrl || String(a.project_in_app_url ?? ""),
    pylon: { projectId, designId, signedAt: t },
    updatedAt: t,
  };
  rows.push(row("deal", nextDeal));

  // The stage rules for "Won": drop the old stage's open reminders and add the install-prep one.
  if (wasStage !== "won" && wasStage !== "installed") {
    for (const task of await openAutoTasks(String(deal.id))) rows.push(row("task", { ...task, updatedAt: t }, true));
    rows.push(row("task", newTask(String(customer.id), String(deal.id), "install", addDays(2), "Confirm install date, deposit and paperwork (STC / rebate forms)")));
  }
  rows.push(row("note", newNote(String(customer.id), String(deal.id),
    `Customer signed the proposal in Pylon: ${title}${design.total != null ? `, $${design.total.toLocaleString("en-AU")}` : ""}. Job moved to Won with the signed design's details.${createdNew ? " (New customer created from Pylon.)" : ""}`)));

  await saveRows(rows);
  return json({ ok: true, dealId: deal.id, customerId: customer.id, created: createdNew });
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
    ...(checklist ? [row("deal", { ...deal, checklist, updatedAt: t })] : []),
    row("note", newNote(String(customer.id), String(deal.id),
      `${purpose === "deposit" ? "Deposit" : "Payment"} ${dollars != null ? `of $${dollars.toLocaleString("en-AU")} ` : ""}received through Pylon${a.receipt_url ? ` (receipt: ${a.receipt_url})` : ""}.`)),
  ];
  await saveRows(rows);
  return json({ ok: true, dealId: deal.id });
}
