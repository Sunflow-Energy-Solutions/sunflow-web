/**
 * Remembers where a website visitor came from (ad campaign tags or the site that sent them) for 30 days, so a quote request
 * can say "Facebook ad - Spring Battery Offer" instead of just "website". Stored only in the visitor's own browser and sent
 * along with a form they choose to submit. Raw ad click IDs are not kept: only whether one was present.
 */
export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** A Google Ads click id was in the link */
  gclid?: boolean;
  /** A Facebook / Instagram ad click id was in the link */
  fbclid?: boolean;
  /** Site that sent them, e.g. "google.com" (empty when they typed the address or came from a bookmark) */
  referrerHost?: string;
  landingPath?: string;
  at?: number;
};

const KEY = "sunflow-attribution";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function read(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attribution;
    return a.at && Date.now() - a.at < TTL_MS ? a : null;
  } catch {
    return null;
  }
}

const clip = (v: string | null) => (v ? v.slice(0, 120) : undefined);

/** Call once per page view. A link with campaign tags replaces what was stored; otherwise the first touch is kept. */
export function captureAttribution(): void {
  try {
    const p = new URLSearchParams(location.search);
    const tagged = ["utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid"].some((k) => p.has(k));
    const existing = read();
    if (!tagged && existing) return;

    const own = location.hostname.replace(/^www\./, "");
    let referrerHost = "";
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
    } catch {
      /* ignore a malformed referrer */
    }
    const a: Attribution = {
      utmSource: clip(p.get("utm_source")), utmMedium: clip(p.get("utm_medium")), utmCampaign: clip(p.get("utm_campaign")),
      utmContent: clip(p.get("utm_content")), utmTerm: clip(p.get("utm_term")),
      gclid: p.has("gclid") || undefined, fbclid: p.has("fbclid") || undefined,
      referrerHost: referrerHost && referrerHost !== own ? referrerHost : undefined,
      landingPath: location.pathname.slice(0, 120),
      at: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage blocked: the form simply sends no source details */
  }
}

/** What to attach to a form submission (null if nothing is known). */
export function getAttribution(): Attribution | null {
  return read();
}
