import type { Risk } from "../types";
export const colors: Record<Risk | "Unavailable", string> = {
  Low: "#258467",
  Moderate: "#cb9b28",
  High: "#e27b37",
  Severe: "#cf4953",
  "No Travel": "#78283f",
  Unavailable: "#7c8997",
};
export const routeColors = ["#25845a", "#237bc3", "#d8584f"];
export const time = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
export const number = (value: number | null, suffix = "", precision = 1) =>
  value === null ? "Unavailable" : `${value.toFixed(precision)}${suffix}`;
export const duration = (seconds: number) =>
  `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;

export const riskTextColors: Record<Risk | "Unavailable", string> = {
  Low: "#236b52",
  Moderate: "#826111",
  High: "#9b4819",
  Severe: "#a12b36",
  "No Travel": "#78283f",
  Unavailable: "#526274",
};
