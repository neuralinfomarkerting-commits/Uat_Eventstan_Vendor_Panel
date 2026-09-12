"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";

export default function SearchableSelectField({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyLabel = "No results found",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeOptions = options ?? [];
  const selected = safeOptions.find((o) => o.value === value);
  const filtered = query
    ? safeOptions.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : safeOptions;

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`relative w-full flex items-center gap-2 px-4 py-2.5 pr-9 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white text-left hover:border-orange-300 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed hover:border-gray-200" : ""
        }`}
      >
        <span className={`truncate ${selected ? "text-gray-700" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={13}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">{emptyLabel}</p>
            )}
            {filtered.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-orange-50 transition-colors
                    ${isSelected ? "text-orange-600 font-medium bg-orange-50/60" : "text-gray-700"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <CheckCircle2 size={14} className="text-orange-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
