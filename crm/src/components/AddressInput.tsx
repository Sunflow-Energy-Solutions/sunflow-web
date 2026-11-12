import clsx from "clsx";
import { MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Street address box with Google address suggestions (Places API New), biased to Melbourne and limited to Australia.
 * Choosing a suggestion fills the street, suburb, state and postcode. With no VITE_GOOGLE_PLACES_API_KEY (or if Google can't be
 * reached) it is simply a normal text box.
 */
export type AddressParts = { street: string; suburb: string; state: string; postcode: string };

type Suggestion = { placeId: string; main: string; secondary: string; full: string };
type Component = { longText: string; shortText: string; types: string[] };

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined;
const MELBOURNE = { latitude: -37.8136, longitude: 144.9631 };

const pick = (c: Component[], type: string, short = false) => {
  const found = c.find((x) => x.types.includes(type));
  return found ? (short ? found.shortText : found.longText) : "";
};

function toParts(components: Component[]): AddressParts {
  const unit = pick(components, "subpremise");
  const number = pick(components, "street_number");
  const route = pick(components, "route");
  return {
    street: [unit && number ? `${unit}/${number}` : number || unit, route].filter(Boolean).join(" "),
    suburb: pick(components, "locality") || pick(components, "sublocality") || pick(components, "postal_town"),
    state: pick(components, "administrative_area_level_1", true),
    postcode: pick(components, "postal_code"),
  };
}

export default function AddressInput({
  value, onChange, onSelect, className, placeholder,
}: { value: string; onChange: (v: string) => void; onSelect: (p: AddressParts) => void; className?: string; placeholder?: string }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const session = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const skip = useRef(false);

  useEffect(() => {
    if (!API_KEY) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    const input = value.trim();
    if (input.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      session.current ??= crypto.randomUUID();
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY },
          body: JSON.stringify({
            input,
            sessionToken: session.current,
            includedRegionCodes: ["au"],
            includedPrimaryTypes: ["street_address", "premise", "subpremise"],
            locationBias: { circle: { center: MELBOURNE, radius: 50000 } },
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          suggestions?: { placePrediction?: { placeId: string; text: { text: string }; structuredFormat?: { mainText: { text: string }; secondaryText?: { text: string } } } }[];
        };
        const next = (data.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({ placeId: p.placeId, full: p.text.text, main: p.structuredFormat?.mainText.text ?? p.text.text, secondary: p.structuredFormat?.secondaryText?.text ?? "" }));
        setSuggestions(next);
        setActive(-1);
        setOpen(next.length > 0);
      } catch {
        /* aborted or offline: keep typing by hand */
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  async function choose(s: Suggestion) {
    skip.current = true;
    onChange(s.main);
    setOpen(false);
    setSuggestions([]);
    const token = session.current;
    session.current = null;
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(s.placeId)}?sessionToken=${token ?? ""}`, {
        headers: { "X-Goog-Api-Key": API_KEY ?? "", "X-Goog-FieldMask": "addressComponents" },
      });
      if (!res.ok) throw new Error("details failed");
      const place = (await res.json()) as { addressComponents?: Component[] };
      const parts = toParts(place.addressComponents ?? []);
      skip.current = true;
      if (parts.street) onChange(parts.street);
      onSelect(parts);
    } catch {
      /* keep what was chosen; suburb and postcode can be typed */
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); void choose(suggestions[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete={API_KEY ? "off" : "street-address"}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        role={API_KEY ? "combobox" : undefined}
        aria-expanded={API_KEY ? open : undefined}
        aria-controls={API_KEY ? listId : undefined}
        aria-autocomplete={API_KEY ? "list" : undefined}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" translate="no" className="notranslate absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-mist-200 bg-white py-1 shadow-xl">
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => void choose(s)}
              onMouseEnter={() => setActive(i)}
              className={clsx("flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-sm", i === active ? "bg-mist-50" : "bg-white")}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-solar-600" />
              <span className="text-navy-900">
                {s.main}
                {s.secondary && <span className="block text-xs text-mist-500">{s.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
