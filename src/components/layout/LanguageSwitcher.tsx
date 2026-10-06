"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Globe, Search } from "lucide-react";
import clsx from "clsx";
import {
  commonLanguages,
  defaultLanguage,
  findLanguage,
  moreLanguages,
  translatableCodes,
  type Language,
} from "@/lib/languages";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
          elementId: string
        ) => unknown;
      };
    };
  }
}

const COOKIE_NAME = "googtrans";
const SCRIPT_ID = "google-translate-script";

function readLanguageCode(): string {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
  return match ? decodeURIComponent(match[1]) : defaultLanguage.code;
}

function writeLanguageCode(code: string) {
  const isDefault = code === defaultLanguage.code;
  const expires = isDefault
    ? "Thu, 01 Jan 1970 00:00:00 GMT"
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  const value = isDefault ? "" : `/en/${code}`;

  const parts = location.hostname.split(".");
  const domains: (string | null)[] = [null];
  for (let i = 0; i < parts.length - 1; i++) domains.push("." + parts.slice(i).join("."));

  for (const domain of domains) {
    document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/${domain ? `; domain=${domain}` : ""}`;
  }
}

// Google Translate rewrites text nodes, which makes React throw when it later tries to
// remove or reorder nodes that are no longer where it left them. Ignoring those calls is
// the standard workaround.
let domPatched = false;
function patchDomForTranslation() {
  if (domPatched) return;
  domPatched = true;

  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child) as T;
  };

  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return node;
    return insertBefore.call(this, node, ref) as T;
  };
}

const subscribeToNothing = () => () => {};

export default function LanguageSwitcher() {
  const code = useSyncExternalStore(subscribeToNothing, readLanguageCode, () => defaultLanguage.code);
  const current = findLanguage(code);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (code === defaultLanguage.code) return;

    patchDomForTranslation();
    window.googleTranslateElementInit = () => {
      if (!window.google) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: translatableCodes.join(","),
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    }
  }, [code]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const trimmed = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return null;
    return [...commonLanguages, ...moreLanguages].filter(
      (l) => l.native.toLowerCase().includes(trimmed) || l.english.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  function choose(language: Language) {
    writeLanguageCode(language.code);
    window.location.reload();
  }

  function renderOption(language: Language) {
    const active = language.code === current.code;
    return (
      <button
        key={language.code}
        type="button"
        lang={language.code}
        onClick={() => choose(language)}
        className={clsx(
          "flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-mist-50",
          active ? "font-semibold text-solar-600" : "text-navy-700"
        )}
      >
        <span>
          {language.native}
          {language.native !== language.english && (
            <span className="ml-2 text-xs font-normal text-mist-400">{language.english}</span>
          )}
        </span>
        {active && <Check className="h-4 w-4 shrink-0" />}
      </button>
    );
  }

  return (
    <div ref={rootRef} translate="no" className="notranslate relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Language: ${current.english}. Change language`}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium text-navy-700 transition-colors hover:bg-mist-100 hover:text-navy-950"
      >
        <Globe className="h-5 w-5" />
        <span className="hidden uppercase sm:inline">{current.code.split("-")[0]}</span>
        <ChevronDown className={clsx("hidden h-3.5 w-3.5 transition-transform sm:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className="fixed inset-x-5 top-[5.25rem] z-50 overflow-hidden rounded-xl border border-mist-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
          <div className="border-b border-mist-100 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search languages"
                aria-label="Search languages"
                className="w-full rounded-lg border border-mist-200 py-2 pl-9 pr-3 text-sm text-navy-900 outline-none focus:border-solar-500"
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {filtered ? (
              filtered.length > 0 ? (
                filtered.map(renderOption)
              ) : (
                <p className="px-4 py-3 text-sm text-mist-500">No languages found.</p>
              )
            ) : (
              <>
                {renderOption(defaultLanguage)}
                <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-mist-400">
                  Common in Victoria
                </p>
                {commonLanguages.map(renderOption)}
                <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-mist-400">
                  More languages
                </p>
                {moreLanguages.map(renderOption)}
              </>
            )}
          </div>
          <p className="border-t border-mist-100 px-4 py-2 text-[11px] leading-snug text-mist-400">
            Translated automatically. Wording may not be exact.
          </p>
        </div>
      )}

      <div
        id="google_translate_element"
        style={{ position: "absolute", visibility: "hidden", width: 0, height: 0, overflow: "hidden" }}
      />
    </div>
  );
}
