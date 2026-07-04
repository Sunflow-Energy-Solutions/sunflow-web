"use client";

import { useEffect } from "react";
import { Minimize2 } from "lucide-react";

export default function ChargerTableShell({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onToggle();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, onToggle]);

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-mist-200 px-5 py-4 sm:px-8">
          <div>
            <h3 className="font-display text-base font-semibold text-navy-950 sm:text-lg">{title}</h3>
            <p className="text-xs text-mist-500 sm:text-sm">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-solar-500 hover:text-navy-950 sm:text-sm"
          >
            <Minimize2 className="h-4 w-4" /> Collapse
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    );
  }

  return <div className="mt-4 max-h-[560px] overflow-auto rounded-2xl border border-mist-200">{children}</div>;
}
