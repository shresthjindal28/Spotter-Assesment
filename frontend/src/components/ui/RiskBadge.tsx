import { colors, riskTextColors } from "../../lib/format";
import type { Risk } from "../../types";
export default function RiskBadge({ risk }: { risk: Risk | null }) {
  const level = risk || "Unavailable";
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded px-2 py-1 text-[9px] font-semibold"
      style={{
        color: riskTextColors[level],
        backgroundColor: `${colors[level]}18`,
      }}
    >
      {level}
    </span>
  );
}
