"use client";

import { useState } from "react";
import { MoveHorizontal } from "lucide-react";

export default function BeforeAfterSlider({
  title,
  location,
}: {
  title: string;
  location: string;
}) {
  const [position, setPosition] = useState(50);

  return (
    <div className="overflow-hidden rounded-3xl border border-mist-200 bg-white">
      <div className="relative aspect-[16/10] w-full select-none overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-mist-300 to-mist-400 text-center">
          <span className="rounded-full bg-navy-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Before
          </span>
          <p className="max-w-[70%] text-sm text-navy-800/70">Bare roof, no solar generation, full grid reliance</p>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950 text-center"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <span className="rounded-full bg-solar-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy-950">
            After
          </span>
          <p className="max-w-[70%] text-sm text-mist-200">Full solar array, battery-ready, EV charger installed</p>
        </div>

        <div
          className="absolute inset-y-0 flex w-0.5 -translate-x-1/2 items-center justify-center bg-white"
          style={{ left: `${position}%` }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy-900 shadow-lg">
            <MoveHorizontal className="h-4 w-4" />
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label={`Before and after comparison slider for ${title}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold text-navy-950">{title}</h3>
        <p className="mt-1 text-sm text-mist-500">{location}</p>
      </div>
    </div>
  );
}
