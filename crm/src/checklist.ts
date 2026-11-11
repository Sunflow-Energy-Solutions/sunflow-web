import type { CheckItem, Customer, Deal } from "./types";
import { fmtDate, fullName, nowIso, systemSummary, uid } from "./utils";

/**
 * Sunflow job paperwork checklist (Victoria). STARTER LIST: have your licensed electrician / compliance
 * person confirm it against current Solar Victoria, Energy Safe Victoria, distributor and Clean Energy
 * Regulator requirements before relying on it. Edit this file to change the default list; staff can also
 * add or remove items on an individual job.
 *
 * `when` limits an item to jobs that include solar, a battery or an EV charger. `required` items trigger
 * a warning if they're not ticked when the job is marked Installed.
 */
export type Need = "solar" | "battery" | "ev" | "any";
export type Template = { key: string; group: string; label: string; required: boolean; when: Need[] };

export const CHECKLIST_GROUPS = ["1. Sales & quote", "2. Approvals", "3. Before install", "4. Install day", "5. Compliance & handover"];

const g = CHECKLIST_GROUPS;

export const TEMPLATE: Template[] = [
  // 1. Sales & quote
  { key: "bill", group: g[0], label: "Recent electricity bill on file (NMI, retailer, usage)", required: false, when: ["any"] },
  { key: "site_photos", group: g[0], label: "Site photos taken: roof, switchboard, meter, inverter / battery location", required: false, when: ["any"] },
  { key: "id_owner", group: g[0], label: "Customer ID and property ownership confirmed", required: true, when: ["any"] },
  { key: "quote_signed", group: g[0], label: "Written quote / contract signed by the customer", required: true, when: ["any"] },
  { key: "deposit", group: g[0], label: "Deposit received", required: true, when: ["any"] },
  { key: "finance", group: g[0], label: "Finance or payment plan arranged (if applicable)", required: false, when: ["any"] },

  // 2. Approvals
  { key: "cec_lists", group: g[1], label: "Panels, inverter and battery confirmed on the current CEC approved lists", required: true, when: ["solar", "battery"] },
  { key: "dnsp_lodged", group: g[1], label: "Distributor (network) connection application lodged", required: true, when: ["solar", "battery"] },
  { key: "dnsp_approved", group: g[1], label: "Distributor approval received - export limit noted in the Install record", required: true, when: ["solar", "battery"] },
  { key: "sv_rebate", group: g[1], label: "Solar Victoria rebate / loan: customer approved and quote uploaded to the portal (if claiming)", required: false, when: ["solar"] },
  { key: "battery_incentive", group: g[1], label: "Battery incentives checked: Solar Victoria battery rebate and federal battery program (if claiming)", required: false, when: ["battery"] },
  { key: "stc_assign", group: g[1], label: "STC assignment form signed by the customer (if we claim STCs on their behalf)", required: false, when: ["solar", "battery"] },
  { key: "ev_circuit", group: g[1], label: "EV charger: switchboard capacity and circuit / load-management plan confirmed", required: false, when: ["ev"] },

  // 3. Before install
  { key: "equipment", group: g[2], label: "Equipment ordered / in stock", required: false, when: ["any"] },
  { key: "date_confirmed", group: g[2], label: "Install date confirmed with the customer", required: true, when: ["any"] },
  { key: "electrician", group: g[2], label: "Licensed electrician assigned (name in the Install record)", required: true, when: ["any"] },
  { key: "qr_ready", group: g[2], label: "Customer's rebate QR code ready to scan before work starts (if claiming a Solar Victoria rebate)", required: false, when: ["solar", "battery"] },

  // 4. Install day
  { key: "qr_scanned", group: g[3], label: "Rebate QR code scanned by the electrician before starting (if claiming)", required: false, when: ["solar", "battery"] },
  { key: "installed_ok", group: g[3], label: "Installation completed as designed", required: true, when: ["any"] },
  { key: "serials", group: g[3], label: "Serial numbers recorded in the Install record", required: true, when: ["any"] },
  { key: "install_photos", group: g[3], label: "Install photos taken: array, inverter, battery, labels, switchboard", required: true, when: ["any"] },
  { key: "commissioned", group: g[3], label: "System commissioned: export limit and settings checked, monitoring set up", required: true, when: ["solar", "battery"] },
  { key: "ev_tested", group: g[3], label: "EV charger tested and settings confirmed with the customer", required: true, when: ["ev"] },
  { key: "walkthrough", group: g[3], label: "Customer walkthrough done (how it works, monitoring app, isolators)", required: false, when: ["any"] },

  // 5. Compliance & handover
  { key: "ces", group: g[4], label: "Certificate of Electrical Safety (CES) completed and lodged; copy on file", required: true, when: ["any"] },
  { key: "inspection", group: g[4], label: "Electrical inspection arranged / done as required; system switched on only once cleared", required: true, when: ["solar", "battery"] },
  { key: "stc_submit", group: g[4], label: "STCs registered / submitted (if we claim them)", required: false, when: ["solar", "battery"] },
  { key: "rebate_claim", group: g[4], label: "Solar Victoria payment request submitted through the portal (if the customer claimed a rebate)", required: false, when: ["solar", "battery"] },
  { key: "final_invoice", group: g[4], label: "Final invoice sent and balance received", required: true, when: ["any"] },
  { key: "handover_pack", group: g[4], label: "Handover pack sent: warranties, manuals, CES copy, monitoring login", required: true, when: ["any"] },
  { key: "review", group: g[4], label: "Asked for a Google review / referral", required: false, when: ["any"] },
];

/** File type pre-selected when attaching proof to a checklist item. */
export const CATEGORY_FOR: Record<string, string> = {
  bill: "Electricity bill", site_photos: "Site photo", id_owner: "Approval", quote_signed: "Quote / contract",
  dnsp_approved: "Approval", dnsp_lodged: "Approval", sv_rebate: "Approval", battery_incentive: "Approval", stc_assign: "Approval",
  install_photos: "Install photo", serials: "Install photo", commissioned: "Install photo",
  ces: "Certificate", inspection: "Certificate", stc_submit: "Certificate", handover_pack: "Warranty",
};

function needs(deal: Deal): Set<Need> {
  const s = deal.system;
  const out = new Set<Need>(["any"]);
  // A job logged as an enquiry has 0 kW / "TBC" placeholders: treat "interested in" as included.
  if (s.solarKw != null) out.add("solar");
  if (s.batteryKwh != null) out.add("battery");
  if (s.evCharger) out.add("ev");
  return out;
}

const fromTemplate = (t: Template): CheckItem => ({
  id: uid(), key: t.key, group: t.group, label: t.label, required: t.required, done: false, doneAt: null, doneBy: "",
});

export function buildChecklist(deal: Deal): CheckItem[] {
  const n = needs(deal);
  return TEMPLATE.filter((t) => t.when.some((w) => n.has(w))).map(fromTemplate);
}

/** Adds items that became relevant (e.g. a battery was added to the job) without touching ticked ones. */
export function syncChecklist(deal: Deal): CheckItem[] | undefined {
  if (!deal.checklist) return undefined;
  const n = needs(deal);
  const have = new Set([...deal.checklist.map((c) => c.key).filter(Boolean), ...(deal.checklistSkipped ?? [])]);
  const add = TEMPLATE.filter((t) => !have.has(t.key) && t.when.some((w) => n.has(w))).map(fromTemplate);
  return add.length ? [...deal.checklist, ...add] : deal.checklist;
}

export const outstandingRequired = (deal: Deal) => (deal.checklist ?? []).filter((c) => c.required && !c.done);

export function progress(deal: Deal): { done: number; total: number } | null {
  if (!deal.checklist?.length) return null;
  return { done: deal.checklist.filter((c) => c.done).length, total: deal.checklist.length };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Opens a printable paper copy (job sheet with tick boxes). Pass no customer/deal for the blank office template. */
export function printChecklist(customer?: Customer, deal?: Deal) {
  const items = deal?.checklist ?? TEMPLATE.map(fromTemplate);
  const groups = CHECKLIST_GROUPS.map((gr) => ({ gr, rows: items.filter((i) => i.group === gr) })).filter((x) => x.rows.length);
  const extra = items.filter((i) => !CHECKLIST_GROUPS.includes(i.group));
  if (extra.length) groups.push({ gr: "Other", rows: extra });

  const head = customer && deal
    ? `<p><b>${esc(fullName(customer))}</b> &middot; ${esc([customer.address, customer.suburb, customer.postcode].filter(Boolean).join(", "))}<br>${esc(customer.phone)} &middot; ${esc(systemSummary(deal) || deal.title)}${deal.installDate ? ` &middot; Install ${fmtDate(deal.installDate)}` : ""}</p>`
    : `<p>Customer: ______________________ &nbsp; Address: ____________________________________ &nbsp; Install date: ___________</p>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sunflow job paperwork checklist</title>
<style>body{font:13px Arial,sans-serif;color:#0a1730;margin:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #fdb813;padding-bottom:2px}
li{list-style:none;margin:5px 0;display:flex;gap:8px}.box{flex:none;width:14px;height:14px;border:1.5px solid #0a1730;margin-top:1px}.done{background:#0a1730}
.req{color:#b45309;font-size:11px}small{color:#6b7386}</style></head><body>
<h1>Sunflow Energy Solutions - Job paperwork checklist</h1>${head}
${groups.map(({ gr, rows }) => `<h2>${esc(gr)}</h2><ul style="padding:0;margin:0">${rows.map((i) => `<li><span class="box${i.done ? " done" : ""}"></span><span>${esc(i.label)}${i.required ? ' <span class="req">(required)</span>' : ""}${i.done && i.doneAt ? ` <small>- ${esc(fmtDate(i.doneAt))}${i.doneBy ? ` ${esc(i.doneBy)}` : ""}</small>` : ""}</span></li>`).join("")}</ul>`).join("")}
<p style="margin-top:20px"><small>Starter checklist for Victorian jobs. Printed ${esc(fmtDate(nowIso()))}. Signed off by: ______________________</small></p>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
