/** Style: type-ahead suggestions (not auto-fill) for Jharkhand's 24 districts — the user
 * always types/edits freely; this only narrows and highlights matches as they go, the way
 * a search box does. Built once here and reused everywhere a district is entered by hand
 * (report-a-challenge, sign-up, ...) so every one of those fields covers the exact same
 * canonical 24-district list from `jharkhandDistricts.ts` with identical behavior. */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { MapPin } from "lucide-react";
import { JHARKHAND_DISTRICTS } from "@/lib/jharkhandDistricts";

const ALL_DISTRICTS = JHARKHAND_DISTRICTS.map(d => d.name);

interface DistrictAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (district: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}

function matchDistricts(query: string): string[] {
  const term = query.trim().toLowerCase();
  if (!term) return ALL_DISTRICTS;
  const startsWith = ALL_DISTRICTS.filter(d =>
    d.toLowerCase().startsWith(term)
  );
  const contains = ALL_DISTRICTS.filter(
    d => !d.toLowerCase().startsWith(term) && d.toLowerCase().includes(term)
  );
  return [...startsWith, ...contains];
}

function HighlightedLabel({ label, query }: { label: string; query: string }) {
  const term = query.trim();
  if (!term) return <>{label}</>;
  const index = label.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return <>{label}</>;
  return (
    <>
      {label.slice(0, index)}
      <mark className="rounded-[0.2rem] bg-[#c94a20]/18 text-[#c94a20]">
        {label.slice(index, index + term.length)}
      </mark>
      {label.slice(index + term.length)}
    </>
  );
}

/** Type-ahead combobox over the fixed 24-district Jharkhand list. Suggests, never forces —
 * any text the user types is preserved as-is unless they explicitly pick a suggestion. */
export function DistrictAutocomplete({
  value,
  onChange,
  onSelect,
  name,
  id,
  required,
  placeholder = "Start typing a district…",
  className = "citizen-input",
  autoComplete = "off",
}: DistrictAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const inputId = id ?? useId();

  const matches = useMemo(() => matchDistricts(value), [value]);
  const isExactDistrict = ALL_DISTRICTS.some(
    d => d.toLowerCase() === value.trim().toLowerCase()
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [value, open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(district: string) {
    onChange(district);
    onSelect?.(district);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || matches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => (index <= 0 ? matches.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        choose(matches[activeIndex]);
      } else {
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showEmptyState =
    open && value.trim().length > 0 && matches.length === 0;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          name={name}
          required={required}
          autoComplete={autoComplete}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={value}
          placeholder={placeholder}
          className={`${className} pr-9`}
          onChange={event => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <MapPin
          size={15}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
            isExactDistrict ? "text-[#c94a20]" : "text-[#9d876a]"
          }`}
        />
      </div>

      {open && (matches.length > 0 || showEmptyState) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-[0.625rem] border border-[#a88d67]/50 bg-[#fffaf1] py-1 shadow-[0_12px_28px_-8px_rgba(28,20,10,0.28)] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {matches.map((district, index) => (
            <li
              id={`${listboxId}-option-${index}`}
              key={district}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={event => {
                event.preventDefault();
                choose(district);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 px-3.5 py-2 font-body text-[0.83rem] transition-colors ${
                index === activeIndex
                  ? "bg-[#c94a20]/12 text-[#c94a20]"
                  : "text-[#2b493d] hover:bg-[#f1e7d6]"
              }`}
            >
              <MapPin size={13} className="shrink-0 opacity-60" />
              <span>
                <HighlightedLabel label={district} query={value} />
              </span>
            </li>
          ))}
          {showEmptyState && (
            <li className="px-3.5 py-2 font-body text-[0.78rem] italic text-[#87968e]">
              No matching district — you can still submit &ldquo;{value.trim()}
              &rdquo; as typed.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
