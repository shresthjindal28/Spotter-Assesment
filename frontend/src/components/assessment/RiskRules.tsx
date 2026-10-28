import { ShieldCheck } from "lucide-react";
export default function RiskRules() {
  return (
    <details className="panel mt-3 p-4" id="risk-rules">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold">
        <ShieldCheck size={16} className="text-brand" />
        Risk rules & recommendation priorities
        <span className="ml-auto text-[9px] font-normal text-muted">
          View assessment rules
        </span>
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table>
          <thead>
            <tr>
              {[
                "Condition",
                "Low",
                "Moderate",
                "High",
                "Severe",
                "No Travel",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[
                "Wind (mph)",
                "<25",
                "25 to <35",
                "35 to <45",
                "45 to <55",
                "≥55",
              ].map((value) => (
                <td key={value}>{value}</td>
              ))}
            </tr>
            <tr>
              {[
                "Rain (in/hr)",
                "<0.10",
                "0.10–0.25",
                ">0.25–0.50",
                ">0.50–1.00",
                ">1.00",
              ].map((value) => (
                <td key={value}>{value}</td>
              ))}
            </tr>
            <tr>
              {[
                "Snow (in/hr)",
                "<0.5",
                "0.5–1.0",
                ">1.0–2.0",
                ">2.0–3.0",
                ">3.0",
              ].map((value) => (
                <td key={value}>{value}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid gap-4 text-[11px] leading-relaxed text-muted min-[800px]:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold text-ink">
            Load-specific wind overrides
          </h3>
          <ul className="list-inside list-disc space-y-1">
            <li>≥55 mph: No Travel for every load.</li>
            <li>45–54 mph (inclusive) + load &gt;30,000 lb: No Travel.</li>
            <li>35–44 mph (inclusive) + load &gt;40,000 lb: Severe.</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-ink">Recommendation order</h3>
          <p>
            Fewest Severe miles, then fewest High miles, then lowest
            mileage-weighted average risk, then shortest drive time. No Travel
            and incomplete routes cannot be recommended.
          </p>
          <p className="mt-2">
            Middle rain/snow bands include their upper endpoint. Fractional wind
            bands have no gaps. The worst hazard wins; missing data is never
            Low.
          </p>
        </div>
      </div>
    </details>
  );
}
