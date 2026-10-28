import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Checkpoint, Route } from "../../types";
export default function MapViewport({
  routes,
  selected,
  focus,
  fitKey,
}: {
  routes: Route[];
  selected: string;
  focus: Checkpoint | undefined;
  fitKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    const route = routes.find((r) => r.id === selected);
    const points = (route ? [route] : routes).flatMap((r) =>
      r.geometry.map(([lon, lat]) => [lat, lon] as [number, number]),
    );
    if (points.length)
      map.fitBounds(points, { padding: [40, 40], maxZoom: 12, animate: false });
  }, [map, routes, selected, fitKey]);
  useEffect(() => {
    if (focus) map.panTo([focus.lat, focus.lon], { animate: false });
  }, [focus, map]);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
