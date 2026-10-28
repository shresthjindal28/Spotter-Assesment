import { Mountain, Radio } from "lucide-react";
import { useBackendHealth } from "../../hooks/useBackendHealth";
export default function Header() {
  const status = useBackendHealth();
  return (
    <header className="dashboard-header">
      <a
        className="flex shrink-0 items-center gap-2.5"
        href="#planner"
        aria-label="Wayweather home"
      >
        <span className="brand-icon">
          <Mountain size={25} />
        </span>
        <span className="text-[23px] font-bold tracking-[-1px]">
          wayweather<span className="text-[#a9c6a1]">.</span>
        </span>
      </a>
      <span className="hidden border-l border-white/15 pl-5 text-[9px] tracking-[1.5px] text-[#b4c8c2] min-[1300px]:block">
        DISPATCH INTELLIGENCE
      </span>
      <nav className="header-navigation" aria-label="Main navigation">
        <a className="nav-active" href="#planner">
          Route Planner
        </a>
        <a href="#live-map">Live Map</a>
        <a href="#weather">Weather</a>
        <a href="#comparison">Insights</a>
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <span className="hidden items-center gap-2 text-[10px] text-[#d3e0d7] min-[1000px]:flex">
          <Radio
            size={13}
            className={
              status === "offline" ? "text-amber-300" : "text-[#83c697]"
            }
          />
          {status === "connected"
            ? "Backend connected"
            : status === "offline"
              ? "Backend unavailable"
              : "Connecting…"}
        </span>
        <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/10 text-[10px] font-semibold text-[#c4d7d0]">
          WW
        </span>
      </div>
    </header>
  );
}
