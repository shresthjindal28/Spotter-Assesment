import type { FormEvent } from "react";
import { FlaskConical, LoaderCircle } from "lucide-react";
import { useLoadRiskTest } from "../../hooks/useLoadRiskTest";
import RiskBadge from "../ui/RiskBadge";

export default function LoadRiskTest() {
  const test = useLoadRiskTest();
  const assessment = test.result?.assessment;
  function submit(event: FormEvent) {
    event.preventDefault();
    void test.assess();
  }

  return (
    <section
      className="panel mt-3 p-4"
      id="load-risk-test"
      aria-labelledby="load-risk-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2" id="load-risk-heading">
          <FlaskConical size={16} className="text-brand" />
          Load Risk Test
        </h2>
        <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-800">
          SIMULATED INPUTS
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Manually test wind and load rules without a routing key or a weather
        request. These values are not live observations and never change your
        trip forecasts or route recommendation.
      </p>
      <form
        className="mt-4 grid gap-3 min-[700px]:grid-cols-[1fr_1fr_auto]"
        onSubmit={submit}
      >
        <label className="field-label">
          Test wind speed (mph)
          <input
            className="field-input"
            type="number"
            min="0"
            step="any"
            required
            disabled={test.busy}
            value={test.wind}
            onChange={(e) => test.updateWind(e.target.value)}
          />
        </label>
        <label className="field-label">
          Test load weight (lb)
          <input
            className="field-input"
            type="number"
            min="1"
            max="200000"
            step="any"
            required
            disabled={test.busy}
            value={test.load}
            onChange={(e) => test.updateLoad(e.target.value)}
          />
        </label>
        <button
          className="primary h-10 self-end"
          type="submit"
          disabled={test.busy}
        >
          {test.busy && (
            <LoaderCircle
              size={14}
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {test.busy ? "Assessing…" : "Run Load Risk Test"}
        </button>
      </form>
      {test.error && (
        <p className="error-banner mt-3" role="alert">
          {test.error}
        </p>
      )}
      {assessment && (
        <div
          className="mt-4 rounded-lg border border-[#dce7d8] bg-[#f8fbf5] p-3"
          role="status"
          aria-label="Load risk test result"
          data-load-test-result
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-muted">
              Simulated: {assessment.wind_mph} mph ·{" "}
              {assessment.load_weight_lb.toLocaleString()} lb
            </span>
            <span className="flex items-center gap-2 text-[10px]">
              Final wind risk
              <RiskBadge risk={assessment.risk} />
            </span>
          </div>
          <dl className="mt-3 grid gap-3 text-[11px] min-[600px]:grid-cols-2">
            <div>
              <dt className="text-muted">General wind risk</dt>
              <dd className="mt-1 font-semibold">
                {assessment.general_wind_risk || "Unavailable"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Load-specific restriction</dt>
              <dd className="mt-1 font-semibold">
                {assessment.restriction || "No load-specific restriction"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] font-semibold" data-triggered-rule>
            {assessment.rule}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {assessment.explanation}
          </p>
          <p className="mt-2 text-[9px] text-muted">
            Rule: {assessment.rule_code} · Wind/load only; rainfall and snowfall
            are not evaluated in this test. No additional load restriction does
            not mean Low risk or truck-safe routing.
          </p>
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-[11px] font-semibold">
          Predefined assessment scenarios
        </h3>
        <p className="mt-1 text-[10px] text-muted">
          Select a case to run the backend assessment. Expected results below
          refer to load-specific restrictions.
        </p>
        {test.loadingScenarios && (
          <p className="mt-3 text-[11px] text-muted" role="status">
            Loading test scenarios…
          </p>
        )}
        {test.scenarioError && (
          <p className="error-banner mt-3" role="alert">
            Could not load scenarios: {test.scenarioError} You can still enter
            values manually.
          </p>
        )}
        {!test.loadingScenarios &&
          !test.scenarioError &&
          test.scenarios.length === 0 && (
            <p className="mt-3 text-[11px] text-muted">
              No predefined scenarios are available. Enter values above.
            </p>
          )}
        <div className="mt-3 grid gap-2 min-[650px]:grid-cols-2 min-[1150px]:grid-cols-3">
          {test.scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              data-scenario-id={scenario.id}
              disabled={test.busy}
              onClick={() => test.chooseScenario(scenario)}
              className="min-w-0 rounded-md border border-[#e0e8da] px-3 py-2.5 text-left hover:border-[#8fa78a] hover:bg-[#f3f8ef]"
            >
              <strong className="block text-[11px]">
                {scenario.wind_mph} mph ·{" "}
                {scenario.load_weight_lb.toLocaleString()} lb
              </strong>
              <span className="mt-1 block text-[10px] leading-relaxed text-muted">
                Expected: {scenario.expected_result}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
