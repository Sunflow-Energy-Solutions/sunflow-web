import { isAdmin, json, requireStaff, sb } from "./_lib.js";
import { applySigned, matchDeal } from "./_pylon-apply.js";
import { getDesign, getProject, listAcceptedProjects } from "./_pylon.js";

/**
 * Brings in jobs customers signed in Pylon BEFORE the live webhook was connected (or while it was down).
 * Admin only. Two steps so nothing is imported by surprise:
 *   { action: "list", since }     -> signed projects since that date, and whether each is already in the CRM
 *   { action: "import", projectIds } -> imports up to 3 at a time (each import fetches the signed design from Pylon)
 * Safe to run repeatedly: a project already imported (same signed design) is skipped.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request);
  } catch (e) {
    console.error("pylon-import failed", e);
    return json({ error: e instanceof Error ? e.message : "Import failed." }, 500);
  }
}

async function alreadyImported(projectId: string): Promise<boolean> {
  const res = await sb(`records?kind=eq.deal&deleted=eq.false&select=id&data->pylon->>projectId=eq.${encodeURIComponent(projectId)}`);
  return res.ok && ((await res.json()) as unknown[]).length > 0;
}

/** Runs `fn` over items a few at a time so a long list doesn't take minutes. */
async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

async function handle(request: Request): Promise<Response> {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return json({ error: "Please sign in again." }, 401);
  if (!(await isAdmin(staff.email))) return json({ error: "Only an admin can import from Pylon." }, 403);
  const body = (await request.json().catch(() => ({}))) as { action?: string; since?: string | null; projectIds?: string[] };

  if (body.action === "list") {
    const since = body.since && !isNaN(Date.parse(body.since)) ? new Date(body.since).toISOString() : null;
    const projects = await listAcceptedProjects(since, 200);
    const rows = await inBatches(projects, 5, async (p) => {
      const imported = await alreadyImported(p.id);
      const match = imported ? { deal: null, customer: null } : await matchDeal(p, "");
      return {
        projectId: p.id, name: p.name, email: p.email, suburb: p.suburb, createdAt: p.createdAt ?? "",
        hasSignedDesign: !!p.signedDesignId,
        imported,
        // what will happen: update an existing job, add a job to an existing customer, or create a customer
        willDo: imported ? "already in the CRM" : match.deal ? "update existing job" : match.customer ? "add job to existing customer" : "create new customer",
      };
    });
    return json({ projects: rows, capped: projects.length >= 200 });
  }

  if (body.action === "import") {
    const ids = (body.projectIds ?? []).filter((x) => typeof x === "string" && x).slice(0, 3);
    if (!ids.length) return json({ error: "No projects chosen." }, 400);
    const results = await Promise.all(ids.map(async (id) => {
      try {
        // never import the same Pylon project twice, however the customer matching would have gone
        if (await alreadyImported(id)) return { projectId: id, ok: true, status: "duplicate", customer: "", title: "" };
        const project = await getProject(id);
        if (!project.signedDesignId) return { projectId: id, ok: false, message: "Pylon shows no signed design for this project" };
        const design = await getDesign(project.signedDesignId);
        const r = await applySigned({ project, projectId: id, design, designId: project.signedDesignId });
        return { projectId: id, ok: true, status: r.status, customer: r.customerName, title: r.title, dealId: r.dealId };
      } catch (e) {
        return { projectId: id, ok: false, message: e instanceof Error ? e.message : "Failed" };
      }
    }));
    return json({ results });
  }

  return json({ error: "Unknown request." }, 400);
}
