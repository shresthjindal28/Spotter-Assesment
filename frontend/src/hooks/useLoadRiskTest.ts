import { useEffect, useRef, useState } from "react";
import { getLoadRiskScenarios, testLoadRisk } from "../lib/api";
import type { LoadRiskScenario, LoadRiskTestResult } from "../types";

export function useLoadRiskTest() {
  const [wind, setWind] = useState("35");
  const [load, setLoad] = useState("40001");
  const [scenarios, setScenarios] = useState<LoadRiskScenario[]>([]);
  const [result, setResult] = useState<LoadRiskTestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [scenarioError, setScenarioError] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    const presets = new AbortController();
    getLoadRiskScenarios(presets.signal)
      .then((data) => {
        if (!presets.signal.aborted) setScenarios(data.scenarios);
      })
      .catch((error: Error) => {
        if (!presets.signal.aborted) setScenarioError(error.message);
      })
      .finally(() => {
        if (!presets.signal.aborted) setLoadingScenarios(false);
      });
    return () => {
      presets.abort();
      controller.current?.abort();
    };
  }, []);

  function updateWind(value: string) {
    setWind(value);
    setResult(null);
    setError("");
  }
  function updateLoad(value: string) {
    setLoad(value);
    setResult(null);
    setError("");
  }

  async function assess(nextWind = wind, nextLoad = load) {
    if (locked.current) return;
    const windNumber = Number(nextWind),
      loadNumber = Number(nextLoad);
    setResult(null);
    setError("");
    if (!nextWind.trim() || !Number.isFinite(windNumber) || windNumber < 0) {
      setError("Enter a finite, non-negative wind speed in mph.");
      return;
    }
    if (
      !nextLoad.trim() ||
      !Number.isFinite(loadNumber) ||
      loadNumber < 1 ||
      loadNumber > 200000
    ) {
      setError("Enter a load between 1 and 200,000 lb.");
      return;
    }
    locked.current = true;
    setBusy(true);
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const data = await testLoadRisk(
        {
          wind_mph: windNumber,
          load_weight_lb: loadNumber,
          wind_unit: "mph",
          load_unit: "lb",
        },
        request.signal,
      );
      if (!request.signal.aborted) setResult(data);
    } catch (error) {
      if (!request.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Load risk test failed. Try again.",
        );
    } finally {
      locked.current = false;
      if (!request.signal.aborted) setBusy(false);
    }
  }

  function chooseScenario(scenario: LoadRiskScenario) {
    if (locked.current) return;
    const nextWind = String(scenario.wind_mph),
      nextLoad = String(scenario.load_weight_lb);
    setWind(nextWind);
    setLoad(nextLoad);
    void assess(nextWind, nextLoad);
  }

  return {
    wind,
    load,
    updateWind,
    updateLoad,
    scenarios,
    result,
    busy,
    loadingScenarios,
    scenarioError,
    error,
    assess,
    chooseScenario,
  };
}
