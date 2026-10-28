import { AlertTriangle, LoaderCircle } from "lucide-react";
import type { Analysis } from "../../types";
export default function AnalysisNotices({
  result,
  busy,
  tripLabel,
}: {
  result: Analysis | null;
  busy: boolean;
  tripLabel: string;
}) {
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
