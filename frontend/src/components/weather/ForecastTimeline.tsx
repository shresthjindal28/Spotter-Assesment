import { Info, Pause, Play } from "lucide-react";
import type { Checkpoint } from "../../types";
import { time } from "../../lib/format";
import ForecastChart from "./ForecastChart";
export default function ForecastTimeline({
  baseTime,
  hour,
  forecast,
  playing,
  selectedTime,
  onHour,
  onMode,
  onPlay,
  point,
}: {
  baseTime: string | undefined;
  hour: number;
  forecast: boolean;
  playing: boolean;
  selectedTime: string | null;
  onHour: (hour: number) => void;
  onMode: (value: boolean) => void;
  onPlay: () => void;
  point: Checkpoint | undefined;
}) {
  return (
    <section className="panel p-4" id="weather">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>
          Forecast Timeline{" "}
          <span className="text-[10px] font-normal text-muted">
            (0 – 48 hours)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="mode-tabs">
            <button
              aria-pressed={!forecast}
              className={!forecast ? "active" : ""}
              onClick={() => onMode(false)}
            >
              Truck arrival view
            </button>
            <button
              aria-pressed={forecast}
              className={forecast ? "active" : ""}
              onClick={() => onMode(true)}
            >
              Forecast explorer
            </button>
          </div>
          <Info
            size={13}
            className="text-muted"
            aria-label="Forecast time is separate from truck arrival time"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          className="play-button"
          aria-label={
            playing ? "Pause forecast playback" : "Play forecast timeline"
          }
          disabled={!baseTime}
          onClick={onPlay}
        >
          {playing ? (
            <Pause size={12} />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 text-[9px] font-medium text-brand">
            {selectedTime
              ? time(selectedTime)
              : "Analyze a trip to explore hourly weather"}
          </div>
          <input
            className="forecast-slider"
            aria-label="Forecast hours after departure"
            aria-valuetext={`${hour} hours after departure`}
            type="range"
            min="0"
            max="48"
            step="1"
            value={hour}
            onChange={(e) => onHour(Number(e.target.value))}
            disabled={!baseTime}
          />
          <div className="mt-1 flex justify-between text-[8px] text-muted">
            {[0, 12, 24, 36, 48].map((h) => (
              <span key={h}>{h === 0 ? "Departure" : `+${h}h`}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-4 text-[9px] text-muted">
          {[
            ["Wind (mph)", "#438dc7"],
            ["Rain (in/hr)", "#58a984"],
            ["Snow (in/hr)", "#9c7cc8"],
          ].map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5">
              <i
                className="size-[6px] rounded-full"
                style={{ backgroundColor: color }}
              />
              {name}
            </span>
          ))}
        </div>
        <span className="hidden text-[8px] text-muted min-[700px]:block">
          Real sampled forecasts · not radar
        </span>
      </div>
      <ForecastChart point={point} hour={hour} />
      <p className="mt-2 text-[8px] leading-relaxed text-muted">
        {forecast
          ? "Map and checkpoint list show the selected common forecast hour."
          : "Each checkpoint is evaluated at its own truck arrival time."}{" "}
        Recommendations always use arrival forecasts. The chart shows the
        selected checkpoint’s hourly timeline.
      </p>
    </section>
  );
}
