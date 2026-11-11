import { emptyDb, emptySystem, type Db, type Deal, type Stage, type SystemChoice } from "./types";
import { addDays, addMonths, today } from "./utils";

/** A handful of realistic sample records so the screens can be tried before real data is entered. */
export function demoData(uid: () => string, nowIso: () => string): Db {
  const db = emptyDb();
  const t = nowIso();

  const people: [string, string, string, string, string, string, boolean, Stage, Partial<SystemChoice>, number | null, string | null, string | null][] = [
    ["Sarah", "Nguyen", "0412 555 101", "sarah.nguyen@example.com", "Berwick", "3806", true, "new", { solarKw: 0 }, null, null, null],
    ["Mark", "Taylor", "0423 555 202", "mark.taylor@example.com", "Frankston", "3199", true, "quoted", { solarKw: 13.2, batteryKwh: 20, inverterBrand: "Sigenergy" }, 21900, null, null],
    ["Priya", "Patel", "0434 555 303", "priya.patel@example.com", "Glen Waverley", "3150", true, "won", { solarKw: 9.9, batteryKwh: 10, inverterBrand: "Sungrow" }, 14800, addDays(9), null],
    ["Tom", "Edwards", "0445 555 404", "tom.edwards@example.com", "Geelong", "3220", true, "installed", { solarKw: 6.6, inverterBrand: "GoodWe" }, 6200, null, addMonths(-30)],
    ["Linda", "Costa", "0456 555 505", "linda.costa@example.com", "Werribee", "3030", true, "installed", { solarKw: 5, panelBrand: "Trina", inverterBrand: "Fronius" }, 5400, null, addMonths(-70)],
    ["Dave", "Kowalski", "0467 555 606", "dave.k@example.com", "Mornington", "3931", false, "lost", { solarKw: 8, batteryKwh: 10 }, 15900, null, null],
  ];

  people.forEach(([first, last, phone, email, suburb, postcode, consent, stage, sys, value, install, installedOn]) => {
    const cid = uid();
    db.customers.push({
      id: cid, firstName: first, lastName: last, phone, email, address: "", suburb, postcode, kind: "Residential",
      source: "Website quote form", notes: "", marketingConsent: consent, unsubscribed: false, createdAt: t, updatedAt: t,
    });
    const deal: Deal = {
      id: uid(), customerId: cid, title: "", stage, system: { ...emptySystem(), ...sys }, quotes: [], value,
      installDate: install, installedOn, lostReason: stage === "lost" ? "Price too high" : "", createdAt: t, updatedAt: t,
    };
    const s = deal.system;
    deal.title = [s.solarKw && `${s.solarKw}kW solar`, s.batteryKwh && `${s.batteryKwh}kWh battery`].filter(Boolean).join(" + ") || "Solar enquiry";
    if (["quoted", "won", "installed", "lost"].includes(stage) && value)
      deal.quotes.push({ id: uid(), number: "Q-001", date: addDays(-12), amount: value, summary: deal.title, status: stage === "quoted" || stage === "lost" ? (stage === "lost" ? "declined" : "sent") : "accepted" });
    db.deals.push(deal);
  });

  const first = db.customers[0], second = db.customers[1], third = db.customers[2];
  const task = (customerId: string, dealIdx: number, kind: "call" | "install" | "visit", due: string, note: string) =>
    db.tasks.push({ id: uid(), customerId, dealId: db.deals[dealIdx].id, kind, due, note, done: false, doneAt: null, auto: false, createdAt: t, updatedAt: t });
  task(first.id, 0, "call", today(), "Call the new enquiry - aim to reach them within the day");
  task(second.id, 1, "call", addDays(-1), "Follow up the quote - any questions?");
  task(third.id, 2, "install", addDays(2), "Confirm install date, deposit and paperwork");
  return db;
}
