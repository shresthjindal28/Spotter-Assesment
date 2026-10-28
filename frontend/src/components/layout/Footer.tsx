export default function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 px-1 py-4 text-[9px] text-muted">
      <span>Weather intelligence for every mile. All result times in UTC.</span>
      <span>
        Routing ©{" "}
        <a href="https://www.graphhopper.com/" target="_blank" rel="noreferrer">
          GraphHopper
        </a>{" "}
        · Weather{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo · CC BY 4.0
        </a>{" "}
        · © OpenStreetMap contributors
      </span>
    </footer>
  );
}
