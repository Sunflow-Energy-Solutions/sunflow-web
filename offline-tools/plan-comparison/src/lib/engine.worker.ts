import { evaluate } from "./energy/engine";
import type { Assumptions, DayProfile, Plan, ScenarioResult } from "./energy/types";

export interface WorkerRequest {
  plans: Plan[];
  base: DayProfile;
  assumptions: Assumptions;
  jobs: { planIndex: number; battery: number; solar: number }[];
}

export type WorkerMessage =
  | { type: "progress"; done: number }
  | { type: "done"; results: { planIndex: number; result: ScenarioResult }[] };

const ctx = self as unknown as { onmessage: (e: MessageEvent<WorkerRequest>) => void; postMessage: (m: WorkerMessage) => void };

ctx.onmessage = (e) => {
  const { plans, base, assumptions, jobs } = e.data;
  const results: { planIndex: number; result: ScenarioResult }[] = [];
  jobs.forEach((j, i) => {
    results.push({ planIndex: j.planIndex, result: evaluate(plans[j.planIndex], base, j.battery, j.solar, assumptions) });
    if ((i + 1) % 5 === 0) ctx.postMessage({ type: "progress", done: 5 });
  });
  ctx.postMessage({ type: "done", results });
};
