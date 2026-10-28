import { colors } from "../../lib/format";
import { riskLevels } from "../../lib/weather";
export default function RiskLegend() {
  return (
    <div className="risk-legend">
      {[...riskLevels, "Unavailable" as const].map((level) => (
        <span
          key={level}
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <i
            className="size-[7px] rounded-full"
            style={{ backgroundColor: colors[level] }}
          />
          {level}
        </span>
      ))}
    </div>
  );
}
