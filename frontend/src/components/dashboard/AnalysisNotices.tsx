import { useEffect, useState } from "react";
import { assessmentFreshness } from "../../lib/assessment";
import { time } from "../../lib/format";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import type { Analysis } from "../../types";
export default function AnalysisNotices({
  result,
  busy,
  tripLabel,
  outdated,
}: {
  result: Analysis | null;
  busy: boolean;
  tripLabel: string;
  outdated: boolean;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const freshness = assessmentFreshness(result?.analyzed_at, now);
  if (!result && !busy) return null;
  return (
    <div className="mb-3 space-y-2">
      {busy && (
        <div
          className="flex items-center gap-3 rounded-lg border border-[#d7e4d4] bg-[#edf4e9] px-4 py-3 text-[11px] text-[#466743]"
          role="status"
        >
          <LoaderCircle
            size={16}
            className="animate-spin motion-reduce:animate-none"
          />
          Finding routes and evaluating weather at each estimated arrival…
        </div>
      )}
      {result && (
        <>
          <p className="px-1 text-[10px] text-muted">{tripLabel}</p>
          {result.analyzed_at && (
            <p className="px-1 text-[9px] text-muted">
              Assessed {time(result.analyzed_at)}. Weather responses may be
              cached for up to 15 minutes.
            </p>
          )}
          {outdated && (
            <p className="warning-banner" role="status" data-inputs-changed>
              Trip inputs have changed. The results below still apply to the
              submitted trip shown above; analyze again to update them.
            </p>
          )}
          {freshness !== "fresh" && (
            <p className="warning-banner" role="status" data-analysis-freshness>
              {freshness === "stale"
                ? "This analysis is over 15 minutes old. Reanalyze to request updated forecasts."
                : "Analysis time is unavailable. Reanalyze to verify forecast freshness."}
            </p>
          )}
          {result.warnings.map((message, i) => (
            <div
              key={i}
              className="warning-banner flex items-start gap-2"
              role="status"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {message}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
