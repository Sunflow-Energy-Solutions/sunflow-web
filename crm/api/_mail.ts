import { BUSINESS, escapeHtml } from "./_lib.js";

export type Button = { label: string; url: string };

/** Branded email shell shared by specials and thank-you emails. `body` is plain text; line breaks are kept. */
export function renderEmail(opts: { body: string; buttons?: Button[]; unsubscribeUrl: string; reason: string }): string {
  const text = escapeHtml(opts.body).replace(/\n/g, "<br>");
  const buttons = (opts.buttons ?? [])
    .map((b) => `<a href="${escapeHtml(b.url)}" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 20px;border-radius:10px;background:#fdb813;color:#0a1730;font-weight:bold;font-size:15px;text-decoration:none">${escapeHtml(b.label)}</a>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#0a1730">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a1730;padding:18px 24px;color:#fdb813;font-size:20px;font-weight:bold">${BUSINESS.name}</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.6">${text}${buttons ? `<div style="margin-top:18px">${buttons}</div>` : ""}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e5eb;font-size:12px;line-height:1.5;color:#6b7386">
${BUSINESS.name} · ${BUSINESS.abn} · ${BUSINESS.phone} · <a href="${BUSINESS.web}" style="color:#6b7386">${BUSINESS.web.replace("https://", "")}</a><br>
${escapeHtml(opts.reason)}
<a href="${opts.unsubscribeUrl}" style="color:#6b7386">Unsubscribe</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** Only https links are allowed in buttons, and labels are trimmed. */
export function cleanButtons(input: unknown): Button[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((b): b is Button => !!b && typeof (b as Button).label === "string" && typeof (b as Button).url === "string")
    .filter((b) => /^https:\/\/\S+$/i.test(b.url.trim()))
    .slice(0, 4)
    .map((b) => ({ label: b.label.trim().slice(0, 60) || "Open", url: b.url.trim() }));
}
