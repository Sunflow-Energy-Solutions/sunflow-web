import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { stageLabel, type Customer, type Stage } from "../types";
import { initials } from "../utils";

export function Button({
  variant = "primary", size = "md", className, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "dark" | "ghost" | "danger" | "soft"; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...p}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-[15px]",
        size === "lg" && "min-h-12 px-5 text-base",
        variant === "primary" && "bg-solar-500 text-navy-900 hover:bg-solar-400 shadow-sm",
        variant === "dark" && "bg-navy-900 text-white hover:bg-navy-800",
        variant === "soft" && "bg-mist-100 text-navy-900 hover:bg-mist-200",
        variant === "ghost" && "text-navy-700 hover:bg-mist-100",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        className,
      )}
    />
  );
}

const inputCls =
  "w-full min-h-11 rounded-xl border border-mist-300 bg-white px-3 py-2 text-navy-900 placeholder:text-mist-400 focus:border-solar-600 focus:outline-none focus:ring-2 focus:ring-solar-400/40";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-[13px] font-semibold text-navy-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mist-500">{hint}</span>}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(inputCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={3} {...p} className={clsx(inputCls, "min-h-24", p.className)} />
);

export function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-mist-200 bg-white p-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 accent-[#f7931e]" />
      <span>
        <span className="block text-[15px] font-medium text-navy-900">{label}</span>
        {hint && <span className="block text-xs text-mist-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Slides up from the bottom on a phone, centred card on a desktop. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 fade-in md:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="sheet-in flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:max-w-xl md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-mist-100 px-5 py-3.5">
          <h2 className="text-lg font-bold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full text-mist-500 hover:bg-mist-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-mist-100 bg-white px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

const STAGE_STYLE: Record<Stage, string> = {
  new: "bg-sky-100 text-sky-800",
  contacted: "bg-indigo-100 text-indigo-800",
  assessment: "bg-violet-100 text-violet-800",
  quoted: "bg-amber-100 text-amber-900",
  negotiating: "bg-orange-100 text-orange-900",
  won: "bg-emerald-100 text-emerald-800",
  installed: "bg-green-200 text-green-900",
  lost: "bg-mist-200 text-mist-500",
};

export const stageColour = STAGE_STYLE;

export const StageBadge = ({ stage }: { stage: Stage }) => (
  <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STAGE_STYLE[stage])}>{stageLabel(stage)}</span>
);

export const Avatar = ({ c, size = "md" }: { c: Pick<Customer, "firstName" | "lastName">; size?: "md" | "lg" }) => (
  <span className={clsx("grid shrink-0 place-items-center rounded-full bg-navy-900 font-bold text-solar-400", size === "md" ? "size-11 text-sm" : "size-16 text-xl")}>
    {initials(c)}
  </span>
);

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx("rounded-2xl border border-mist-200 bg-white shadow-[0_1px_2px_rgba(10,23,48,0.04)]", className)}>{children}</div>
);

export const SectionTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="mb-2 mt-6 flex items-center justify-between px-1 first:mt-0">
    <h2 className="text-[13px] font-bold uppercase tracking-wide text-mist-500">{children}</h2>
    {action}
  </div>
);

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-mist-300 bg-white/60 px-6 py-10 text-center">
      <p className="font-semibold text-navy-800">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-mist-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">{title}</h1>
        {sub && <p className="text-sm text-mist-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
