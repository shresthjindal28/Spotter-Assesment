import { Layers } from "lucide-react";
import type { Route } from "../../types";
import { duration, number } from "../../lib/format";
export default function RouteComparison({
  routes,
  selected,
  onSelect,
}: {
  routes: Route[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel mt-3 p-4" id="comparison">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2">
          <Layers size={15} />
          Route comparison
        </h2>
        <span className="text-[9px] text-muted">
          Severe miles → High miles → average risk → travel time
        </span>
      </div>
      {routes.length ? (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {[
                  "Route",
                  "Distance",
                  "Drive time",
                  "Severe mi",
                  "High mi",
                  "No Travel mi",
                  "Unknown mi",
                  "Avg. risk / 4",
                  "Weather eligibility",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.map((route, i) => (
                <tr
                  key={route.id}
                  className={selected === route.id ? "bg-[#f0f6ef]" : ""}
                >
                  <td>
                    <button
                      className="text-left font-semibold text-brand"
                      onClick={() => onSelect(route.id)}
                    >
                      Route {String.fromCharCode(65 + i)} · {route.summary}
                    </button>
                  </td>
                  <td>{number(route.distance_miles)} mi</td>
                  <td>{duration(route.duration_seconds)}</td>
                  <td>{number(route.risk_miles.Severe)}</td>
                  <td>{number(route.risk_miles.High)}</td>
                  <td>{number(route.risk_miles["No Travel"])}</td>
                  <td>{number(route.risk_miles.Unavailable)}</td>
                  <td>{number(route.average_risk)}</td>
                  <td className="max-w-[240px] whitespace-normal">
                    {route.status}
                    {route.restriction_summary && (
                      <small className="mt-1 block text-[9px] leading-relaxed text-muted">
                        {route.restriction_summary}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-3 text-[11px] text-muted">
          Compare real route exposure after analyzing a trip. A No Travel
          segment or incomplete forecast makes a route ineligible for
          recommendation.
        </p>
      )}
    </section>
  );
}
