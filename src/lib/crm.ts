/**
 * Sends website enquiries into the Sunflow CRM (the staff app in /crm) so nobody has to re-type them.
 * Needs CRM_SUPABASE_URL and CRM_SUPABASE_SERVICE_ROLE_KEY. If they are missing, or anything goes wrong,
 * this quietly does nothing: the notification email is the primary record and must never be blocked by the CRM.
 */

type Lead = {
  name: string;
  phone: string;
  email?: string;
  /** Full address as typed, or just the street if suburb/postcode are given separately */
  address?: string;
  suburb?: string;
  /** State code if known (VIC, NSW...) */
  state?: string;
  postcode?: string;
  services?: string[];
  notes?: string;
  /** Where it came from, e.g. "Website quote form" */
  source: string;
  /** Only true if the person ticked the "email me offers" box */
  marketingConsent?: boolean;
  /** Campaign tags / referrer the browser remembered (see lib/attribution.ts). Untrusted: cleaned before use. */
  attribution?: unknown;
};

type Att = { utmSource: string; utmMedium: string; utmCampaign: string; utmContent: string; utmTerm: string; gclid: boolean; fbclid: boolean; referrerHost: string; landingPath: string };

/** Only plain, short strings and booleans are accepted from the browser. */
function readAttribution(v: unknown): Att {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).replace(/[<>]/g, "").trim().slice(0, 120) : "");
  return {
    utmSource: s("utmSource"), utmMedium: s("utmMedium"), utmCampaign: s("utmCampaign"), utmContent: s("utmContent"), utmTerm: s("utmTerm"),
    gclid: o.gclid === true, fbclid: o.fbclid === true, referrerHost: s("referrerHost"), landingPath: s("landingPath"),
  };
}

/** The channel (a value of the CRM's "How did they find us?" list) and campaign name for an enquiry. */
function channelOf(a: Att): { channel: string; campaign: string } {
  const src = a.utmSource.toLowerCase();
  const med = a.utmMedium.toLowerCase();
  const ref = a.referrerHost.toLowerCase();
  const paid = /cpc|ppc|paid|ads?$|display|retarget/.test(med);
  const campaign = a.utmCampaign || a.utmContent || "";

  if (a.fbclid || /facebook|^fb$|instagram|^ig$|meta/.test(src)) {
    return { channel: paid || a.fbclid ? "Facebook / Instagram ad" : "Facebook / Instagram (organic)", campaign };
  }
  if (a.gclid || (/google/.test(src) && paid)) return { channel: "Google ad", campaign };
  if (src) return { channel: `Other: ${a.utmSource}`, campaign };
  if (/(^|\.)google\./.test(ref)) return { channel: "Google search / Maps", campaign: "" };
  if (/facebook\.|instagram\.|^l\.facebook|^lm\.facebook/.test(ref)) return { channel: "Facebook / Instagram (organic)", campaign: "" };
  if (/bing\.|duckduckgo\.|yahoo\./.test(ref)) return { channel: "Other search engine", campaign: "" };
  if (ref) return { channel: `Website referral: ${a.referrerHost}`, campaign: "" };
  return { channel: "Website (direct)", campaign: "" };
}

type Row = { id: string; kind: string; data: Record<string, unknown>; deleted: boolean; updated_at: string; owner: string | null };

const melbourneToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());

/** "12 Smith St, Berwick VIC 3806, Australia" -> street, suburb, state, postcode */
function splitAddress(address: string): { street: string; suburb: string; state: string; postcode: string } {
  const m = address.match(/^(.*?),\s*([^,]+?)\s+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})/i);
  return m
    ? { street: m[1].trim(), suburb: m[2].trim(), state: m[3].toUpperCase(), postcode: m[4] }
    : { street: address.trim(), suburb: "", state: "", postcode: "" };
}

export async function pushLeadToCrm(lead: Lead): Promise<void> {
  const base = process.env.CRM_SUPABASE_URL;
  const key = process.env.CRM_SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;

  try {
    // Legacy service_role keys are JWTs (both headers); newer sb_secret_ keys go in apikey only.
    const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
    if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
    const now = new Date().toISOString();
    const email = (lead.email ?? "").trim();

    // Already a customer? Match on email so a repeat enquiry lands on the same record.
    let existing: Record<string, unknown> | null = null;
    if (email) {
      const res = await fetch(
        `${base}/rest/v1/records?kind=eq.customer&deleted=eq.false&select=data&data->>email=ilike.${encodeURIComponent(email)}`,
        { headers },
      );
      if (res.ok) {
        const rows = (await res.json()) as { data: Record<string, unknown> }[];
        existing = rows.find((r) => String(r.data.email ?? "").trim().toLowerCase() === email.toLowerCase())?.data ?? null;
      }
    }

    const att = readAttribution(lead.attribution);
    const { channel, campaign } = channelOf(att);
    const parsed = lead.suburb || lead.postcode ? { street: lead.address ?? "", suburb: lead.suburb ?? "", state: lead.state ?? "", postcode: lead.postcode ?? "" } : splitAddress(lead.address ?? "");
    const [firstName, ...rest] = lead.name.trim().split(/\s+/);
    const rows: Row[] = [];
    // A repeat enquiry from a customer who is already assigned goes straight to whoever looks after them (the database only
    // shows records to their owner and to admins); a brand-new lead has no owner and waits for an admin to assign it.
    const owner = existing?.assignedTo ? String(existing.assignedTo) : null;
    const upsert = (kind: string, data: Record<string, unknown>) =>
      rows.push({ id: String(data.id), kind, data, deleted: false, updated_at: now, owner });

    let customerId: string;
    if (existing) {
      customerId = String(existing.id);
      // A new "yes, email me" tick upgrades consent; it never overrides someone who has unsubscribed.
      if (lead.marketingConsent && !existing.marketingConsent && !existing.unsubscribed) {
        upsert("customer", { ...existing, marketingConsent: true, updatedAt: now });
      }
    } else {
      customerId = crypto.randomUUID();
      upsert("customer", {
        id: customerId, firstName: firstName ?? "", lastName: rest.join(" "), phone: lead.phone.trim(), email,
        address: parsed.street, suburb: parsed.suburb, state: parsed.state || lead.state?.toUpperCase() || "VIC", postcode: parsed.postcode, kind: "Residential", source: channel,
        notes: "", marketingConsent: !!lead.marketingConsent, unsubscribed: false, createdAt: now, updatedAt: now,
      });
    }

    const services = (lead.services ?? []).map((s) => s.toLowerCase());
    const has = (w: string) => services.some((s) => s.includes(w));
    const dealId = crypto.randomUUID();
    upsert("deal", {
      id: dealId, customerId,
      title: (lead.services ?? []).join(" + ") || "Website enquiry",
      stage: "new",
      // where this enquiry came from (kept per enquiry, so a repeat customer's second job has its own source)
      source: channel, campaign,
      system: {
        solarKw: has("solar") ? 0 : null, panelBrand: "", batteryKwh: has("batter") ? 0 : null, batteryBrand: "",
        inverterBrand: "", evCharger: has("ev") || has("charger") ? "TBC" : "",
      },
      quotes: [], value: null, installDate: null, installedOn: null, lostReason: "", createdAt: now, updatedAt: now,
    });
    upsert("task", {
      id: crypto.randomUUID(), customerId, dealId, kind: "call", due: melbourneToday(),
      note: "Call the new website enquiry - aim to reach them within the day", done: false, doneAt: null, auto: true,
      createdAt: now, updatedAt: now,
    });
    upsert("note", {
      id: crypto.randomUUID(), customerId, dealId, kind: "system",
      text: [
        `${lead.source}${lead.services?.length ? `: ${lead.services.join(", ")}` : ""}`,
        `Came from: ${channel}${campaign ? ` - ${campaign}` : ""}${att.landingPath ? ` (landed on ${att.landingPath})` : ""}`,
        lead.notes ? `"${lead.notes.slice(0, 500)}"` : "",
        existing ? "Existing customer" : "",
      ].filter(Boolean).join(". "),
      createdAt: now, updatedAt: now,
    });

    const post = (body: unknown) =>
      fetch(`${base}/rest/v1/records`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(body) });
    let res = await post(rows);
    // The CRM database update that adds the owner column hasn't been run yet: save without it rather than lose the lead.
    if (!res.ok && /owner/i.test(await res.clone().text())) res = await post(rows.map((r) => { const c: Record<string, unknown> = { ...r }; delete c.owner; return c; }));
    if (!res.ok) console.error("CRM lead save failed", res.status, await res.text());
  } catch (error) {
    console.error("CRM lead save failed", error);
  }
}
