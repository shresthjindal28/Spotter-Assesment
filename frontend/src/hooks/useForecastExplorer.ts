import { useEffect, useState } from "react";
export function useForecastExplorer(baseTime: string | undefined) {
  const [hour, setHour] = useState(0);
  const [forecast, setForecast] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || !baseTime) return;
    const timer = window.setInterval(() => {
      setHour((current) => (current + 1) % 49);
    }, 1200);
    return () => clearInterval(timer);
  }, [playing, baseTime]);
  function changeHour(next: number) {
    setHour(next);
    setForecast(true);
  }
  function changeMode(next: boolean) {
    setForecast(next);
    if (!next) setPlaying(false);
  }
  function togglePlay() {
    setForecast(true);
    setPlaying((current) => !current);
  }
  function reset() {
    setHour(0);
    setForecast(false);
    setPlaying(false);
  }
  return {
    hour,
    forecast,
    playing,
    changeHour,
    changeMode,
    togglePlay,
    reset,
    time: baseTime
      ? new Date(new Date(baseTime).getTime() + hour * 3600000).toISOString()
      : null,
  };
}
