import { BUSINESS, env, escapeHtml, serviceHeaders, verify } from "./_lib";

const page = (title: string, message: string, form?: { id: string; sig: string }) =>
  new Response(
    `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;color:#0a1730">
<div style="max-width:420px;margin:24px;background:#fff;border-radius:16px;padding:28px;text-align:center">
<h1 style="font-size:22px;margin:0 0 8px">${escapeHtml(title)}</h1><p style="color:#6b7386;line-height:1.5">${escapeHtml(message)}</p>
${form ? `<form method="POST" action="/api/unsubscribe?id=${encodeURIComponent(form.id)}&sig=${form.sig}"><button style="margin-top:12px;min-height:46px;padding:0 24px;border:0;border-radius:12px;background:#fdb813;font-weight:bold;font-size:16px">Unsubscribe me</button></form>` : ""}
<p style="margin-top:20px;font-size:12px;color:#9aa3b2">${BUSINESS.name} · ${BUSINESS.phone}</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

/** GET only shows a confirm button, so email scanners that pre-open links can't unsubscribe people by accident. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  if (!id || !sig || !verify(id, sig)) return page("Link not valid", `This unsubscribe link isn't valid. Please call us on ${BUSINESS.phone} and we'll remove you.`);
  return page("Unsubscribe", "Stop receiving specials and offers from Sunflow?", { id, sig });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  if (!id || !sig || !verify(id, sig)) return page("Link not valid", `This unsubscribe link isn't valid. Please call us on ${BUSINESS.phone} and we'll remove you.`);

  const base = `${env("SUPABASE_URL")}/rest/v1/records`;
  const headers = { ...serviceHeaders(env("SUPABASE_SERVICE_ROLE_KEY")), "Content-Type": "application/json" };

  const found = await fetch(`${base}?id=eq.${encodeURIComponent(id)}&kind=eq.customer&select=data`, { headers });
  const rows = (await found.json().catch(() => [])) as { data: Record<string, unknown> }[];
  if (!found.ok || rows.length === 0) return page("Something went wrong", `We couldn't update your details. Please call ${BUSINESS.phone} and we'll remove you.`);

  const now = new Date().toISOString();
  const patch = await fetch(`${base}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: { ...rows[0].data, unsubscribed: true, marketingConsent: false, updatedAt: now }, updated_at: now }),
  });
  if (!patch.ok) return page("Something went wrong", `We couldn't update your details. Please call ${BUSINESS.phone} and we'll remove you.`);
  return page("You're unsubscribed", "You won't receive any more specials from us. Thanks for letting us know.");
}
