import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
} from "react-leaflet";
import { divIcon } from "leaflet";
import type { Checkpoint, Route } from "../../types";
import type { WeatherLayer } from "../../lib/weather";
import { routeColors } from "../../lib/format";
import MapViewport from "./MapViewport";
import CheckpointMarker from "./CheckpointMarker";
import MapControls from "./MapControls";
const originIcon = divIcon({
  className: "endpoint-marker",
  html: '<span class="endpoint-pin origin-pin"></span>',
  iconSize: [24, 30],
  iconAnchor: [12, 28],
});
const destinationIcon = divIcon({
  className: "endpoint-marker",
  html: '<span class="endpoint-pin destination-pin"></span>',
  iconSize: [24, 30],
  iconAnchor: [12, 28],
});
export default function TripMap({
  routes,
  selected,
  onSelect,
  hour,
  forecast,
  layer,
  showWeather,
  checkpoint,
  onCheckpoint,
  focus,
  fitKey,
  onFit,
}: {
  routes: Route[];
  selected: string;
  onSelect: (id: string) => void;
  hour: number;
  forecast: boolean;
  layer: WeatherLayer;
  showWeather: boolean;
  checkpoint: number;
  onCheckpoint: (index: number) => void;
  focus: Checkpoint | undefined;
  fitKey: number;
  onFit: () => void;
}) {
  const route = routes.find((r) => r.id === selected);
  const endpoints = route
    ? [route.geometry[0], route.geometry[route.geometry.length - 1]]
    : [];
  return (
    <MapContainer
      center={[23, 79]}
      zoom={4}
      className="h-full w-full bg-[#e8eee5]"
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapControls onFit={onFit} />
      <MapViewport
        routes={routes}
        selected={selected}
        focus={focus}
        fitKey={fitKey}
      />
      {routes.map((r, i) => (
        <Polyline
          key={r.id}
          positions={r.geometry.map(([lon, lat]) => [lat, lon])}
          pathOptions={{
            color: routeColors[i % 3],
            weight: selected === r.id ? 5 : 3,
            opacity: selected === r.id ? 1 : 0.65,
            dashArray:
              r.status === "unsafe"
                ? "8 5"
                : r.status === "insufficient-data"
                  ? "3 6"
                  : undefined,
          }}
          eventHandlers={{ click: () => onSelect(r.id) }}
        >
          <Tooltip sticky direction="top">
            Route {String.fromCharCode(65 + i)} · {r.summary}
          </Tooltip>
        </Polyline>
      ))}
      {showWeather &&
        route?.checkpoints.map((p, i) => (
          <CheckpointMarker
            key={`${route.id}-${i}`}
            point={p}
            index={i}
            hour={hour}
            forecast={forecast}
            layer={layer}
            active={checkpoint === i}
            onSelect={onCheckpoint}
          />
        ))}
      {endpoints.map(([lon, lat], i) => (
        <Marker
          key={i}
          position={[lat, lon]}
          icon={i === 0 ? originIcon : destinationIcon}
        >
          <Tooltip>{i === 0 ? "Origin" : "Destination"}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
