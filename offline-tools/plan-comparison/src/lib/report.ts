/** Builds the customer-facing report: one self-contained, mobile-first HTML page (no external files, prints cleanly to PDF). */

export interface ReportOption {
  title: string;
  brand: string;
  tags: string[];
  /** What's in the package, e.g. inverter, battery, panels */
  includes: string[];
  planLabel: string;
  /** True when the saving depends on moving to a different plan */
  needsPlanSwitch: boolean;
  billBeforeMonth: number;
  billAfterMonth: number;
  savingMonth: number;
  savingYear: number;
  price: number;
  rebate: number;
  youPay: number;
  paybackYears: number | null;
  tenYearNet: number;
}

export interface ReportData {
  customer: string;
  dateLabel: string;
  currentPlanLabel: string;
  billMonth: number;
  usagePerDay: number;
  exportPerDay: number;
  planSwitch: { planLabel: string; billMonth: number; savingMonth: number } | null;
  options: ReportOption[];
  priceListDate: string;
  contact: { name: string; phone: string; email: string; abn: string; rec: string };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money = (v: number) => aud.format(Math.round(v));
const years = (y: number) => (y < 1 ? "under 1 year" : `${y.toFixed(1)} years`);

function optionCard(o: ReportOption, i: number) {
  const max = Math.max(o.billBeforeMonth, o.billAfterMonth, 1);
  const pct = (v: number) => Math.max(3, Math.round((Math.max(0, v) / max) * 100));
  return `
  <section class="card">
    <div class="tags">${o.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}<span class="opt">Option ${i + 1}</span></div>
    <h2>${esc(o.title)}</h2>
    <p class="brand">${esc(o.brand)}</p>
    <p class="save"><strong>${money(o.savingMonth)}</strong> <span>less per month</span></p>
    <p class="sub">${money(o.savingYear)} a year</p>

    <div class="bars">
      <div class="barrow"><span class="lbl">Today</span><div class="track"><div class="fill now" style="width:${pct(o.billBeforeMonth)}%"></div></div><span class="val">${money(o.billBeforeMonth)}</span></div>
      <div class="barrow"><span class="lbl">With this</span><div class="track"><div class="fill after" style="width:${pct(o.billAfterMonth)}%"></div></div><span class="val">${money(o.billAfterMonth)}</span></div>
      <p class="hint">Average monthly electricity bill${o.needsPlanSwitch ? ` &middot; includes moving to ${esc(o.planLabel)}` : ""}</p>
    </div>

    <table class="price">
      <tr><td>System price (incl. GST)</td><td>${money(o.price)}</td></tr>
      <tr><td>Government rebate (STCs)</td><td>&minus;${money(o.rebate)}</td></tr>
      <tr class="total"><td>You pay</td><td>${money(o.youPay)}</td></tr>
    </table>

    <div class="stats">
      <div><span class="k">Pays for itself in</span><span class="v">${o.paybackYears == null ? "&ndash;" : years(o.paybackYears)}</span></div>
      <div><span class="k">10-year benefit</span><span class="v">${o.tenYearNet >= 0 ? money(o.tenYearNet) : "&minus;" + money(-o.tenYearNet)}</span></div>
    </div>

    <details>
      <summary>What's included</summary>
      <ul>${o.includes.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </details>
  </section>`;
}

export function buildReportHtml(d: ReportData): string {
  const switchCard = d.planSwitch
    ? `<section class="card switch">
        <h2>Quick win: switch plan</h2>
        <p class="save"><strong>${money(d.planSwitch.savingMonth)}</strong> <span>less per month, no new equipment</span></p>
        <p class="sub">Move from ${esc(d.currentPlanLabel)} to ${esc(d.planSwitch.planLabel)} &mdash; about ${money(d.planSwitch.billMonth)} a month instead of ${money(d.billMonth)}.</p>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Energy savings options${d.customer ? " for " + esc(d.customer) : ""} - ${esc(d.contact.name)}</title>
<style>
:root{--navy:#0a1730;--navy2:#17305a;--sun:#fdb813;--sun2:#f7931e;--mist:#f2f4f8;--line:#e2e5eb;--text:#1b2540;--muted:#6b7386;--green:#15803d}
*{box-sizing:border-box}
body{margin:0;background:var(--mist);color:var(--text);font-family:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;line-height:1.45;-webkit-text-size-adjust:100%}
.wrap{max-width:680px;margin:0 auto;padding:0 16px 40px}
header{background:var(--navy);color:#fff;padding:22px 16px 26px}
header .in{max-width:680px;margin:0 auto}
header .brand{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--sun);font-weight:700}
header h1{margin:6px 0 4px;font-size:26px;line-height:1.2}
header p{margin:0;color:#c9d1e2;font-size:14px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin:16px 0;box-shadow:0 1px 3px rgba(10,23,48,.05)}
.card h2{margin:0;font-size:19px}
.card.today{margin-top:-14px}
.today .big{font-size:34px;font-weight:800;margin:4px 0 0}
.today .big span{font-size:15px;font-weight:500;color:var(--muted)}
.today .row{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:14px;color:var(--muted)}
.tags{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.tag{background:#fff4d6;color:#8a5a00;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px}
.opt{margin-left:auto;font-size:12px;color:var(--muted)}
.brand{margin:2px 0 8px;color:var(--muted);font-size:14px}
.save{margin:6px 0 0;font-size:15px;color:var(--muted)}
.save strong{font-size:34px;color:var(--green);font-weight:800}
.sub{margin:2px 0 12px;color:var(--muted);font-size:14px}
.bars{margin:12px 0}
.barrow{display:grid;grid-template-columns:70px 1fr 62px;align-items:center;gap:8px;margin:6px 0;font-size:14px}
.track{background:var(--mist);border-radius:6px;height:14px;overflow:hidden}
.fill{height:100%;border-radius:6px}
.fill.now{background:#9aa3b2}.fill.after{background:var(--green)}
.val{text-align:right;font-weight:700}
.hint{margin:2px 0 0;font-size:12px;color:var(--muted)}
table.price{width:100%;border-collapse:collapse;margin:12px 0;font-size:15px}
table.price td{padding:7px 0;border-bottom:1px solid var(--line)}
table.price td:last-child{text-align:right;font-variant-numeric:tabular-nums}
table.price tr.total td{font-weight:800;font-size:17px;border-bottom:0;border-top:2px solid var(--navy)}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
.stats div{background:var(--mist);border-radius:12px;padding:10px 12px}
.stats .k{display:block;font-size:12px;color:var(--muted)}
.stats .v{display:block;font-size:18px;font-weight:800;margin-top:2px}
details{margin-top:12px;font-size:14px}
summary{cursor:pointer;color:var(--navy2);font-weight:600}
details ul{margin:8px 0 0;padding-left:18px;color:var(--muted)}
.switch{border-color:#bfe3c9;background:#f4fbf6}
.notes{font-size:13px;color:var(--muted)}
.notes h3{font-size:15px;color:var(--text);margin:0 0 6px}
.notes ul{padding-left:18px;margin:6px 0}
.contact{background:var(--navy);color:#fff;border-radius:16px;padding:18px;margin:16px 0;font-size:14px}
.contact a{color:var(--sun)}
.contact strong{display:block;font-size:16px;margin-bottom:4px}
.btn{display:block;width:100%;margin:8px 0 0;padding:12px;border:0;border-radius:12px;background:var(--sun);color:#1b1b1b;font-weight:700;font-size:15px;cursor:pointer}
@media print{body{background:#fff}.noprint{display:none!important}.card{box-shadow:none;break-inside:avoid}header{-webkit-print-color-adjust:exact;print-color-adjust:exact}.fill,.tag,.contact{-webkit-print-color-adjust:exact;print-color-adjust:exact}details[open] summary~*{display:block}}
</style>
</head>
<body>
<header><div class="in">
  <div class="brand">${esc(d.contact.name)}</div>
  <h1>Your energy savings options</h1>
  <p>${d.customer ? "Prepared for " + esc(d.customer) + " &middot; " : ""}${esc(d.dateLabel)}</p>
</div></header>
<div class="wrap">
  <section class="card today">
    <p style="margin:0;color:var(--muted);font-size:14px">Your electricity today &middot; ${esc(d.currentPlanLabel)}</p>
    <p class="big">${money(d.billMonth)} <span>a month on average</span></p>
    <div class="row"><span>Uses about ${d.usagePerDay.toFixed(0)} kWh a day from the grid</span>${d.exportPerDay > 0.05 ? `<span>Sends about ${d.exportPerDay.toFixed(1)} kWh a day back from solar</span>` : ""}</div>
  </section>
  ${switchCard}
  ${d.options.length ? d.options.map(optionCard).join("") : `<section class="card"><p>No battery or solar option reduced this bill enough to recommend. Switching plan is the best step for now.</p></section>`}
  <button class="btn noprint" onclick="window.print()">Save as PDF / print</button>
  <section class="card notes">
    <h3>How to read these figures</h3>
    <ul>
      <li>These are estimates worked out from your electricity bill, not a guarantee. Actual savings depend on your usage, the weather and the plan you are on.</li>
      <li>"Pays for itself" counts only what the system saves you, compared with the best you could do without it.</li>
      <li>Prices include GST and the government rebate at the time of this quote (price list of ${esc(d.priceListDate)}). Rebate amounts are set by government and can change.</li>
      <li>Electricity plan prices change. Savings that depend on a plan assume today's published rates.</li>
    </ul>
  </section>
  <section class="contact">
    <strong>Ready to talk it through?</strong>
    ${esc(d.contact.name)}<br>
    <a href="tel:${esc(d.contact.phone.replace(/[^+\d]/g, ""))}">${esc(d.contact.phone)}</a> &middot; <a href="mailto:${esc(d.contact.email)}">${esc(d.contact.email)}</a><br>
    <span style="color:#9aa8c4;font-size:12px">${esc(d.contact.abn)} &middot; ${esc(d.contact.rec)}</span>
  </section>
</div>
</body>
</html>`;
}
