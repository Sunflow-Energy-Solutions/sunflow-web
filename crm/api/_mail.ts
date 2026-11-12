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

/** Plain internal email (no unsubscribe footer): a heading, a short list of facts, and an action button. For staff, not customers. */
export function renderInternalEmail(opts: { heading: string; intro?: string; rows: [string, string][]; button?: Button; footer?: string }): string {
  const rows = opts.rows
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7386;font-size:14px;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:15px;font-weight:600">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");
  const button = opts.button
    ? `<p style="margin:22px 0 0"><a href="${escapeHtml(opts.button.url)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#fdb813;color:#0a1730;font-weight:bold;font-size:15px;text-decoration:none">${escapeHtml(opts.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#0a1730">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a1730;padding:16px 24px;color:#fdb813;font-size:18px;font-weight:bold">Sunflow CRM</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 6px;font-size:20px">${escapeHtml(opts.heading)}</h1>
${opts.intro ? `<p style="margin:0 0 14px;color:#6b7386;font-size:14px;line-height:1.5">${escapeHtml(opts.intro)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>${button}
</td></tr>
${opts.footer ? `<tr><td style="padding:14px 24px;border-top:1px solid #e2e5eb;font-size:12px;color:#6b7386">${escapeHtml(opts.footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
