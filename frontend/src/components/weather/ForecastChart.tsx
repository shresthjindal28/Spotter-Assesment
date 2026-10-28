import ForecastPlot from "./ForecastPlot";
import type { Checkpoint } from "../../types";
export type ForecastSeries = {
  name: string;
  color: string;
  values: (number | null)[];
  maximum: number;
};
export default function ForecastChart({
  point,
  hour,
}: {
  point: Checkpoint | undefined;
  hour: number;
}) {
  if (!point)
    return (
      <div className="chart-empty">
        <span>48-hour checkpoint forecast</span>
        <p>
          Wind, rainfall and snowfall trends will appear here after analysis.
        </p>
      </div>
    );
  const rows = point.timeline;
  const wind = rows.map((w) => w.wind_mph),
    rain = rows.map((w) => w.rain_in_hr),
    snow = rows.map((w) => w.snow_in_hr);
  const windMax = Math.max(60, ...wind.filter((v): v is number => v !== null));
  const precipitationMax = Math.max(
    0.1,
    ...[...rain, ...snow].filter((v): v is number => v !== null),
  );
  const series: ForecastSeries[] = [
    { name: "Snow", color: "#9c7cc8", values: snow, maximum: precipitationMax },
    { name: "Rain", color: "#58a984", values: rain, maximum: precipitationMax },
    { name: "Wind", color: "#438dc7", values: wind, maximum: windMax },
  ];
  const hasData = series.some((s) => s.values.some((v) => v !== null));
  if (!hasData)
    return (
      <div className="chart-empty">
        <span>Forecast unavailable at this checkpoint</span>
        <p>
          There is no weather coverage for these hours. Missing data is not
          drawn as zero.
        </p>
      </div>
    );
  return (
    <ForecastPlot
      series={series}
      hour={hour}
      mile={point.distance_miles}
      windMax={windMax}
      precipitationMax={precipitationMax}
    />
  );
}
