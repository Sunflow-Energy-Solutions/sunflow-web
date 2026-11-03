import { evaluate } from "./energy/engine";
import type { Assumptions, DayProfile, Plan, ScenarioResult } from "./energy/types";
import type { WorkerMessage, WorkerRequest } from "./engine.worker";

// Injected by build.mjs: the engine worker's compiled source.
declare const __ENGINE_WORKER__: string;

export interface Job {
  planIndex: number;
  battery: number;
  solar: number;
}

/**
 * Runs scenario evaluations in a pool of background workers so the page stays responsive.
 * Falls back to the main thread if workers aren't available (e.g. a locked-down browser).
 */
export async function runJobs(
  plans: Plan[],
  base: DayProfile,
  assumptions: Assumptions,
  jobs: Job[],
  onProgress: (fraction: number) => void
): Promise<{ job: Job; result: ScenarioResult }[]> {
  if (jobs.length === 0) return [];
  const total = jobs.length;
  let finished = 0;
  const report = (n: number) => {
    finished += n;
    onProgress(Math.min(1, finished / total));
  };

  try {
    if (typeof Worker === "undefined" || typeof __ENGINE_WORKER__ === "undefined") throw new Error("no workers");
    const url = URL.createObjectURL(new Blob([__ENGINE_WORKER__], { type: "text/javascript" }));
    const poolSize = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    const chunks: Job[][] = Array.from({ length: poolSize }, () => []);
    jobs.forEach((j, i) => chunks[i % poolSize].push(j));

    const parts = await Promise.all(
      chunks
        .filter((c) => c.length > 0)
        .map(
          (chunk) =>
            new Promise<{ job: Job; result: ScenarioResult }[]>((resolve, reject) => {
              const w = new Worker(url);
              w.onmessage = (e: MessageEvent<WorkerMessage>) => {
                if (e.data.type === "progress") report(e.data.done);
                else {
                  w.terminate();
                  resolve(e.data.results.map((r, i) => ({ job: chunk[i], result: r.result })));
                }
              };
              w.onerror = (err) => {
                w.terminate();
                reject(err);
              };
              const req: WorkerRequest = { plans, base, assumptions, jobs: chunk };
              w.postMessage(req);
            })
        )
    );
    URL.revokeObjectURL(url);
    onProgress(1);
    return parts.flat();
  } catch {
    finished = 0;
    const out: { job: Job; result: ScenarioResult }[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      out.push({ job: j, result: evaluate(plans[j.planIndex], base, j.battery, j.solar, assumptions) });
      if (i % 5 === 4) {
        report(5);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    onProgress(1);
    return out;
  }
}
