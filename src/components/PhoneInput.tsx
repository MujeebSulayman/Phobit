"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";

type Country = { iso: string; name: string; dial: string };

const COUNTRIES: Country[] = [
  { iso: "US", name: "United States", dial: "1" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "CH", name: "Switzerland", dial: "41" },
  { iso: "SE", name: "Sweden", dial: "46" },
  { iso: "NO", name: "Norway", dial: "47" },
  { iso: "DK", name: "Denmark", dial: "45" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "PT", name: "Portugal", dial: "351" },
  { iso: "PL", name: "Poland", dial: "48" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "TR", name: "Türkiye", dial: "90" },
  { iso: "IL", name: "Israel", dial: "972" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "BR", name: "Brazil", dial: "55" },
  { iso: "MX", name: "Mexico", dial: "52" },
  { iso: "AR", name: "Argentina", dial: "54" },
  { iso: "CO", name: "Colombia", dial: "57" },
  { iso: "JP", name: "Japan", dial: "81" },
  { iso: "KR", name: "South Korea", dial: "82" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "HK", name: "Hong Kong", dial: "852" },
  { iso: "SG", name: "Singapore", dial: "65" },
  { iso: "MY", name: "Malaysia", dial: "60" },
  { iso: "TH", name: "Thailand", dial: "66" },
  { iso: "VN", name: "Vietnam", dial: "84" },
  { iso: "PH", name: "Philippines", dial: "63" },
  { iso: "ID", name: "Indonesia", dial: "62" },
  { iso: "PK", name: "Pakistan", dial: "92" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
];

const flag = (iso: string) => String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127462 + c.charCodeAt(0) - 65));

function CountryPicker({ value, onChange }: { value: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^\+/, "");
    return q
      ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.iso.toLowerCase() === q)
      : COUNTRIES;
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setHighlight(Math.max(0, COUNTRIES.findIndex((c) => c.iso === value.iso)));
    const focus = setTimeout(() => searchRef.current?.focus(), 10);
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => {
      clearTimeout(focus);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, value.iso]);

  useEffect(() => setHighlight(0), [search]);

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex h-[46px] w-[116px] items-center gap-1.5 rounded-r-none border-r-0 px-3 text-[14px] cursor-pointer"
      >
        <span className="text-[17px] leading-none">{flag(value.iso)}</span>
        <span className="text-fg-2">+{value.dial}</span>
        <svg
          className={`ml-auto text-fg-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] overflow-hidden rounded-2xl border border-line-strong bg-card-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <Icons.Search width={14} height={14} className="shrink-0 text-fg-3" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => Math.min(matches.length - 1, h + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => Math.max(0, h - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (matches[highlight]) {
                      onChange(matches[highlight]);
                      setOpen(false);
                    }
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Search country or code"
                className="h-8 w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-3"
              />
            </div>
            <ul ref={listRef} role="listbox" className="max-h-[264px] overflow-y-auto p-1.5">
              {matches.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-fg-3">No matches</li>}
              {matches.map((c, i) => {
                const selected = c.iso === value.iso;
                return (
                  <li
                    key={c.iso}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(c);
                      setOpen(false);
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] ${
                      i === highlight ? "bg-card-3 text-fg" : "text-fg-2"
                    }`}
                  >
                    <span className="text-[18px] leading-none">{flag(c.iso)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-[12px] text-fg-3">+{c.dial}</span>
                    {selected && <Icons.Check width={14} height={14} className="text-fg" />}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function detectCountry(): Country {
  if (typeof navigator !== "undefined") {
    const region = new Intl.Locale(navigator.language).region ?? navigator.language.split("-")[1];
    const match = region && COUNTRIES.find((c) => c.iso === region.toUpperCase());
    if (match) return match;
  }
  return COUNTRIES[0];
}

/** Country picker + national number. Emits E.164 ("+14155550123") or "" via onValue. */
export function PhoneInput({
  value,
  onValue,
  id = "recipient",
  autoFocus,
}: {
  value: string;
  onValue: (v: string) => void;
  id?: string;
  autoFocus?: boolean;
}) {
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [national, setNational] = useState("");

  const emit = (c: Country, n: string) => {
    const digits = n.replace(/\D/g, "");
    onValue(digits ? `+${c.dial}${digits}` : "");
  };

  useEffect(() => setCountry(detectCountry()), []);
  useEffect(() => {
    if (value === "") setNational("");
  }, [value]);

  const onInput = (raw: string) => {
    // Pasting a full "+44 …" number switches the country automatically.
    if (raw.trim().startsWith("+")) {
      const digits = raw.replace(/\D/g, "");
      const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
      if (match) {
        setCountry(match);
        const rest = digits.slice(match.dial.length);
        setNational(rest);
        emit(match, rest);
        return;
      }
    }
    const cleaned = raw.replace(/[^\d\s()-]/g, "");
    setNational(cleaned);
    emit(country, cleaned);
  };

  return (
    <div className="flex min-w-0">
      <CountryPicker
        value={country}
        onChange={(c) => {
          setCountry(c);
          emit(c, national);
        }}
      />
      <input
        id={id}
        className="input min-w-0 flex-1 rounded-l-none"
        autoFocus={autoFocus}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        onChange={(e) => onInput(e.target.value)}
        placeholder={country.dial === "1" ? "415 555 0123" : "Phone number"}
      />
    </div>
  );
}
