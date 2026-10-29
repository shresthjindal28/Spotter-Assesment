import type { AnalysisRequest } from "../types";

export function sameTrip(
  first: AnalysisRequest | null,
  second: AnalysisRequest | null,
): boolean {
  if (!first || !second) return false;
  return (
    first.origin.label === second.origin.label &&
    first.origin.lat === second.origin.lat &&
    first.origin.lon === second.origin.lon &&
    first.destination.label === second.destination.label &&
    first.destination.lat === second.destination.lat &&
    first.destination.lon === second.destination.lon &&
    Date.parse(first.departure_time) === Date.parse(second.departure_time) &&
    first.load_weight_lb === second.load_weight_lb &&
    first.interval_miles === second.interval_miles
  );
}

export function assessmentFreshness(
  analyzedAt: string | undefined,
  now = Date.now(),
): "fresh" | "stale" | "unknown" {
  if (!analyzedAt || !Number.isFinite(Date.parse(analyzedAt))) return "unknown";
  return now - Date.parse(analyzedAt) > 15 * 60 * 1000 ? "stale" : "fresh";
}

export function arrivalDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
