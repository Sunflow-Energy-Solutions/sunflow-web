import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COLLECTION_KIND, cloudEnabled, pullRows, pushRows, removeStored, type Row } from "./cloud";
import { obsoleteTaskIds, tasksForStage } from "./automation";
import { TEMPLATE, buildChecklist, syncChecklist } from "./checklist";
import {
  SETTINGS_ID, defaultSettings, emptyDb, emptySystem, stageLabel, type AppSettings, type CheckItem, type Campaign, type Customer, type Db, type Deal, type FileRec,
  type Note, type Stage, type Staff, type Task,
} from "./types";
import { nowIso, today, uid } from "./utils";

const DB_KEY = "sunflow-crm-db-v1";
const QUEUE_KEY = "sunflow-crm-queue-v1";
const CURSOR_KEY = "sunflow-crm-cursor-v1";

type Collection = keyof Db;
type AnyRecord = Db[Collection][number];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked - the cloud copy (if any) is still the source of truth */
  }
}

export type SyncState = "local" | "synced" | "syncing" | "offline" | "error";

export type Me = { email: string; name: string; staffId: string; isAdmin: boolean };

type Store = {
  db: Db;
  /** The signed-in person. In "this device only" mode everyone is an admin. */
  me: Me;
  /** Review links and thank-you wording (defaults filled in until an admin saves their own) */
  settings: AppSettings;
  saveSettings: (patch: Partial<AppSettings>) => void;
  sync: SyncState;
  syncError: string;
  pending: number;
  syncNow: () => Promise<void>;

  addCustomer: (c: Partial<Customer>) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addDeal: (customerId: string, patch?: Partial<Deal>) => Deal;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  moveDeal: (id: string, stage: Stage, extra?: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;

  addTask: (t: Partial<Task> & { customerId: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  completeTask: (id: string, done: boolean) => void;
  deleteTask: (id: string) => void;

  addNote: (n: Partial<Note> & { customerId: string; text: string }) => void;
  deleteNote: (id: string) => void;

  addCampaign: (c: Partial<Campaign>) => void;

  addStaff: (s: { name: string; email: string; role: Staff["role"] }) => void;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;

  addFile: (f: Omit<FileRec, "id" | "createdAt" | "updatedAt" | "by"> & { id?: string }) => void;
  deleteFile: (id: string) => void;

  startChecklist: (dealId: string) => void;
  setCheck: (dealId: string, itemId: string, done: boolean) => void;
  addCheckItem: (dealId: string, label: string, group: string) => void;
  removeCheckItem: (dealId: string, itemId: string) => void;
  /** Add a standard checklist item that isn't on this job (it was skipped or doesn't apply by default) */
  addTemplateItem: (dealId: string, key: string) => void;
  /** For jobs in progress: start the checklist if missing, and add steps made relevant by a changed system (e.g. a signed Pylon design) */
  refreshChecklist: (dealId: string) => void;
  /** Record that a thank-you / review request was sent */
  markThanks: (dealId: string, channels: ("email" | "sms")[]) => void;
  importAll: (data: Db) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export function StoreProvider({ children, signedIn, email }: { children: ReactNode; signedIn: boolean; email?: string }) {
  const [db, setDb] = useState<Db>(() => ({ ...emptyDb(), ...readJson<Partial<Db>>(DB_KEY, {}) }));
  const [queue, setQueue] = useState<Row[]>(() => readJson<Row[]>(QUEUE_KEY, []));
  const [sync, setSync] = useState<SyncState>(cloudEnabled ? "syncing" : "local");
  const [syncError, setSyncError] = useState("");
  const dbRef = useRef(db);
  const meNameRef = useRef("");
  const queueRef = useRef(queue);
  const busy = useRef(false);

  useEffect(() => {
    dbRef.current = db;
    writeJson(DB_KEY, db);
  }, [db]);
  useEffect(() => {
    queueRef.current = queue;
    writeJson(QUEUE_KEY, queue);
  }, [queue]);

  /** Push local changes up, then pull everyone else's down. */
  const syncNow = useCallback(async () => {
    if (!cloudEnabled || !signedIn || busy.current) return;
    if (!navigator.onLine) {
      setSync("offline");
      return;
    }
    busy.current = true;
    setSync("syncing");
    try {
      const toPush = queueRef.current;
      if (toPush.length) {
        await pushRows(toPush);
        const sent = new Set(toPush.map((r) => `${r.id}@${r.updated_at}`));
        setQueue((q) => q.filter((r) => !sent.has(`${r.id}@${r.updated_at}`)));
      }

      const cursor = localStorage.getItem(CURSOR_KEY);
      // Overlap the cursor by a minute so a slightly-off phone clock can't make us miss a change.
      const since = cursor ? new Date(new Date(cursor).getTime() - 60_000).toISOString() : null;
      const rows = await pullRows(since);
      if (rows.length) {
        setDb((cur) => mergeRows(cur, rows, queueRef.current));
        localStorage.setItem(CURSOR_KEY, rows[rows.length - 1].updated_at);
      } else if (!cursor) {
        localStorage.setItem(CURSOR_KEY, nowIso());
      }
      setSyncError("");
      setSync("synced");
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
      setSync(navigator.onLine ? "error" : "offline");
    } finally {
      busy.current = false;
    }
  }, [signedIn]);

  useEffect(() => {
    if (!cloudEnabled || !signedIn) return;
    void syncNow();
    const every = window.setInterval(() => void syncNow(), 30_000);
    const wake = () => void syncNow();
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.clearInterval(every);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [signedIn, syncNow]);

  // Push soon after any local edit rather than waiting for the 30 second tick.
  const queuedCount = queue.length;
  useEffect(() => {
    if (!cloudEnabled || !signedIn || queuedCount === 0) return;
    const t = window.setTimeout(() => void syncNow(), 800);
    return () => window.clearTimeout(t);
  }, [queuedCount, signedIn, syncNow]);

  /** Apply one record change locally and queue it for the cloud. */
  const commit = useCallback((collection: Collection, record: AnyRecord, deleted = false) => {
    setDb((cur) => {
      const list = cur[collection] as AnyRecord[];
      const next = deleted
        ? list.filter((r) => r.id !== record.id)
        : list.some((r) => r.id === record.id)
          ? list.map((r) => (r.id === record.id ? record : r))
          : [...list, record];
      return { ...cur, [collection]: next };
    });
    setQueue((q) => [
      ...q.filter((r) => r.id !== record.id),
      { id: record.id, kind: COLLECTION_KIND[collection], data: record as unknown as Record<string, unknown>, deleted, updated_at: record.updatedAt },
    ]);
  }, []);

  // First time someone signs in they get a staff record. The very first person ever becomes the admin.
  const myEmail = email?.toLowerCase() ?? "";
  const hasMe = db.staff.some((s) => s.email.toLowerCase() === myEmail);
  useEffect(() => {
    if (!cloudEnabled || !signedIn || !myEmail || hasMe || sync !== "synced") return;
    const t = nowIso();
    commit("staff", {
      id: `staff-${myEmail}`, name: myEmail.split("@")[0], email: myEmail,
      role: dbRef.current.staff.length === 0 ? "admin" : "staff", createdAt: t, updatedAt: t,
    });
  }, [signedIn, myEmail, hasMe, sync, commit]);

  const me = useMemo<Me>(() => {
    if (!cloudEnabled) return { email: "", name: "You", staffId: "", isAdmin: true };
    const s = db.staff.find((x) => x.email.toLowerCase() === myEmail);
    // If nobody has been made an admin yet, don't lock the owner out of the admin screens.
    const noAdmins = !db.staff.some((x) => x.role === "admin");
    return { email: myEmail, name: s?.name ?? myEmail.split("@")[0], staffId: s?.id ?? "", isAdmin: s?.role === "admin" || noAdmins };
  }, [db.staff, myEmail]);
  meNameRef.current = me.name;
  const settings = useMemo<AppSettings>(() => ({ ...defaultSettings(), ...(db.settings.find((s) => s.id === SETTINGS_ID) ?? {}) }), [db.settings]);

  const find = <K extends Collection>(c: K, id: string) => (dbRef.current[c] as AnyRecord[]).find((r) => r.id === id);

  const store = useMemo<Store>(() => {
    const stamp = () => nowIso();

    const addCustomer: Store["addCustomer"] = (c) => {
      const t = stamp();
      const customer: Customer = {
        id: uid(), firstName: "", lastName: "", phone: "", email: "", address: "", suburb: "", postcode: "", state: "VIC",
        kind: "Residential", source: "Phone call", notes: "", marketingConsent: false, unsubscribed: false,
        createdAt: t, updatedAt: t, ...c,
      };
      commit("customers", customer);
      return customer;
    };
    const updateCustomer: Store["updateCustomer"] = (id, patch) => {
      const cur = find("customers", id);
      if (cur) commit("customers", { ...cur, ...patch, updatedAt: stamp() } as Customer);
    };
    const deleteCustomer: Store["deleteCustomer"] = (id) => {
      const d = dbRef.current;
      d.deals.filter((x) => x.customerId === id).forEach((x) => commit("deals", x, true));
      d.tasks.filter((x) => x.customerId === id).forEach((x) => commit("tasks", x, true));
      d.notes.filter((x) => x.customerId === id).forEach((x) => commit("notes", x, true));
      d.files.filter((x) => x.customerId === id).forEach((x) => {
        commit("files", x, true);
        void removeStored(x.path);
      });
      const cur = find("customers", id);
      if (cur) commit("customers", { ...cur, updatedAt: stamp() } as Customer, true);
    };

    const addTask: Store["addTask"] = (t) => {
      const ts = stamp();
      commit("tasks", {
        id: uid(), dealId: null, kind: "call", due: today(), note: "", done: false, doneAt: null, auto: false,
        createdAt: ts, updatedAt: ts, ...t,
      } as Task);
    };
    const updateTask: Store["updateTask"] = (id, patch) => {
      const cur = find("tasks", id);
      if (cur) commit("tasks", { ...cur, ...patch, updatedAt: stamp() } as Task);
    };
    const deleteTask: Store["deleteTask"] = (id) => {
      const cur = find("tasks", id);
      if (cur) commit("tasks", { ...cur, updatedAt: stamp() } as Task, true);
    };
    const addNote: Store["addNote"] = (n) => {
      const ts = stamp();
      commit("notes", { id: uid(), dealId: null, kind: "note", createdAt: ts, updatedAt: ts, ...n } as Note);
    };
    const deleteNote: Store["deleteNote"] = (id) => {
      const cur = find("notes", id);
      if (cur) commit("notes", { ...cur, updatedAt: stamp() } as Note, true);
    };
    const completeTask: Store["completeTask"] = (id, done) =>
      updateTask(id, { done, doneAt: done ? stamp() : null });

    const addDeal: Store["addDeal"] = (customerId, patch = {}) => {
      const t = stamp();
      const deal: Deal = {
        id: uid(), customerId, title: "", stage: "new", system: emptySystem(), quotes: [], value: null,
        installDate: null, installedOn: null, lostReason: "", createdAt: t, updatedAt: t,
        // a new system for an existing customer inherits how they found us, unless told otherwise
        source: (find("customers", customerId) as Customer | undefined)?.source,
        ...patch,
      };
      commit("deals", deal);
      tasksForStage(deal, deal.stage).forEach((task) => commit("tasks", task));
      return deal;
    };
    const updateDeal: Store["updateDeal"] = (id, patch) => {
      const cur = find("deals", id) as Deal | undefined;
      if (!cur) return;
      const next = { ...cur, ...patch, updatedAt: stamp() } as Deal;
      if (patch.system) next.checklist = syncChecklist(next);
      commit("deals", next);
    };
    const moveDeal: Store["moveDeal"] = (id, stage, extra = {}) => {
      const cur = find("deals", id) as Deal | undefined;
      if (!cur || cur.stage === stage) return;
      const next: Deal = {
        ...cur, ...extra, stage, updatedAt: stamp(),
        installedOn: stage === "installed" ? (extra.installedOn ?? cur.installedOn ?? today()) : cur.installedOn,
      };
      // The paperwork checklist starts once the customer says yes.
      if ((stage === "won" || stage === "installed") && !next.checklist) next.checklist = buildChecklist(next);
      commit("deals", next);
      // Clear out follow-ups that belonged to the previous stage, then add this stage's.
      obsoleteTaskIds(dbRef.current.tasks, id).forEach((tid) => {
        const t = find("tasks", tid);
        if (t) commit("tasks", t as Task, true);
      });
      tasksForStage(next, stage).forEach((task) => commit("tasks", task));
      commit("notes", {
        id: uid(), customerId: cur.customerId, dealId: id, kind: "system",
        text: `Moved to "${stageLabel(stage)}"${extra.lostReason ? ` - ${extra.lostReason}` : ""}`,
        createdAt: stamp(), updatedAt: stamp(),
      } as Note);
    };
    const deleteDeal: Store["deleteDeal"] = (id) => {
      dbRef.current.tasks.filter((t) => t.dealId === id).forEach((t) => commit("tasks", t, true));
      const cur = find("deals", id);
      if (cur) commit("deals", { ...cur, updatedAt: stamp() } as Deal, true);
    };

    const addStaff: Store["addStaff"] = (s) => {
      const t = stamp();
      const em = s.email.trim().toLowerCase();
      commit("staff", { id: `staff-${em}`, name: s.name.trim() || em.split("@")[0], email: em, role: s.role, createdAt: t, updatedAt: t });
    };
    const updateStaff: Store["updateStaff"] = (id, patch) => {
      const cur = find("staff", id);
      if (cur) commit("staff", { ...cur, ...patch, updatedAt: stamp() } as Staff);
    };
    const deleteStaff: Store["deleteStaff"] = (id) => {
      const cur = find("staff", id);
      if (cur) commit("staff", { ...cur, updatedAt: stamp() } as Staff, true);
    };

    const addFile: Store["addFile"] = (f) => {
      const t = stamp();
      commit("files", { id: uid(), by: meNameRef.current, createdAt: t, updatedAt: t, ...f } as FileRec);
    };
    const deleteFile: Store["deleteFile"] = (id) => {
      const cur = find("files", id) as FileRec | undefined;
      if (!cur) return;
      commit("files", { ...cur, updatedAt: stamp() }, true);
      void removeStored(cur.path);
    };

    const patchChecklist = (dealId: string, fn: (list: CheckItem[]) => CheckItem[]) => {
      const d = find("deals", dealId) as Deal | undefined;
      if (d) commit("deals", { ...d, checklist: fn(d.checklist ?? []), updatedAt: stamp() });
    };
    const startChecklist: Store["startChecklist"] = (dealId) => {
      const d = find("deals", dealId) as Deal | undefined;
      if (d && !d.checklist) commit("deals", { ...d, checklist: buildChecklist(d), updatedAt: stamp() });
    };
    const setCheck: Store["setCheck"] = (dealId, itemId, done) =>
      patchChecklist(dealId, (l) =>
        l.map((i) => (i.id === itemId ? { ...i, done, doneAt: done ? stamp() : null, doneBy: done ? meNameRef.current : "" } : i)),
      );
    const addCheckItem: Store["addCheckItem"] = (dealId, label, group) =>
      patchChecklist(dealId, (l) => [...l, { id: uid(), key: "", group, label, required: false, done: false, doneAt: null, doneBy: "" }]);
    const removeCheckItem: Store["removeCheckItem"] = (dealId, itemId) => {
      const d = find("deals", dealId) as Deal | undefined;
      const item = d?.checklist?.find((i) => i.id === itemId);
      if (!d || !item) return;
      commit("deals", {
        ...d,
        checklist: d.checklist!.filter((i) => i.id !== itemId),
        // remember template items that were taken off so a later system change doesn't put them back
        checklistSkipped: item.key ? [...new Set([...(d.checklistSkipped ?? []), item.key])] : d.checklistSkipped,
        updatedAt: stamp(),
      });
    };
    const addTemplateItem: Store["addTemplateItem"] = (dealId, key) => {
      const d = find("deals", dealId) as Deal | undefined;
      const t = TEMPLATE.find((x) => x.key === key);
      if (!d || !t || d.checklist?.some((i) => i.key === key)) return;
      commit("deals", {
        ...d,
        checklist: [...(d.checklist ?? []), { id: uid(), key: t.key, group: t.group, label: t.label, required: t.required, done: false, doneAt: null, doneBy: "" }],
        checklistSkipped: (d.checklistSkipped ?? []).filter((k) => k !== key),
        updatedAt: stamp(),
      });
    };
    const refreshChecklist: Store["refreshChecklist"] = (dealId) => {
      const d = find("deals", dealId) as Deal | undefined;
      if (!d || (d.stage !== "won" && d.stage !== "installed")) return;
      // Old installed jobs without a checklist stay as they are; only jobs still in progress get one started.
      if (!d.checklist && d.stage !== "won") return;
      const next = d.checklist ? syncChecklist(d) : buildChecklist(d);
      if (next && next.length !== (d.checklist?.length ?? -1)) commit("deals", { ...d, checklist: next, updatedAt: stamp() });
    };
    const markThanks: Store["markThanks"] = (dealId, channels) => {
      const d = find("deals", dealId) as Deal | undefined;
      if (!d) return;
      const merged = [...new Set([...(d.thanks?.channels ?? []), ...channels])];
      // One save: the checklist has an "asked for a review" step, ticked here along with the thank-you record.
      const checklist = d.checklist?.map((i) => (i.key === "review" && !i.done ? { ...i, done: true, doneAt: stamp(), doneBy: meNameRef.current } : i));
      commit("deals", { ...d, ...(checklist ? { checklist } : {}), thanks: { sentAt: stamp(), by: meNameRef.current, channels: merged }, updatedAt: stamp() });
      // the stage rules also add a "send the thank-you" reminder: finish it
      dbRef.current.tasks
        .filter((t) => t.dealId === dealId && !t.done && t.note.startsWith("Send the thank-you"))
        .forEach((t) => updateTask(t.id, { done: true, doneAt: stamp() }));
    };
    const saveSettings: Store["saveSettings"] = (patch) => {
      const cur = dbRef.current.settings.find((s) => s.id === SETTINGS_ID) ?? { ...defaultSettings(), createdAt: stamp() };
      commit("settings", { ...cur, ...patch, id: SETTINGS_ID, updatedAt: stamp() });
    };

    const addCampaign: Store["addCampaign"] = (c) => {
      const t = stamp();
      commit("campaigns", {
        id: uid(), subject: "", body: "", audience: "", recipients: 0, sentAt: t, createdAt: t, updatedAt: t, ...c,
      } as Campaign);
    };

    const importAll: Store["importAll"] = (data) => {
      (Object.keys(data) as Collection[]).forEach((c) => {
        (data[c] as AnyRecord[]).forEach((r) => commit(c, { ...r, updatedAt: stamp() }));
      });
    };

    return {
      db, me, sync, syncError, pending: queuedCount, syncNow,
      addCustomer, updateCustomer, deleteCustomer, addDeal, updateDeal, moveDeal, deleteDeal,
      addTask, updateTask, completeTask, deleteTask, addNote, deleteNote, addCampaign, importAll,
      addStaff, updateStaff, deleteStaff, addFile, deleteFile, startChecklist, setCheck, addCheckItem, removeCheckItem,
      addTemplateItem, refreshChecklist, markThanks, saveSettings, settings,
    };
    // `find` reads from refs so it is stable; commit is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, me, settings, sync, syncError, queuedCount, syncNow, commit]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

/** Fold rows from the cloud into the local copy. Newer wins; anything still waiting to upload wins over the cloud. */
function mergeRows(cur: Db, rows: Row[], queued: Row[]): Db {
  const next: Db = {
    customers: [...cur.customers], deals: [...cur.deals], tasks: [...cur.tasks], notes: [...cur.notes],
    campaigns: [...cur.campaigns], staff: [...cur.staff], files: [...cur.files], settings: [...cur.settings],
  };
  const collectionFor = Object.fromEntries(Object.entries(COLLECTION_KIND).map(([c, k]) => [k, c])) as Record<string, Collection>;
  const waiting = new Set(queued.map((q) => q.id));

  for (const row of rows) {
    const collection = collectionFor[row.kind];
    if (!collection || waiting.has(row.id)) continue;
    const list = next[collection] as AnyRecord[];
    const idx = list.findIndex((r) => r.id === row.id);
    if (row.deleted) {
      if (idx >= 0) list.splice(idx, 1);
      continue;
    }
    const incoming = row.data as unknown as AnyRecord;
    if (idx < 0) list.push(incoming);
    else if (incoming.updatedAt >= list[idx].updatedAt) list[idx] = incoming;
  }
  return next;
}
