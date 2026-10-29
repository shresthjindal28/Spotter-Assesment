import { useEffect, useRef, useState } from "react";
import { analyzeRoutes } from "../lib/api";
import { sameTrip } from "../lib/assessment";
import type { Analysis, AnalysisRequest, Location } from "../types";

export type TripDraft = {
  origin: Location | null;
  destination: Location | null;
  departure: string;
  load: string;
  interval: number;
};
function initialDeparture() {
  const date = new Date(Date.now() + 3600000);
  date.setMinutes(0, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function useTripAnalysis() {
  const [draft, setDraft] = useState<TripDraft>({
    origin: null,
    destination: null,
    departure: initialDeparture(),
    load: "30000",
    interval: 25,
  });
  const [analyzedRequest, setAnalyzedRequest] =
    useState<AnalysisRequest | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState("");
  const [checkpoint, setCheckpoint] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tripLabel, setTripLabel] = useState("");
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  function updateDraft(patch: Partial<TripDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function selectRoute(id: string) {
    setSelected(id);
    setCheckpoint(0);
  }
  async function submit() {
    if (locked.current) return;
    setError("");
    const { origin, destination, departure, load, interval } = draft;
    if (!origin || !destination) {
      setError(
        "Choose an origin and destination from the location suggestions.",
      );
      return;
    }
    const date = new Date(departure),
      weight = Number(load);
    if (
      !Number.isFinite(date.getTime()) ||
      date.getTime() < Date.now() - 300000 ||
      date.getTime() > Date.now() + 15 * 86400000
    ) {
      setError("Choose a departure between now and 15 days ahead.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 1 || weight > 200000) {
      setError("Enter a load weight between 1 and 200,000 lb.");
      return;
    }
    if (origin.lat === destination.lat && origin.lon === destination.lon) {
      setError("Origin and destination must differ.");
      return;
    }
    const payload: AnalysisRequest = {
      origin,
      destination,
      departure_time: date.toISOString(),
      load_weight_lb: weight,
      interval_miles: interval,
    };
    locked.current = true;
    setBusy(true);
    setResult(null);
    setCheckpoint(0);
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      const data = await analyzeRoutes(payload, controller.current.signal);
      setAnalyzedRequest(data.trip || payload);
      setResult(data);
      setSelected(data.recommended_route_id || data.routes[0]?.id || "");
      setTripLabel(
        `${origin.label} → ${destination.label} · ${weight.toLocaleString()} lb · ${interval} mi samples`,
      );
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const currentDeparture = new Date(draft.departure);
  const currentRequest: AnalysisRequest | null =
    draft.origin &&
    draft.destination &&
    Number.isFinite(currentDeparture.getTime())
      ? {
          origin: draft.origin,
          destination: draft.destination,
          departure_time: currentDeparture.toISOString(),
          load_weight_lb: Number(draft.load),
          interval_miles: draft.interval,
        }
      : null;
  return {
    resultsOutOfDate:
      Boolean(result) && !sameTrip(currentRequest, analyzedRequest),
    draft,
    updateDraft,
    result,
    selected,
    selectRoute,
    checkpoint,
    setCheckpoint,
    busy,
    error,
    tripLabel,
    submit,
    route: result?.routes.find((r) => r.id === selected),
  };
}
