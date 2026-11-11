import clsx from "clsx";
import { CalendarCheck, CalendarDays, Home, KanbanSquare, Mail, MoreHorizontal, Plus, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CustomerSheet } from "./components/forms";
import { cloudEnabled, supabase } from "./cloud";
import Calendar from "./screens/Calendar";
import Customers from "./screens/Customers";
import CustomerDetail from "./screens/CustomerDetail";
import Login from "./screens/Login";
import Pipeline from "./screens/Pipeline";
import Settings from "./screens/Settings";
import Specials from "./screens/Specials";
import Tasks from "./screens/Tasks";
import Today from "./screens/Today";
import { StoreProvider, useStore } from "./store";

function useHash() {
  const [hash, setHash] = useState(() => location.hash || "#/");
  useEffect(() => {
    const on = () => {
      setHash(location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

const NAV = [
  { href: "#/", label: "Today", icon: Home },
  { href: "#/customers", label: "Customers", icon: Users },
  { href: "#/calendar", label: "Calendar", icon: CalendarDays },
  { href: "#/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "#/tasks", label: "Follow-ups", icon: CalendarCheck },
  { href: "#/specials", label: "Specials", icon: Mail, desktopOnly: true },
  { href: "#/settings", label: "More", icon: MoreHorizontal },
];

function Shell({ email }: { email?: string }) {
  const hash = useHash();
  const { sync, pending, db, me } = useStore();
  const [adding, setAdding] = useState(false);
  const path = (hash.replace(/^#/, "") || "/").split("?")[0];
  const nav = NAV.filter((n) => n.href !== "#/specials" || me.isAdmin);

  let page: ReactNode;
  const m = path.match(/^\/customers\/(.+)$/);
  if (m) page = <CustomerDetail id={decodeURIComponent(m[1])} />;
  else if (path === "/customers") page = <Customers />;
  else if (path === "/calendar") page = <Calendar />;
  else if (path === "/pipeline") page = <Pipeline />;
  else if (path === "/tasks") page = <Tasks />;
  else if (path === "/specials" && me.isAdmin) page = <Specials />;
  else if (path === "/settings") page = <Settings email={email} />;
  else page = <Today />;

  const active = (href: string) => (href === "#/" ? path === "/" : path.startsWith(href.slice(1)));
  const overdue = db.tasks.filter((t) => !t.done && t.due <= new Date().toLocaleDateString("sv-SE")).length;

  return (
    <div className="min-h-dvh md:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-navy-900 p-4 text-white md:flex">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <img src="/icon-192.png" alt="" className="size-10 rounded-xl" />
          <span className="text-lg font-extrabold">Sunflow <span className="text-solar-400">CRM</span></span>
        </div>
        <button onClick={() => setAdding(true)} className="mb-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-solar-500 font-bold text-navy-900 hover:bg-solar-400">
          <Plus className="size-5" /> New customer
        </button>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className={clsx("flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold", active(href) ? "bg-white/10 text-solar-400" : "text-white/70 hover:bg-white/5")}>
              <Icon className="size-5" /> {label}
              {href === "#/tasks" && overdue > 0 && <span className="ml-auto rounded-full bg-solar-500 px-2 text-xs font-bold text-navy-900">{overdue}</span>}
            </a>
          ))}
        </nav>
        <SyncPill className="mt-auto" sync={sync} pending={pending} />
      </aside>

      {/* Mobile top bar */}
      <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-2.5 text-white md:hidden">
        <span className="flex items-center gap-2 text-base font-extrabold"><img src="/icon-192.png" alt="" className="size-7 rounded-lg" />Sunflow <span className="text-solar-400">CRM</span></span>
        <SyncPill sync={sync} pending={pending} />
      </header>

      <main className={clsx("mx-auto px-4 pb-44 pt-5 md:pb-12 md:pt-8", path === "/pipeline" ? "max-w-none md:px-8" : "max-w-3xl")}>{page}</main>

      {/* Mobile quick-add + tab bar */}
      <button
        onClick={() => setAdding(true)}
        aria-label="New customer"
        className="fixed bottom-24 right-4 z-30 grid size-14 place-items-center rounded-full bg-solar-500 text-navy-900 shadow-xl shadow-solar-700/30 active:scale-95 md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </button>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid border-t border-mist-200 bg-white md:hidden" style={{ gridTemplateColumns: `repeat(${nav.filter((n) => !("desktopOnly" in n)).length}, minmax(0, 1fr))` }}>
        {nav.filter((n) => !("desktopOnly" in n)).map(({ href, label, icon: Icon }) => (
          <a key={href} href={href} className={clsx("relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold", active(href) ? "text-solar-700" : "text-mist-500")}>
            <Icon className="size-[22px]" />
            {label}
            {href === "#/tasks" && overdue > 0 && <span className="absolute right-[22%] top-2 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{overdue}</span>}
          </a>
        ))}
      </nav>

      {adding && <CustomerSheet onClose={() => setAdding(false)} onSaved={(c) => (location.hash = `#/customers/${c.id}`)} />}
    </div>
  );
}

function SyncPill({ sync, pending, className }: { sync: string; pending: number; className?: string }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const f = () => setOnline(navigator.onLine);
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); };
  }, []);
  const label = !cloudEnabled ? "This device only" : !online ? `Offline${pending ? ` · ${pending} to upload` : ""}` : sync === "error" ? "Sync problem" : pending ? `Saving ${pending}...` : sync === "syncing" ? "Syncing..." : "Synced";
  const colour = !cloudEnabled ? "bg-amber-400" : !online || sync === "error" ? "bg-red-400" : pending || sync === "syncing" ? "bg-solar-400" : "bg-emerald-400";
  return (
    <a href="#/settings" className={clsx("flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90", className)}>
      <span className={clsx("size-2 rounded-full", colour)} /> {label}
    </a>
  );
}

export default function App() {
  const [session, setSession] = useState<{ email?: string } | null | undefined>(cloudEnabled ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? { email: data.session.user.email } : null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? { email: s.user.email } : null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (cloudEnabled && session === undefined) return <div className="grid min-h-dvh place-items-center bg-navy-900 text-white/70">Loading...</div>;
  if (cloudEnabled && !session) return <Login />;
  return (
    <StoreProvider signedIn={!cloudEnabled || !!session} email={session?.email}>
      <Shell email={session?.email} />
    </StoreProvider>
  );
}
