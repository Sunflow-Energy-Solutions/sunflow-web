import { env } from "./_lib";
import { exchange, saveTokens, validState } from "./_xero";

/** Xero sends the admin back here after they approve access. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const home = env("APP_URL").replace(/\/$/, "");
  const back = (status: string) => Response.redirect(`${home}/#/settings?xero=${status}`, 302);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (url.searchParams.get("error") || !code || !validState(state)) return back("failed");

  try {
    const redirect_uri = `${home}/api/xero-callback`;
    const t = await exchange({ grant_type: "authorization_code", code, redirect_uri });

    const conns = await fetch("https://api.xero.com/connections", { headers: { Authorization: `Bearer ${t.access_token}` } });
    const list = (await conns.json().catch(() => [])) as { tenantId: string; tenantName: string; tenantType?: string }[];
    const org = list.find((c) => c.tenantType !== "PRACTICE") ?? list[0];
    if (!org) return back("failed");

    await saveTokens({
      access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000,
      tenant_id: org.tenantId, tenant_name: org.tenantName,
    });
    return back("connected");
  } catch {
    return back("failed");
  }
}
