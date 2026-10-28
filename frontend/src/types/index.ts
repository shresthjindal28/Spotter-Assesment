export type Risk = "Low" | "Moderate" | "High" | "Severe" | "No Travel";
export type Location = { label: string; lat: number; lon: number };
export type Weather = {
  load_assessment?: LoadAssessment;
  availability:
    | "available"
    | "incomplete"
    | "outside_forecast_horizon"
    | "provider_unavailable";
  wind_mph: number | null;
  rain_in_hr: number | null;
  snow_in_hr: number | null;
  forecast_time: string | null;
  risk: Risk | null;
  hazards: { wind: Risk | null; rain: Risk | null; snow: Risk | null };
  complete: boolean;
};
export type Checkpoint = Weather & {
  lat: number;
  lon: number;
  arrival_time: string;
  distance_miles: number;
  timeline: Weather[];
};
export type Route = {
  no_travel_checkpoint_count?: number;
  load_restriction_checkpoint_count?: number;
  restriction_summary?: string;
  id: string;
  summary: string;
  geometry: [number, number][];
  distance_miles: number;
  duration_seconds: number;
  arrival_time: string;
  checkpoints: Checkpoint[];
  risk_miles: Record<Risk | "Unavailable", number>;
  average_risk: number | null;
  status: "viable" | "unsafe" | "insufficient-data";
  rank: number;
  recommended: boolean;
};
export type Analysis = {
  routing_profile: string;
  truck_restrictions_enforced: boolean;
  routes: Route[];
  recommended_route_id: string | null;
  warnings: string[];
  forecast_base_time: string;
  timezone: string;
};
export type AnalysisRequest = {
  origin: Location;
  destination: Location;
  departure_time: string;
  load_weight_lb: number;
  interval_miles: number;
};

export type LoadAssessment = {
  wind_mph: number | null;
  load_weight_lb: number;
  wind_unit: "mph";
  load_unit: "lb";
  general_wind_risk: Risk | null;
  risk: Risk | null;
  restriction: Risk | null;
  triggered: boolean;
  rule_code: string;
  rule: string;
  explanation: string;
};
export type LoadRiskScenario = {
  id: string;
  wind_mph: number;
  load_weight_lb: number;
  expected_restriction: Risk | null;
  expected_rule_code: string;
  expected_result: string;
};
export type LoadRiskTestResult = {
  mode: "simulated";
  source: "manual_test_input";
  scope: "wind_and_load_only";
  assessment: LoadAssessment;
};
export type LoadRiskTestRequest = {
  wind_mph: number;
  load_weight_lb: number;
  wind_unit: "mph";
  load_unit: "lb";
};
