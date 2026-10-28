import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, MapPin, X } from "lucide-react";
import { searchPlaces } from "../lib/api";
import type { Location } from "../types";
export default function LocationInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Location | null;
  onChange: (value: Location | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Location[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || value || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchPlaces(query, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setItems(data.results);
            setError(
              data.results.length
                ? ""
                : "No matches. Try a nearby city or a more specific address.",
            );
          }
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value, open]);
  function choose(item: Location) {
    onChange(item);
    setQuery(item.label);
    setOpen(false);
    setActive(-1);
    setLoading(false);
  }
  return (
    <div
      className="relative min-w-0"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label className="field-label">
        {label}
        <div className="field-input flex items-center gap-2">
          <MapPin size={15} className="shrink-0 text-[#7e948b]" />
          <input
            className="min-w-0 w-full bg-transparent outline-none"
            required
            aria-label={label}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && items.length > 0}
            aria-controls={listId}
            aria-activedescendant={
              active >= 0 ? `${listId}-${active}` : undefined
            }
            value={value?.label ?? query}
            autoComplete="off"
            placeholder={
              label === "Origin"
                ? "Departure city or address"
                : "Arrival city or address"
            }
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(null);
              setItems([]);
              setError("");
              setLoading(false);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((i) => Math.min(i + 1, items.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && open && active >= 0 && items[active]) {
                e.preventDefault();
                choose(items[active]);
              }
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {loading ? (
            <LoaderCircle
              size={13}
              className="shrink-0 animate-spin motion-reduce:animate-none"
            />
          ) : (
            (value || query) && (
              <button
                type="button"
                aria-label={`Clear ${label.toLowerCase()}`}
                className="text-[#86958d] hover:text-ink"
                onClick={() => {
                  onChange(null);
                  setQuery("");
                  setItems([]);
                  setError("");
                  setLoading(false);
                }}
              >
                <X size={13} />
              </button>
            )
          )}
        </div>
      </label>
      {open && !value && (items.length > 0 || error || loading) && (
        <div className="suggestions" aria-live="polite">
          {loading && (
            <p className="p-3 text-[11px] text-muted">Finding places…</p>
          )}
          {error && <p className="p-3 text-[11px] text-red-700">{error}</p>}
          <ul id={listId} role="listbox" aria-label={`${label} suggestions`}>
            {items.map((item, i) => (
              <li
                role="option"
                aria-selected={i === active}
                id={`${listId}-${i}`}
                key={`${item.lat}-${item.lon}-${i}`}
              >
                <button
                  type="button"
                  className={`suggestion-option ${i === active ? "bg-[#edf4ef]" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(item)}
                >
                  <span>{item.label}</span>
                  <small className="mt-1 block text-[9px] text-muted">
                    {item.lat.toFixed(3)}, {item.lon.toFixed(3)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
