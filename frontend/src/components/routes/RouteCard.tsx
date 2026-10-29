import { ChevronRight, ShieldAlert, ShieldCheck, Trophy } from "lucide-react";
import type { Route } from "../../types";
import { arrivalDate } from "../../lib/assessment";
import { duration, number, routeColors, time } from "../../lib/format";
export default function RouteCard({
  route,
  index,
  selected,
  onSelect,
}: {
  route: Route;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const restricted = route.status === "unsafe";
  return (
    <button
      type="button"
      className={`route-card ${selected ? "route-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        <span
          className="route-number"
          style={{ backgroundColor: routeColors[index % 3] }}
        >
          {index + 1}
        </span>
        <h3 className="min-w-0 truncate text-[12px] font-bold">
          Route {String.fromCharCode(65 + index)}
        </h3>
        {route.recommended && (
          <span className="recommendation-tag">
            <Trophy size={10} /> Recommended
          </span>
        )}
        <ChevronRight size={15} className="ml-auto text-[#7e9486]" />
      </div>
      <p
        className="mt-1.5 truncate pl-[31px] text-[9px] text-muted"
        title={route.summary}
      >
        {route.summary}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 pl-[31px]">
        <div>
          <strong className="metric-value">
            {Math.round(route.distance_miles).toLocaleString()} mi
          </strong>
          <span className="metric-label">Distance</span>
        </div>
        <div>
          <strong className="metric-value">
            {duration(route.duration_seconds)}
          </strong>
          <span className="metric-label">Duration</span>
        </div>
        <div>
          <strong className="metric-value">
            {new Date(route.arrival_time).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            })}
          </strong>
          <span className="metric-label">
            {arrivalDate(route.arrival_time)} · UTC
          </span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_1fr_1fr_1.15fr] divide-x divide-[#e4eae4] pl-[31px]">
        <div>
          <strong className="risk-metric text-[#92414d]">
            {number(route.risk_miles.Severe)} mi
          </strong>
          <span className="metric-label">Severe</span>
        </div>
        <div className="pl-2">
          <strong className="risk-metric text-[#a45b24]">
            {number(route.risk_miles.High)} mi
          </strong>
          <span className="metric-label">High</span>
        </div>
        <div className="pl-2">
          <strong className="risk-metric">{number(route.average_risk)}</strong>
          <span className="metric-label">Avg. / 4</span>
        </div>
        <div
          className={`flex items-center justify-center gap-1 text-[9px] font-semibold ${restricted ? "text-[#b23242]" : route.status === "viable" ? "text-[#23784f]" : "text-[#94702c]"}`}
        >
          {restricted ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
          <span>
            {restricted
              ? "No Travel"
              : route.status === "viable"
                ? "Weather eligible"
                : "Incomplete"}
          </span>
        </div>
      </div>
      {route.restriction_summary && (
        <p
          className="mt-3 text-[9px] leading-relaxed text-muted"
          data-route-restriction
        >
          {route.restriction_summary}
        </p>
      )}
      <p
        className="mt-2 text-right text-[8px] text-muted"
        title={time(route.arrival_time)}
      >
        {restricted
          ? `${number(route.risk_miles["No Travel"])} No Travel miles`
          : route.status === "insufficient-data"
            ? `${number(route.risk_miles.Unavailable)} mi without complete forecasts`
            : `Rank ${route.rank} · full forecast coverage`}
      </p>
    </button>
  );
}
