import { brandOf, kwText, type PylonDesign, type PylonProject } from "./_pylon.js";
import {
  addDays, dealsFor, findCustomerByEmail, getRecord, melbourneToday, newCustomer, newDeal, newNote, newTask, nowIso, openAutoTasks, ownerOf, row, saveRows, type Rec, type Row,
} from "./_records.js";

/** The deal this Pylon project belongs to: by reference_number (the deal id), else by the customer's email. */
export async function matchDeal(p: PylonProject, eventEmail: string): Promise<{ deal: Rec | null; customer: Rec | null }> {
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

export type ApplyResult = { status: "updated" | "created" | "duplicate"; dealId: string; customerId: string; title: string; customerName: string; newCustomer: boolean };

/**
 * Fills a job in the CRM from a design the customer signed in Pylon, and moves it to Won.
 * Used by the live webhook and by the import of jobs that were signed before the webhook existed.
 * Safe to repeat: the same signed design is never applied twice.
 */
export async function applySigned(o: {
  project: PylonProject;
  projectId: string;
  design: PylonDesign;
  designId: string;
  eventEmail?: string;
  /** Link to the project in Pylon, if known */
  projectUrl?: string;
  /** When it was signed, if known (defaults to now) */
  signedAt?: string;
}): Promise<ApplyResult> {
  const { project, design, designId, projectId } = o;
  let { deal, customer } = await matchDeal(project, o.eventEmail ?? "");

  if (deal?.pylon?.designId === designId && deal.pylon?.signedAt) {
    return { status: "duplicate", dealId: String(deal.id), customerId: String(deal.customerId), title: String(deal.title ?? ""), customerName: `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim(), newCustomer: false };
  }

  const rows: Row[] = [];
  const t = nowIso();
  const title = [design.kw ? `${kwText(design.kw)}kW solar` : "", design.kwh ? `${kwText(design.kwh)}kWh battery` : "", design.evChargers.length ? "EV charger" : ""].filter(Boolean).join(" + ") || "Pylon design";
  const system = {
    solarKw: design.kw ?? deal?.system?.solarKw ?? null,
    panelBrand: brandOf(design.panels[0]?.description ?? "", "panels") || deal?.system?.panelBrand || "",
    batteryKwh: design.kwh ?? deal?.system?.batteryKwh ?? null,
    batteryBrand: brandOf(design.batteries[0]?.description ?? "", "batteries") || deal?.system?.batteryBrand || "",
    inverterBrand: brandOf(design.inverters[0]?.description ?? "", "inverters") || deal?.system?.inverterBrand || "",
    evCharger: design.evChargers[0]?.description ?? deal?.system?.evCharger ?? "",
  };

  let createdNew = false;
  if (!customer) {
    createdNew = true;
    customer = newCustomer({
      name: project.name || "Pylon customer", phone: project.phone, email: project.email || o.eventEmail || "",
      address: project.address, suburb: project.suburb, state: project.state, postcode: project.postcode, source: "Pylon",
    });
    rows.push(row("customer", customer, false, ownerOf(customer)));
  } else {
    // fill gaps only; never overwrite what staff have typed
    const fill: Rec = {};
    if (!customer.phone && project.phone) fill.phone = project.phone;
    if (!customer.email && project.email) fill.email = project.email;
    if (!customer.address && project.address) fill.address = project.address;
    if (!customer.suburb && project.suburb) fill.suburb = project.suburb;
    if (!customer.postcode && project.postcode) fill.postcode = project.postcode;
    if (!customer.state && project.state) fill.state = project.state;
    if (Object.keys(fill).length) rows.push(row("customer", { ...customer, ...fill, updatedAt: t }, false, ownerOf(customer)));
  }
  if (!deal) deal = newDeal(String(customer.id), { stage: "new", source: createdNew ? "Pylon" : customer.source, campaign: "" });

  const wasStage = String(deal.stage);
  const priorQuotes = (deal.quotes as Rec[] | undefined) ?? [];
  const alreadyAccepted = priorQuotes.some((q) => q.status === "accepted" && design.total != null && q.amount === design.total);
  const nextDeal: Rec = {
    ...deal,
    title,
    system,
    value: design.total ?? deal.value ?? null,
    stage: wasStage === "installed" ? "installed" : "won",
    quotes: alreadyAccepted ? priorQuotes : [...priorQuotes, { id: crypto.randomUUID(), number: "Pylon", date: melbourneToday(), amount: design.total, summary: title, status: "accepted" }],
    install: {
      ...(deal.install ?? {}),
      panelModel: design.panels[0]?.description ?? deal.install?.panelModel ?? "",
      panelCount: design.panels.reduce((n, p) => n + p.quantity, 0) || deal.install?.panelCount || null,
      inverterModel: design.inverters[0]?.description ?? deal.install?.inverterModel ?? "",
      batteryModel: design.batteries[0]?.description ?? deal.install?.batteryModel ?? "",
    },
    pylonUrl: deal.pylonUrl || o.projectUrl || "",
    pylon: { projectId, designId, signedAt: o.signedAt || t },
    updatedAt: t,
  };
  rows.push(row("deal", nextDeal, false, ownerOf(customer)));

  // The stage rules for "Won": drop the old stage's open reminders and add the install-prep one.
  if (wasStage !== "won" && wasStage !== "installed") {
    for (const task of await openAutoTasks(String(deal.id))) rows.push(row("task", { ...task, updatedAt: t }, true, ownerOf(customer)));
    rows.push(row("task", newTask(String(customer.id), String(deal.id), "install", addDays(2), "Confirm install date, deposit and paperwork (STC / rebate forms)"), false, ownerOf(customer)));
  }
  rows.push(row("note", newNote(String(customer.id), String(deal.id),
    `Customer signed the proposal in Pylon: ${title}${design.total != null ? `, $${design.total.toLocaleString("en-AU")}` : ""}. Job ${wasStage === "installed" ? "kept as Installed" : "moved to Won"} with the signed design's details.${createdNew ? " (New customer created from Pylon.)" : ""}`), false, ownerOf(customer)));

  await saveRows(rows);
  return {
    status: createdNew ? "created" : "updated",
    dealId: String(deal.id), customerId: String(customer.id), title, customerName: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim(), newCustomer: createdNew,
  };
}
