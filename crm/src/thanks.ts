import type { AppSettings, Customer, Deal } from "./types";

export type ReviewLink = { label: string; url: string };

const isHttps = (u: string) => /^https:\/\/\S+$/i.test(u.trim());

/** The review links an admin has set up, in the order they're shown. */
export function reviewLinks(s: AppSettings): ReviewLink[] {
  const out: ReviewLink[] = [];
  if (isHttps(s.googleReviewUrl)) out.push({ label: "Review us on Google", url: s.googleReviewUrl.trim() });
  if (isHttps(s.facebookReviewUrl)) out.push({ label: "Review us on Facebook", url: s.facebookReviewUrl.trim() });
  if (isHttps(s.otherReviewUrl)) out.push({ label: s.otherReviewLabel.trim() || "Leave a review", url: s.otherReviewUrl.trim() });
  return out;
}

/** "13.2 kW solar and 20 kWh battery" - short enough to read naturally in a sentence. */
export function shortSystem(deal: Deal): string {
  const s = deal.system;
  const parts = [s.solarKw ? `${s.solarKw} kW solar` : "", s.batteryKwh ? `${s.batteryKwh} kWh battery` : "", s.evCharger && s.evCharger !== "TBC" ? "EV charger" : ""].filter(Boolean);
  if (parts.length) return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return deal.title && !/^new system$/i.test(deal.title) ? deal.title : "new energy system";
}

export type Vars = { firstName: string; system: string; reviewLink: string };

export function thanksVars(c: Customer, deal: Deal, s: AppSettings): Vars {
  return { firstName: c.firstName.trim() || "there", system: shortSystem(deal), reviewLink: reviewLinks(s)[0]?.url ?? "" };
}

export const fill = (text: string, v: Vars) =>
  text
    .replace(/\{\{\s*firstName\s*\}\}/gi, v.firstName)
    .replace(/\{\{\s*system\s*\}\}/gi, v.system)
    .replace(/\{\{\s*reviewLink\s*\}\}/gi, v.reviewLink);

/** sms: link that opens the phone's messaging app with the text ready to send. The "?&" form works on both iPhone and Android. */
export const smsLink = (phone: string, body: string) => `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;
