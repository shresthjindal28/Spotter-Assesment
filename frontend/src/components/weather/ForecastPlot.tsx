import { useEffect, useRef, useState } from "react";
import type { ForecastSeries } from "./ForecastChart";
function path(
  values: (number | null)[],
  maximum: number,
  fill: boolean,
  plotWidth: number,
) {
  let result = "";
  let segment: string[] = [];
  function close() {
    if (segment.length) {
      result +=
        segment.join(" ") +
        (fill
          ? ` L ${segment[segment.length - 1].split(" ")[1]} 112 L ${segment[0].split(" ")[1]} 112 Z `
          : " ");
      segment = [];
    }
  }
  values.forEach((value, i) => {
    if (value === null) {
      close();
      return;
    }
    const x = 38 + (i / 48) * plotWidth,
      y = 112 - Math.min(value / maximum, 1) * 88;
    segment.push(
      `${segment.length ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`,
    );
  });
  close();
  return result;
}
export default function ForecastPlot({
  series,
  hour,
  mile,
  windMax,
  precipitationMax,
}: {
  series: ForecastSeries[];
  hour: number;
  mile: number;
  windMax: number;
  precipitationMax: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(250, entries[0].contentRect.width)),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const plotWidth = width - 78;
  return (
    <div className="forecast-chart" ref={container}>
      <svg
        viewBox={`0 0 ${width} 140`}
        role="img"
        aria-label={`Real hourly wind, rainfall and snowfall forecasts at mile ${mile.toFixed(1)}. Wind uses the left mph axis; precipitation uses the right inches per hour axis.`}
        preserveAspectRatio="none"
      >
        <defs>
          {series.map((s) => (
            <linearGradient
              key={s.name}
              id={`fill-${s.name}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity=".35" />
              <stop offset="100%" stopColor={s.color} stopOpacity=".04" />
            </linearGradient>
          ))}
        </defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="38"
              x2={width - 40}
              y1={112 - f * 88}
              y2={112 - f * 88}
              stroke="#dfe7de"
              strokeDasharray="3 4"
            />
            <text x="30" y={115 - f * 88} textAnchor="end">
              {(windMax * f).toFixed(0)}
            </text>
            <text x={width - 32} y={115 - f * 88}>
              {(precipitationMax * f).toFixed(2)}
            </text>
          </g>
        ))}
        <text x="13" y="12">
          mph
        </text>
        <text x={width - 35} y="12">
          in/hr
        </text>
        {series.map((s) => (
          <g key={s.name}>
            <path
              d={path(s.values, s.maximum, true, plotWidth)}
              fill={`url(#fill-${s.name})`}
            />
            <path
              d={path(s.values, s.maximum, false, plotWidth)}
              stroke={s.color}
              strokeWidth="2"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        <line
          x1={38 + (hour / 48) * plotWidth}
          x2={38 + (hour / 48) * plotWidth}
          y1="18"
          y2="112"
          stroke="#426958"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        {[0, 12, 24, 36, 48].map((h) => (
          <text
            key={h}
            x={38 + (h / 48) * plotWidth}
            y="134"
            textAnchor="middle"
          >
            +{h}h
          </text>
        ))}
      </svg>
      <p className="mt-1 text-[8px] text-muted">
        Forecast at mile {mile.toFixed(1)} · gaps indicate unavailable
        measurements · separate axes for wind and precipitation
      </p>
    </div>
  );
}
