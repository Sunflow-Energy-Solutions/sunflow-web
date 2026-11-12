import { useState } from "react";
import { callApi } from "../api";
import { Button, Card, Select } from "../components/ui";
import { fmtDate } from "../utils";

type Item = { projectId: string; name: string; email: string; suburb: string; createdAt: string; hasSignedDesign: boolean; imported: boolean; willDo: string };
type Result = { projectId: string; ok: boolean; status?: string; customer?: string; title?: string; message?: string };

const PERIODS: [string, number | null][] = [["Last 30 days", 30], ["Last 90 days", 90], ["Last 12 months", 365], ["Everything", null]];

/** Admin tool (More -> Pylon): find jobs customers already signed in Pylon and bring them into the CRM. */
export default function PylonImport() {
  const [period, setPeriod] = useState("90");
  const [items, setItems] = useState<Item[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  async function find() {
    setBusy("Looking in Pylon...");
    setErr("");
    setResults([]);
    try {
      const days = period === "all" ? null : Number(period);
      const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;
      const out = await callApi<{ projects: Item[]; capped: boolean }>("/api/pylon-import", { action: "list", since });
      setItems(out.projects);
      setPicked(new Set(out.projects.filter((p) => !p.imported && p.hasSignedDesign).map((p) => p.projectId)));
      if (out.capped) setErr("Showing the newest 200. Choose a shorter period to see the rest.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reach Pylon");
    } finally {
      setBusy("");
    }
  }

  async function run() {
    const ids = [...picked];
    setResults([]);
    setErr("");
    try {
      for (let i = 0; i < ids.length; i += 3) {
        setBusy(`Importing ${Math.min(i + 3, ids.length)} of ${ids.length}...`);
        const out = await callApi<{ results: Result[] }>("/api/pylon-import", { action: "import", projectIds: ids.slice(i, i + 3) });
        setResults((r) => [...r, ...out.results]);
      }
      // mark the imported ones so they can't be picked again
      setItems((cur) => cur?.map((p) => (ids.includes(p.projectId) ? { ...p, imported: true, willDo: "already in the CRM" } : p)) ?? cur);
      setPicked(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import stopped");
    } finally {
      setBusy("");
    }
  }

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Card className="space-y-3 p-4 text-sm">
      <p className="text-mist-500">Bring in jobs customers already signed in Pylon (for example before the live connection was switched on). Nothing is imported until you choose it.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" aria-label="Period">
          {PERIODS.map(([label, d]) => <option key={label} value={d ?? "all"}>{label}</option>)}
        </Select>
        <Button size="sm" variant="soft" disabled={!!busy} onClick={find}>Find signed jobs</Button>
        {busy && <span className="font-medium text-navy-600">{busy}</span>}
      </div>
      {err && <p className="rounded-xl bg-red-50 px-3 py-2 font-medium text-red-700">{err}</p>}

      {items && (items.length === 0 ? (
        <p className="rounded-xl bg-mist-50 px-3 py-2 text-mist-500">No signed jobs found in that period.</p>
      ) : (
        <>
          <ul className="divide-y divide-mist-100 rounded-xl border border-mist-200">
            {items.map((p) => (
              <li key={p.projectId} className="flex items-start gap-3 p-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-[#f7931e]"
                  checked={picked.has(p.projectId)}
                  disabled={p.imported || !p.hasSignedDesign}
                  onChange={() => toggle(p.projectId)}
                  aria-label={`Import ${p.name}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.name || "(no name)"}{p.suburb ? <span className="font-normal text-mist-500"> · {p.suburb}</span> : null}</span>
                  <span className="block text-xs text-mist-500">{p.email}{p.createdAt ? ` · started ${fmtDate(p.createdAt)}` : ""}</span>
                  <span className={`block text-xs font-semibold ${p.imported ? "text-emerald-700" : p.hasSignedDesign ? "text-navy-600" : "text-amber-700"}`}>
                    {p.hasSignedDesign ? p.willDo : "Pylon shows no signed design - skipped"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Button disabled={!!busy || picked.size === 0} onClick={run}>Import {picked.size} job{picked.size === 1 ? "" : "s"}</Button>
        </>
      ))}

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={r.projectId} className={`rounded-lg px-3 py-1.5 ${r.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              {r.ok ? `${r.customer || "Customer"}: ${r.title} - ${r.status === "created" ? "new customer created" : r.status === "duplicate" ? "was already imported" : "job updated and moved to Won"}` : `${r.projectId}: ${r.message}`}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
