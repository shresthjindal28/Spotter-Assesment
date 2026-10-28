import { LocateFixed, Minus, Plus } from "lucide-react";
import { useMap } from "react-leaflet";
export default function MapControls({ onFit }: { onFit: () => void }) {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control map-navigation">
        <button aria-label="Zoom in" onClick={() => map.zoomIn()}>
          <Plus size={17} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.zoomOut()}>
          <Minus size={17} />
        </button>
        <button aria-label="Fit selected route" onClick={onFit}>
          <LocateFixed size={17} />
        </button>
      </div>
    </div>
  );
}
