import { ChevronDown, ChevronRight, MapPin } from "lucide-react";
import type { Route } from "../../types";
import { number, time } from "../../lib/format";
import RiskBadge from "../ui/RiskBadge";
import { colors } from "../../lib/format";
export default function CheckpointList({
  route,
  routeIndex,
  index,
  onSelect,
  hour,
  forecast,
}: {
  route: Route | undefined;
  routeIndex: number;
  index: number;
  onSelect: (index: number) => void;
  hour: number;
  forecast: boolean;
}) {
  return (
    <section className="panel flex min-h-0 flex-col p-4" id="checkpoints">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2>
          Checkpoints{" "}
          {route ? `(Route ${String.fromCharCode(65 + routeIndex)})` : ""}
        </h2>
        <span className="flex items-center gap-1 rounded border border-[#e4e9e2] bg-[#f8faf6] px-2 py-1 text-[9px] text-muted">
          {route ? `${route.checkpoints.length} checkpoints` : "Awaiting trip"}
          <ChevronDown size={10} />
        </span>
      </div>
      {route ? (
        <div className="checkpoint-list">
          {route.checkpoints.map((point, i) => {
            const weather = forecast ? point.timeline[hour] : point;
            return (
              <div
                key={i}
                className={`checkpoint-item ${i === index ? "checkpoint-active" : ""}`}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 py-[11px] text-left"
                  aria-expanded={i === index}
                  onClick={() => onSelect(i)}
                >
                  <span
                    className="checkpoint-dot"
                    style={{
                      backgroundColor: colors[weather.risk || "Unavailable"],
                    }}
                  />
                  <strong className="w-[44px] shrink-0 text-[10px]">
                    {Math.round(point.distance_miles)} mi
                  </strong>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium">
                    {i === 0
                      ? "Origin"
                      : i === route.checkpoints.length - 1
                        ? "Destination"
                        : `Checkpoint ${i + 1}`}
                  </span>
                  <span className="hidden text-[9px] text-muted min-[1450px]:block">
                    {new Date(point.arrival_time).toLocaleTimeString(
                      undefined,
                      { hour: "2-digit", minute: "2-digit", timeZone: "UTC" },
                    )}
                  </span>
                  <RiskBadge risk={weather.risk} />
                  <ChevronRight size={12} className="shrink-0 text-muted" />
                </button>
                {i === index && (
                  <div className="mb-2 ml-[17px] rounded-md bg-white/80 p-2.5 text-[9px] leading-relaxed text-muted">
                    <div className="mb-2 grid grid-cols-3 gap-1">
                      <span>
                        Wind
                        <strong className="block text-ink">
                          {number(weather.wind_mph, " mph")}
                        </strong>
                      </span>
                      <span>
                        Rain
                        <strong className="block text-ink">
                          {number(weather.rain_in_hr, " in/hr", 3)}
                        </strong>
                      </span>
                      <span>
                        Snow
                        <strong className="block text-ink">
                          {number(weather.snow_in_hr, " in/hr", 3)}
                        </strong>
                      </span>
                    </div>
                    {weather.load_assessment && (
                      <p
                        className="mb-2 rounded border border-[#e1e8dc] p-2"
                        data-checkpoint-load-rule
                      >
                        <strong className="block text-ink">
                          Load rule:{" "}
                          {weather.load_assessment.restriction ||
                            "No load-specific restriction"}
                        </strong>
                        {weather.load_assessment.rule}{" "}
                        {weather.load_assessment.explanation}
                      </p>
                    )}
                    <p>Truck arrival: {time(point.arrival_time)}</p>
                    <p>
                      Forecast valid:{" "}
                      {weather.forecast_time
                        ? time(weather.forecast_time)
                        : "Unavailable"}
                    </p>
                    <p>
                      Coverage:{" "}
                      {weather.availability?.replaceAll("_", " ") ||
                        "unavailable"}
                    </p>
                    <p className="mt-1">
                      Wind / rain / snow risks:{" "}
                      {weather.hazards.wind || "Unknown"} /{" "}
                      {weather.hazards.rain || "Unknown"} /{" "}
                      {weather.hazards.snow || "Unknown"}
                    </p>
                    <p className="mt-1">
                      {point.lat.toFixed(4)}, {point.lon.toFixed(4)} ·
                      load-adjusted classification
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted">
          <MapPin size={22} className="text-[#9cb39d]" />
          <p className="text-[11px]">Weather at every step of your trip.</p>
          <p className="max-w-[230px] text-[10px] leading-relaxed">
            Checkpoint arrivals and real forecasts appear after analysis.
          </p>
        </div>
      )}
    </section>
  );
}
