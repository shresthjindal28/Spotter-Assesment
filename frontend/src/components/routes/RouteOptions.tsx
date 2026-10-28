import { Route as RouteIcon, Trophy } from "lucide-react";
import type { Analysis } from "../../types";
import RouteCard from "./RouteCard";
export default function RouteOptions({
  result,
  selected,
  onSelect,
  busy,
}: {
  result: Analysis | null;
  selected: string;
  onSelect: (id: string) => void;
  busy: boolean;
}) {
  return (
    <section
      className="panel flex min-h-0 flex-col p-3"
      aria-label="Route options"
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2>Route Options {result ? `(${result.routes.length})` : ""}</h2>
        {result?.recommended_route_id && (
          <span className="recommendation-tag">
            <Trophy size={11} /> Recommended
          </span>
        )}
      </div>
      {result ? (
        <div className="route-options-list">
          {result.routes.map((route, index) => (
            <RouteCard
              route={route}
              index={index}
              key={route.id}
              selected={route.id === selected}
              onSelect={() => onSelect(route.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[#dce6dc] bg-[#fafcf9] px-6 py-8 text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-full bg-[#e8f0e6]">
            <RouteIcon size={23} className="text-[#72916e]" />
          </span>
          <h3 className="text-[13px] font-semibold">
            {busy
              ? "Comparing the alternatives"
              : "One journey. A clearer choice."}
          </h3>
          <p className="mt-2 max-w-[240px] text-[11px] leading-relaxed text-muted">
            {busy
              ? "Routes are evaluated with the weather expected at each checkpoint arrival."
              : "Your available routes will appear here, ranked by weather exposure before travel time."}
          </p>
          <div className="mt-7 w-full space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-[55px] rounded-md border border-[#e7ece4] bg-white ${busy ? "animate-pulse" : ""}`}
              >
                <div className="m-3 h-2 w-1/3 rounded bg-[#e8eee5]" />
                <div className="mx-3 h-1.5 w-2/3 rounded bg-[#f0f3ec]" />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
