import type { Db } from "./types";

/**
 * Who "owns" a record, for the database's access rules. A customer is owned by whoever it is assigned to; a customer's jobs,
 * follow-ups, notes and files are owned by the same person. Staff list, settings and specials history have no owner
 * (they are governed by role). null = not assigned yet, which only admins and full staff can see.
 */
export type OwnerMap = Map<string, string | null>;

type Rec = { id: string; customerId?: string; assignedTo?: string };

export function ownerFor(collection: keyof Db, record: Rec, owners: OwnerMap): string | null {
  if (collection === "customers") return record.assignedTo || null;
  if (collection === "deals" || collection === "tasks" || collection === "notes" || collection === "files") {
    return (record.customerId && owners.get(record.customerId)) || null;
  }
  return null;
}

/** Keep only the customer-related records the database says this login may see (plus anything not yet uploaded). */
export function pruneToVisible(db: Db, visible: Set<string>, pending: Set<string>): Db {
  const keep = <T extends { id: string }>(list: T[]) => list.filter((r) => visible.has(r.id) || pending.has(r.id));
  return { ...db, customers: keep(db.customers), deals: keep(db.deals), tasks: keep(db.tasks), notes: keep(db.notes), files: keep(db.files) };
}
