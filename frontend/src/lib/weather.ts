import type { Risk, Weather } from "../types";
export type WeatherLayer = "risk" | "wind" | "rain" | "snow";
export const riskLevels: Risk[] = [
  "Low",
  "Moderate",
  "High",
  "Severe",
  "No Travel",
];
export function layerRisk(weather: Weather, layer: WeatherLayer): Risk | null {
  return layer === "risk" ? weather.risk : weather.hazards[layer];
}
export function layerValue(weather: Weather, layer: WeatherLayer): string {
  if (layer === "risk") return weather.risk || "Unavailable";
  const value =
    layer === "wind"
      ? weather.wind_mph
      : layer === "rain"
        ? weather.rain_in_hr
        : weather.snow_in_hr;
  return value === null
    ? "Unavailable"
    : `${value.toFixed(layer === "wind" ? 1 : 3)} ${layer === "wind" ? "mph" : "in/hr"}`;
}
