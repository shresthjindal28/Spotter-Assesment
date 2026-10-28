import { useState } from "react";
import { CloudSun, Map, MapPinned } from "lucide-react";
import type { Analysis, Checkpoint } from "../../types";
import type { WeatherLayer } from "../../lib/weather";
import TripMap from "./TripMap";
import RiskLegend from "./RiskLegend";
export default function MapPanel({
  result,
  selected,
  onSelect,
  hour,
  forecast,
  onForecast,
  checkpoint,
  onCheckpoint,
  busy,
}: {
  result: Analysis | null;
  selected: string;
  onSelect: (id: string) => void;
  hour: number;
  forecast: boolean;
  onForecast: (value: boolean) => void;
  checkpoint: number;
  onCheckpoint: (index: number) => void;
  busy: boolean;
}) {
  const [layer, setLayer] = useState<WeatherLayer>("risk");
  const [showWeather, setShowWeather] = useState(true);
  const [fitKey, setFitKey] = useState(0);
  const [focus, setFocus] = useState<Checkpoint>();
  const route = result?.routes.find((r) => r.id === selected);
  function chooseCheckpoint(index: number) {
    onCheckpoint(index);
    setFocus(route?.checkpoints[index]);
  }
  return (
    <section
      className="panel map-panel relative isolate z-0 overflow-hidden"
      id="live-map"
      aria-label="Interactive trip map"
    >
      <TripMap
        routes={result?.routes || []}
        selected={selected}
        onSelect={(id) => {
          setFocus(undefined);
          onSelect(id);
        }}
        hour={hour}
        forecast={forecast}
        layer={layer}
        showWeather={showWeather}
        checkpoint={checkpoint}
        onCheckpoint={chooseCheckpoint}
        focus={focus}
        fitKey={fitKey}
        onFit={() => {
          setFocus(undefined);
          setFitKey((value) => value + 1);
        }}
      />
      <div className="map-mode-control">
        <button
          aria-pressed={!forecast}
          className={!forecast ? "active" : ""}
          onClick={() => onForecast(false)}
        >
          <Map size={13} />
          Map
        </button>
        <button
          aria-pressed={forecast}
          className={forecast ? "active" : ""}
          onClick={() => onForecast(true)}
        >
          <CloudSun size={13} />
          Weather
        </button>
      </div>
      <div className="map-layer-control">
        <label className="flex cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={showWeather}
            onChange={(e) => setShowWeather(e.target.checked)}
          />
          Sampled weather
        </label>
        {(["risk", "wind", "rain", "snow"] as const).map((value) => (
          <label key={value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="weather-layer"
              checked={layer === value}
              onChange={() => {
                setLayer(value);
                setShowWeather(true);
              }}
            />
            {value === "risk"
              ? "Combined risk"
              : value === "wind"
                ? "Wind"
                : value === "rain"
                  ? "Rainfall"
                  : "Snowfall"}
          </label>
        ))}
      </div>
      {!result && (
        <div className="map-empty">
          <MapPinned size={27} className="mx-auto mb-2 text-[#698774]" />
          <h3 className="text-[13px] font-semibold">
            {busy ? "Reading the road ahead…" : "Your journey starts here"}
          </h3>
          <p className="mt-1 text-[10px] text-muted">
            {busy
              ? "Sampling forecasts at truck arrival times."
              : "Choose your trip details to compare real routes."}
          </p>
        </div>
      )}
      <RiskLegend />
      <div className="map-data-note">
        {forecast
          ? "Forecast corridor · sampled points"
          : "Truck arrival view · checkpoint ETA"}{" "}
        · not radar
      </div>
    </section>
  );
}
