import type { Deal, Stage, Task, TaskKind } from "./types";
import { addDays, addMonths, nowIso, today, uid } from "./utils";

/**
 * Follow-up rules. When a deal moves to a stage, these tasks are created automatically so nobody
 * has to remember. Change the numbers here to change how often the team chases.
 */
type Rule = { kind: TaskKind; due: () => string; note: (d: Deal) => string };

const RULES: Partial<Record<Stage, Rule[]>> = {
  new: [{ kind: "call", due: () => today(), note: () => "Call the new enquiry - aim to reach them within the day" }],
  contacted: [{ kind: "visit", due: () => addDays(3), note: () => "Book the site assessment" }],
  assessment: [{ kind: "quote", due: () => addDays(2), note: () => "Prepare and send the quote" }],
  quoted: [
    { kind: "call", due: () => addDays(3), note: () => "Follow up the quote - any questions?" },
    { kind: "call", due: () => addDays(10), note: () => "Second follow-up on the quote" },
  ],
  negotiating: [{ kind: "call", due: () => addDays(2), note: () => "Check in - can we close this?" }],
  won: [
    { kind: "install", due: () => addDays(2), note: () => "Confirm install date, deposit and paperwork (STC / rebate forms)" },
  ],
  lost: [
    {
      kind: "call",
      due: () => addDays(30),
      note: (d) => `Friendly check-in${d.lostReason ? ` (they said: ${d.lostReason})` : ""} - still thinking about it?`,
    },
    { kind: "email", due: () => addMonths(6), note: () => "6 month re-contact: send a current special" },
  ],
  installed: [
    { kind: "call", due: () => addDays(14), note: () => "Post-install check-in: system working well? Ask for a Google review / referral" },
    { kind: "checkup", due: () => addMonths(12), note: () => "12 month system check-up call" },
  ],
};

export function tasksForStage(deal: Deal, stage: Stage): Task[] {
  const t = nowIso();
  return (RULES[stage] ?? []).map((r) => ({
    id: uid(),
    customerId: deal.customerId,
    dealId: deal.id,
    kind: r.kind,
    due: r.due(),
    note: r.note(deal),
    done: false,
    doneAt: null,
    auto: true,
    createdAt: t,
    updatedAt: t,
  }));
}

/** Open auto tasks from the old stage are obsolete once the deal moves on. */
export function obsoleteTaskIds(tasks: Task[], dealId: string): string[] {
  return tasks.filter((t) => t.dealId === dealId && t.auto && !t.done).map((t) => t.id);
}

export type Upgrade = { dealId: string; customerId: string; reason: string; pitch: string };

/** Installed customers who might be ready for more. Shown on the Today screen. */
export function upgradeOpportunities(deals: Deal[]): Upgrade[] {
  const out: Upgrade[] = [];
  for (const d of deals) {
    if (d.stage !== "installed" || !d.installedOn) continue;
    const years = (Date.now() - new Date(`${d.installedOn}T00:00:00`).getTime()) / (365.25 * 86400000);
    const s = d.system;
    const base = { dealId: d.id, customerId: d.customerId };
    if (s.solarKw && !s.batteryKwh)
      out.push({ ...base, reason: "Solar but no battery", pitch: "A battery uses more of their own solar after dark." });
    if (s.solarKw && !s.evCharger && years >= 0.5)
      out.push({ ...base, reason: "No EV charger", pitch: "A smart EV charger that runs off their solar." });
    if (s.solarKw && s.solarKw < 6.6 && years >= 2)
      out.push({ ...base, reason: `Small system (${s.solarKw} kW)`, pitch: "Room to expand the array." });
    if (years >= 5)
      out.push({ ...base, reason: `System is ${Math.floor(years)} years old`, pitch: "Offer a system health check and inverter / battery review." });
  }
  return out;
}
