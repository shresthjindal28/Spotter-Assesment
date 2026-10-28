import { CircleMarker, Popup } from "react-leaflet";
import { colors, number, time } from "../../lib/format";
import { layerRisk, layerValue } from "../../lib/weather";
import type { WeatherLayer } from "../../lib/weather";
import type { Checkpoint } from "../../types";
export default function CheckpointMarker({
  point,
  index,
  hour,
  forecast,
  layer,
  active,
  onSelect,
}: {
  point: Checkpoint;
  index: number;
  hour: number;
  forecast: boolean;
  layer: WeatherLayer;
  active: boolean;
  onSelect: (index: number) => void;
}) {
  const weather = forecast ? point.timeline[hour] : point;
  const color = colors[layerRisk(weather, layer) || "Unavailable"];
  return (
    <CircleMarker
      center={[point.lat, point.lon]}
      radius={forecast ? 13 : active ? 8 : 5}
      pathOptions={{
        color: forecast ? color : "#ffffff",
        weight: active ? 3 : 2,
        fillColor: color,
        fillOpacity: forecast ? 0.38 : 1,
      }}
      eventHandlers={{ click: () => onSelect(index) }}
    >
      <Popup>
        <div className="weather-popup">
          <strong>
            {number(point.distance_miles)} mi · {weather.risk || "Unavailable"}
          </strong>
          <p>Selected layer: {layerValue(weather, layer)}</p>
          <p>Truck ETA: {time(point.arrival_time)}</p>
          <p>
            Forecast valid:{" "}
            {weather.forecast_time
              ? time(weather.forecast_time)
              : "Unavailable"}
          </p>
          <p>
            Wind {number(weather.wind_mph, " mph")} ·{" "}
            {weather.hazards.wind || "Unknown"}
          </p>
          <p>
            Rain {number(weather.rain_in_hr, " in/hr", 3)} ·{" "}
            {weather.hazards.rain || "Unknown"}
          </p>
          <p>
            Snow {number(weather.snow_in_hr, " in/hr", 3)} ·{" "}
            {weather.hazards.snow || "Unknown"}
          </p>
          <p>
            Coverage:{" "}
            {weather.availability?.replaceAll("_", " ") || "unavailable"}
          </p>
          {weather.load_assessment && (
            <p>
              <strong>
                Load rule:{" "}
                {weather.load_assessment.restriction ||
                  "No load-specific restriction"}
              </strong>
              <br />
              {weather.load_assessment.rule}
              <br />
              {weather.load_assessment.explanation}
            </p>
          )}
          <small>Final risk includes load-specific wind adjustments.</small>
        </div>
      </Popup>
    </CircleMarker>
  );
}
