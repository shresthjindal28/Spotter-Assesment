import Footer from "./components/layout/Footer";
import TripForm from "./components/planner/TripForm";
import MapPanel from "./components/map/MapPanel";
import RouteOptions from "./components/routes/RouteOptions";
import RouteComparison from "./components/routes/RouteComparison";
import ForecastTimeline from "./components/weather/ForecastTimeline";
import CheckpointList from "./components/checkpoints/CheckpointList";
import LoadRiskTest from "./components/assessment/LoadRiskTest";
import RiskRules from "./components/assessment/RiskRules";
import AnalysisNotices from "./components/dashboard/AnalysisNotices";
import { useTripAnalysis } from "./hooks/useTripAnalysis";
import { useForecastExplorer } from "./hooks/useForecastExplorer";

export default function App() {
  const trip = useTripAnalysis();
  const explorer = useForecastExplorer(trip.result?.forecast_base_time);
  const routeIndex =
    trip.result?.routes.findIndex((route) => route.id === trip.selected) ?? 0;
  function analyze() {
    explorer.reset();
    void trip.submit();
  }
  return (
    <div className="min-h-screen bg-page">
      <main className="dashboard-shell">
        <TripForm
          draft={trip.draft}
          onChange={trip.updateDraft}
          onSubmit={analyze}
          busy={trip.busy}
          error={trip.error}
        />
        <div className="mt-3">
          <AnalysisNotices
            result={trip.result}
            busy={trip.busy}
            tripLabel={trip.tripLabel}
          />
        </div>
        <div className="dashboard-grid">
          <MapPanel
            result={trip.result}
            selected={trip.selected}
            onSelect={trip.selectRoute}
            hour={explorer.hour}
            forecast={explorer.forecast}
            onForecast={explorer.changeMode}
            checkpoint={trip.checkpoint}
            onCheckpoint={trip.setCheckpoint}
            busy={trip.busy}
          />
          <RouteOptions
            result={trip.result}
            selected={trip.selected}
            onSelect={trip.selectRoute}
            busy={trip.busy}
          />
          <ForecastTimeline
            baseTime={trip.result?.forecast_base_time}
            hour={explorer.hour}
            forecast={explorer.forecast}
            playing={explorer.playing}
            selectedTime={explorer.time}
            onHour={explorer.changeHour}
            onMode={explorer.changeMode}
            onPlay={explorer.togglePlay}
            point={trip.route?.checkpoints[trip.checkpoint]}
          />
          <CheckpointList
            route={trip.route}
            routeIndex={routeIndex}
            index={trip.checkpoint}
            onSelect={trip.setCheckpoint}
            hour={explorer.hour}
            forecast={explorer.forecast}
          />
        </div>
        <RouteComparison
          routes={trip.result?.routes || []}
          selected={trip.selected}
          onSelect={trip.selectRoute}
        />
        <LoadRiskTest />
        <RiskRules />
        <Footer />
      </main>
    </div>
  );
}
