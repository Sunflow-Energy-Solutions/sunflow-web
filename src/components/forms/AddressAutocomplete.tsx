"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import clsx from "clsx";

export type AddressParts = {
  formatted: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
};

type Suggestion = { placeId: string; main: string; secondary: string; full: string };

type Props = {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  // "full" fills the box with the whole address; "street" fills it with just the street line
  // (so the form's suburb/state/postcode boxes can be filled from onSelect).
  mode?: "full" | "street";
  onSelect?: (parts: AddressParts) => void;
};

type AddressComponent = { longText: string; shortText: string; types: string[] };

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const MELBOURNE = { latitude: -37.8136, longitude: 144.9631 };

function newSessionToken() {
  return crypto.randomUUID();
}

function pick(components: AddressComponent[], type: string, short = false): string {
  const found = components.find((c) => c.types.includes(type));
  return found ? (short ? found.shortText : found.longText) : "";
}

function toParts(formatted: string, components: AddressComponent[]): AddressParts {
  const unit = pick(components, "subpremise");
  const number = pick(components, "street_number");
  const route = pick(components, "route");
  const streetLine = [unit && number ? `${unit}/${number}` : number || unit, route].filter(Boolean).join(" ");

  return {
    formatted,
    street: streetLine,
    suburb: pick(components, "locality") || pick(components, "sublocality") || pick(components, "postal_town"),
    state: pick(components, "administrative_area_level_1", true),
    postcode: pick(components, "postal_code"),
  };
}

export default function AddressAutocomplete({
  id,
  name,
  label,
  placeholder,
  className,
  required,
  mode = "full",
  onSelect,
}: Props) {
  const listId = useId();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (!API_KEY) return;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const input = value.trim();
    if (input.length < 3) return;

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      sessionToken.current ??= newSessionToken();

      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": API_KEY },
          body: JSON.stringify({
            input,
            sessionToken: sessionToken.current,
            includedRegionCodes: ["au"],
            includedPrimaryTypes: ["street_address", "premise", "subpremise"],
            locationBias: { circle: { center: MELBOURNE, radius: 50000 } },
          }),
        });
        if (!res.ok) return;

        const data: {
          suggestions?: {
            placePrediction?: {
              placeId: string;
              text: { text: string };
              structuredFormat?: { mainText: { text: string }; secondaryText?: { text: string } };
            };
          }[];
        } = await res.json();

        const next: Suggestion[] = (data.suggestions ?? [])
          .map((s) => s.placePrediction)
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({
            placeId: p.placeId,
            full: p.text.text,
            main: p.structuredFormat?.mainText.text ?? p.text.text,
            secondary: p.structuredFormat?.secondaryText?.text ?? "",
          }));

        setSuggestions(next);
        setActive(-1);
        setOpen(next.length > 0);
      } catch {
        // aborted or offline: the visitor can keep typing the address by hand
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function choose(suggestion: Suggestion) {
    skipNextSearch.current = true;
    setValue(suggestion.full);
    setOpen(false);
    setSuggestions([]);

    const token = sessionToken.current;
    sessionToken.current = null;

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(suggestion.placeId)}?sessionToken=${token ?? ""}`,
        {
          headers: {
            "X-Goog-Api-Key": API_KEY ?? "",
            "X-Goog-FieldMask": "formattedAddress,addressComponents",
          },
        }
      );
      if (!res.ok) throw new Error("details failed");
      const place: { formattedAddress?: string; addressComponents?: AddressComponent[] } = await res.json();
      const parts = toParts(place.formattedAddress ?? suggestion.full, place.addressComponents ?? []);

      skipNextSearch.current = true;
      setValue(mode === "street" && parts.street ? parts.street : parts.formatted);
      onSelect?.(parts);
    } catch {
      // keep what was clicked; the other fields can be filled in by hand
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-navy-800">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        type="text"
        autoComplete={API_KEY ? "off" : "street-address"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        role={API_KEY ? "combobox" : undefined}
        aria-expanded={API_KEY ? open : undefined}
        aria-controls={API_KEY ? listId : undefined}
        aria-autocomplete={API_KEY ? "list" : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          translate="no"
          className="notranslate absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-mist-200 bg-white py-1 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => void choose(s)}
              onMouseEnter={() => setActive(i)}
              className={clsx(
                "flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-sm",
                i === active ? "bg-mist-50" : "bg-white"
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-solar-600" />
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
