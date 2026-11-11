import { env, json } from "./_lib.js";
import { findCustomerByEmail, melbourneToday, newCustomer, newDeal, newNote, newTask, row, saveRows, safeEqual, type Rec, type Row } from "./_records.js";

/**
 * Inbound leads from anywhere that can send a web request: Facebook / Instagram lead ads (through Make or Zapier),
 * Google lead forms, a landing page, a partner. Protected by LEAD_WEBHOOK_SECRET, sent as the `x-api-key` header
 * (or `Authorization: Bearer ...`). Field names are matched loosely, so the usual lead-ad field names just work.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (e) {
    console.error("lead failed", e);
    return json({ error: e instanceof Error ? e.message : "Could not save the lead." }, 500);
  }
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

/** First non-empty value whose key matches one of the names (ignoring case, spaces, underscores). */
function pick(body: Rec, names: string[]): string {
  const wanted = names.map(norm);
  for (const [k, v] of Object.entries(body)) {
    if (!wanted.includes(norm(k))) continue;
    const s = Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v);
    if (s.trim()) return s.trim();
  }
  return "";
}

const truthy = (s: string) => /^(true|yes|y|1|on|agreed|opt.?in|checked)$/i.test(s.trim());

async function handle(request: Request): Promise<Response> {
  const secret = env("LEAD_WEBHOOK_SECRET");
  const given = request.headers.get("x-api-key") ?? (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!given || !safeEqual(given, secret)) return json({ error: "Not authorised." }, 401);

  const ct = request.headers.get("content-type") ?? "";
  let body: Rec | null = null;
  if (ct.includes("application/x-www-form-urlencoded")) body = Object.fromEntries(new URLSearchParams(await request.text()));
  else body = (await request.json().catch(() => null)) as Rec | null;
  if (!body || typeof body !== "object") return json({ error: "Send the lead as JSON." }, 400);

  const first = pick(body, ["first_name", "firstname", "given_name"]);
  const last = pick(body, ["last_name", "lastname", "surname", "family_name"]);
  const name = pick(body, ["full_name", "fullname", "name", "your_name"]) || `${first} ${last}`.trim();
  const phone = pick(body, ["phone", "phone_number", "mobile", "mobile_number", "contact_number"]);
  const email = pick(body, ["email", "email_address", "work_email"]);
  if (!name) return json({ error: "The lead has no name." }, 400);
  if (!phone && !email) return json({ error: "The lead has no phone number or email." }, 400);

  const suburb = pick(body, ["suburb", "city", "town"]);
  const postcode = pick(body, ["postcode", "post_code", "zip", "zip_code", "postal_code"]);
  const address = pick(body, ["address", "street_address", "street"]);
  const message = pick(body, ["message", "notes", "comments", "comment", "enquiry", "tell_us_more"]);
  const interest = pick(body, ["services", "interest", "interested_in", "product", "what_are_you_interested_in"]);
  const source = pick(body, ["source", "lead_source"]) || "Online ad";
  const campaign = pick(body, ["campaign", "campaign_name", "ad_name", "adset_name", "form_name", "ad_id"]);
  const consent = truthy(pick(body, ["marketing_consent", "consent", "opt_in", "optin", "agree_to_marketing"]));

  const existing = await findCustomerByEmail(email);
  const rows: Row[] = [];
  const save = (kind: string, data: Rec) => rows.push(row(kind, data));

  let customer: Rec;
  if (existing) {
    customer = existing;
    // A new "yes" upgrades consent; it never overrides someone who has unsubscribed.
    if (consent && !existing.marketingConsent && !existing.unsubscribed) save("customer", { ...existing, marketingConsent: true, updatedAt: new Date().toISOString() });
  } else {
    customer = newCustomer({ name, phone, email, address, suburb, postcode, source, consent });
    save("customer", customer);
  }

  const text = `${interest} ${message}`.toLowerCase();
  const has = (...w: string[]) => w.some((x) => text.includes(x));
  const deal = newDeal(String(customer.id), {
    title: interest || "Online enquiry",
    system: { solarKw: has("solar") ? 0 : null, panelBrand: "", batteryKwh: has("batter") ? 0 : null, batteryBrand: "", inverterBrand: "", evCharger: has("ev ", "ev charger", "charger") ? "TBC" : "" },
  });
  save("deal", deal);
  save("task", newTask(String(customer.id), String(deal.id), "call", melbourneToday(), "Call the new online enquiry - aim to reach them within the day"));
  save("note", newNote(String(customer.id), String(deal.id),
    [`${source}${campaign ? ` (${campaign})` : ""}`, interest && `Interested in: ${interest}`, message && `"${message.slice(0, 500)}"`, existing && "Existing customer"].filter(Boolean).join(". ")));

  await saveRows(rows);
  return json({ ok: true, customerId: customer.id, dealId: deal.id, existingCustomer: !!existing });
}
