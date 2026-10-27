"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

export const BAND_COLORS = ["#fdb813", "#2c5194", "#e6720f", "#16a34a", "#7c3aed", "#0891b2", "#be185d", "#6b7386"];

export const inputClass =
  "w-full rounded-lg border border-mist-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-mist-400 focus:border-solar-500 focus:outline-none focus:ring-2 focus:ring-solar-500/30";

const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const aud2 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (v: number, cents = false) => (cents ? aud2 : aud).format(Math.abs(v) < 0.005 ? 0 : v);
export const num = (v: number, dp = 1) =>
  v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: dp });

function plain(v: number) {
  return String(Number(v.toPrecision(10)));
}

export function NumInput({
  value,
  onChange,
  step = "any",
  min,
  placeholder,
  className,
  ariaLabel,
  allowEmpty = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number | "any";
  min?: number;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : value == null ? "" : plain(value);
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      step={step}
      min={min}
      placeholder={placeholder}
      value={shown}
      onFocus={() => {
        setText(value == null ? "" : plain(value));
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value === "") onChange(allowEmpty ? null : 0);
        else {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }
      }}
      className={clsx(inputClass, className)}
    />
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mist-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mist-500">{hint}</span>}
    </label>
  );
}

export function Card({ title, subtitle, action, children, className }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-2xl border border-mist-200 bg-white p-5 shadow-sm sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-display text-base font-semibold text-navy-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-mist-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SmallButton({
  children,
  onClick,
  tone = "default",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "border-navy-900 bg-navy-900 text-white hover:bg-navy-800",
        tone === "default" && "border-mist-300 bg-white text-navy-800 hover:border-navy-400 hover:bg-mist-50",
        tone === "danger" && "border-mist-300 bg-white text-red-600 hover:border-red-300 hover:bg-red-50"
      )}
    >
      {children}
    </button>
  );
}

export function HourStrip({ eff, names }: { eff: number[]; names: string[] }) {
  return (
    <div className="mt-3">
      <div className="flex overflow-hidden rounded-md border border-mist-200">
        {eff.map((k, h) => (
          <div
            key={h}
            title={`${String(h).padStart(2, "0")}:00 - ${names[k] ?? ""}`}
            className="h-5 flex-1"
            style={{ backgroundColor: BAND_COLORS[k % BAND_COLORS.length] }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-mist-400">
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <span key={h}>{h === 24 ? "24" : String(h).padStart(2, "0")}</span>
        ))}
      </div>
    </div>
  );
}
