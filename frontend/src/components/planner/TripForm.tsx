import type { FormEvent } from "react";
import { ArrowLeftRight, ArrowRight, LoaderCircle, Truck } from "lucide-react";
import LocationInput from "../LocationInput";
import type { TripDraft } from "../../hooks/useTripAnalysis";
export default function TripForm({
  draft,
  onChange,
  onSubmit,
  busy,
  error,
}: {
  draft: TripDraft;
  onChange: (value: Partial<TripDraft>) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string;
}) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }
  return (
    <section className="panel relative z-30 p-[18px]" id="planner">
      <div className="mb-4 flex items-center gap-3">
        <Truck size={27} strokeWidth={1.5} className="text-[#6f8e83]" />
        <div>
          <h1 className="text-[15px] font-bold text-ink">Plan your journey</h1>
          <p className="mt-0.5 text-[11px] text-muted">
            Find a better route with real weather intelligence
          </p>
        </div>
        <span className="ml-auto hidden text-[10px] text-muted min-[850px]:block">
          Departure in {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </span>
      </div>
      <form onSubmit={submit}>
        <div className="trip-form-grid">
          <LocationInput
            label="Origin"
            value={draft.origin}
            onChange={(origin) => onChange({ origin })}
          />
          <button
            className="swap-button"
            type="button"
            aria-label="Swap origin and destination"
            onClick={() =>
              onChange({ origin: draft.destination, destination: draft.origin })
            }
          >
            <ArrowLeftRight size={16} />
          </button>
          <LocationInput
            label="Destination"
            value={draft.destination}
            onChange={(destination) => onChange({ destination })}
          />
          <label className="field-label">
            Departure date & time
            <input
              className="field-input"
              type="datetime-local"
              required
              value={draft.departure}
              onChange={(e) => onChange({ departure: e.target.value })}
            />
            <span className="min-[850px]:hidden text-[9px] text-muted">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </label>
          <label className="field-label">
            Truck load (lb)
            <div className="field-input flex items-center gap-2">
              <Truck size={15} className="shrink-0 text-[#799087]" />
              <input
                className="min-w-0 w-full bg-transparent outline-none"
                aria-label="Truck load (lb)"
                type="number"
                required
                min="1"
                max="200000"
                step="1"
                value={draft.load}
                onChange={(e) => onChange({ load: e.target.value })}
              />
            </div>
          </label>
          <div>
            <span className="field-label">Weather sampling</span>
            <div
              className="sampling-options mt-[6px]"
              role="group"
              aria-label="Weather sampling interval"
            >
              {[10, 25, 50].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={draft.interval === value}
                  onClick={() => onChange({ interval: value })}
                  className={draft.interval === value ? "active" : ""}
                >
                  {value} mi
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="primary h-10 self-end"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle
                size={16}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {busy ? "Analyzing…" : "Analyze Routes"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </div>
        {error && (
          <div className="error-banner mt-4" role="alert">
            {error}
          </div>
        )}
      </form>
    </section>
  );
}
