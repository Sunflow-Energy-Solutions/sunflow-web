import { type SVGProps } from "react";

/** Solar panel array on a mounting rail, with sun rays */
export function SolarPanelArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="none" {...props}>
      <defs>
        <linearGradient id="solar-panel-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#203f74" />
          <stop offset="1" stopColor="#0a1730" />
        </linearGradient>
      </defs>
      <circle cx="150" cy="46" r="26" fill="#FDB813" opacity="0.16" />
      <circle cx="150" cy="46" r="14" fill="#FDB813" opacity="0.5" />
      <g stroke="#F7931E" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M150 6v8" />
        <path d="M150 78v8" />
        <path d="M110 46h8" />
        <path d="M182 46h8" />
        <path d="M123 19l6 6" />
        <path d="M171 67l6 6" />
        <path d="M177 19l-6 6" />
        <path d="M129 67l-6 6" />
      </g>
      <g transform="translate(20 90) rotate(-6)">
        <rect x="0" y="0" width="150" height="80" rx="6" fill="url(#solar-panel-grad)" />
        {[0, 1, 2, 3, 4].map((col) => (
          <g key={col}>
            <rect x={6 + col * 29.6} y={6} width="26" height="32" fill="#17305a" stroke="#2c5194" strokeWidth="1.5" />
            <rect x={6 + col * 29.6} y={42} width="26" height="32" fill="#17305a" stroke="#2c5194" strokeWidth="1.5" />
          </g>
        ))}
        <rect x="-4" y="76" width="158" height="8" rx="3" fill="#0a1730" />
      </g>
    </svg>
  );
}

/** Home battery unit showing a charge bar */
export function BatteryArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="none" {...props}>
      <defs>
        <linearGradient id="battery-body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17305a" />
          <stop offset="1" stopColor="#0a1730" />
        </linearGradient>
        <linearGradient id="battery-fill-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#F7931E" />
          <stop offset="1" stopColor="#FDB813" />
        </linearGradient>
      </defs>
      <rect x="60" y="24" width="80" height="152" rx="14" fill="url(#battery-body-grad)" />
      <rect x="86" y="10" width="28" height="16" rx="4" fill="#0a1730" />
      <rect x="72" y="46" width="56" height="118" rx="6" fill="#0a1730" opacity="0.5" />
      <rect x="72" y="96" width="56" height="68" rx="6" fill="url(#battery-fill-grad)" />
      <g stroke="#0a1730" strokeWidth="2" opacity="0.35">
        <path d="M72 116h56" />
        <path d="M72 136h56" />
      </g>
      <path d="M104 66l-14 24h11l-9 20 24-28h-12l8-16z" fill="#FDB813" />
    </svg>
  );
}

/** EV charging cable and connector */
export function EVChargerArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="none" {...props}>
      <defs>
        <linearGradient id="ev-body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#17305a" />
          <stop offset="1" stopColor="#0a1730" />
        </linearGradient>
      </defs>
      <rect x="44" y="20" width="66" height="120" rx="16" fill="url(#ev-body-grad)" />
      <rect x="58" y="38" width="38" height="26" rx="4" fill="#0a1730" />
      <circle cx="77" cy="51" r="5" fill="#FDB813" />
      <rect x="58" y="76" width="38" height="10" rx="3" fill="#2c5194" />
      <rect x="58" y="92" width="38" height="10" rx="3" fill="#2c5194" />
      <path
        d="M104 92c26 6 34 26 30 52-3 20-2 32 10 40"
        stroke="#F7931E"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <g transform="translate(140 168)">
        <rect x="-4" y="-14" width="46" height="30" rx="8" fill="#0a1730" />
        <circle cx="8" cy="1" r="3.4" fill="#FDB813" />
        <circle cx="19" cy="1" r="3.4" fill="#FDB813" />
        <circle cx="30" cy="1" r="3.4" fill="#FDB813" />
        <circle cx="13.5" cy="-8" r="3" fill="#FDB813" />
        <circle cx="24.5" cy="-8" r="3" fill="#FDB813" />
      </g>
    </svg>
  );
}

/** Radiating sunburst motif matching the Sunflow logo mark, purely decorative */
export function SunburstMotif(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 200" fill="none" {...props} aria-hidden="true">
      <circle cx="100" cy="100" r="98" stroke="url(#sunburst-ring)" strokeWidth="1.5" opacity="0.35" />
      <circle cx="100" cy="100" r="70" stroke="#FDB813" strokeWidth="1" opacity="0.25" strokeDasharray="4 6" />
      <defs>
        <linearGradient id="sunburst-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FDB813" />
          <stop offset="0.5" stopColor="#2c5194" />
          <stop offset="1" stopColor="#F7931E" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="22" fill="#FDB813" opacity="0.9" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 100 + Math.cos(angle) * 34;
        const y1 = 100 + Math.sin(angle) * 34;
        const x2 = 100 + Math.cos(angle) * 46;
        const y2 = 100 + Math.sin(angle) * 46;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#F7931E"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
}
