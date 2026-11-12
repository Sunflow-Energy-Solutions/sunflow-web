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
};

type Row = { id: string; kind: string; data: Record<string, unknown>; deleted: boolean; updated_at: string };

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

    const parsed = lead.suburb || lead.postcode ? { street: lead.address ?? "", suburb: lead.suburb ?? "", state: lead.state ?? "", postcode: lead.postcode ?? "" } : splitAddress(lead.address ?? "");
    const [firstName, ...rest] = lead.name.trim().split(/\s+/);
    const rows: Row[] = [];
    const upsert = (kind: string, data: Record<string, unknown>) =>
      rows.push({ id: String(data.id), kind, data, deleted: false, updated_at: now });

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
        address: parsed.street, suburb: parsed.suburb, state: parsed.state || lead.state?.toUpperCase() || "VIC", postcode: parsed.postcode, kind: "Residential", source: lead.source,
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
      text: `${lead.source}${lead.services?.length ? `: ${lead.services.join(", ")}` : ""}${lead.notes ? `. "${lead.notes.slice(0, 500)}"` : ""}${existing ? " (existing customer)" : ""}`,
      createdAt: now, updatedAt: now,
    });

    const res = await fetch(`${base}/rest/v1/records`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    if (!res.ok) console.error("CRM lead save failed", res.status, await res.text());
  } catch (error) {
    console.error("CRM lead save failed", error);
  }
}
