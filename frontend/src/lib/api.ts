import type {
  Analysis,
  AnalysisRequest,
  Location,
  LoadRiskScenario,
  LoadRiskTestRequest,
  LoadRiskTestResult,
} from "../types";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}/api${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.details;
    throw new Error(
      detail
        ? JSON.stringify(detail)
        : data?.error?.message ||
            `Request failed (${response.status}). Check the backend connection.`,
    );
  }
  if (!data) throw new Error("The backend returned an invalid response.");
  return data as T;
}
export const searchPlaces = (query: string, signal: AbortSignal) =>
  request<{ results: Location[] }>(`/geocode/?q=${encodeURIComponent(query)}`, {
    signal,
  });
export const analyzeRoutes = (payload: AnalysisRequest, signal: AbortSignal) =>
  request<Analysis>("/routes/analyze/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

export const getHealth = (signal: AbortSignal) =>
  request<{ status: string }>("/health/", { signal });

export const getLoadRiskScenarios = (signal: AbortSignal) =>
  request<{
    mode: "simulated";
    source: "manual_test_input";
    scenarios: LoadRiskScenario[];
  }>("/risk/load-test/", { signal });
export const testLoadRisk = (
  payload: LoadRiskTestRequest,
  signal: AbortSignal,
) =>
  request<LoadRiskTestResult>("/risk/load-test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
