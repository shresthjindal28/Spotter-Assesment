# Wayweather — Weather-Aware Route Assessment

React/TypeScript/Vite/Tailwind dashboard with a stateless Django REST API. GraphHopper generates genuine road-route alternatives; Open-Meteo supplies checkpoint forecasts; the backend applies weather/load rules and ranks routes. No database, migrations, login, Redis, or worker service is required.

## Run locally

Prerequisites: Python 3.12+, uv, Node 22.12+, pnpm 11.

```sh
cd backend
uv sync --frozen
cp .env.example .env
uv run python manage.py runserver
```

Copy the example only for first-time setup. Preserve an existing `.env`. Set your real routing key there; never put it in frontend variables or commit it.

In another terminal:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5173. Vite proxies `/api` to Django at http://127.0.0.1:8000.

## Configuration

For the current GraphHopper account's supported car profile:

```dotenv
GRAPHHOPPER_API_KEY=your-own-key
GRAPHHOPPER_PROFILE=car
OPEN_METEO_API_KEY=
```

`car` provides geometry for a weather assessment, **not verified truck-safe roads**. The warning stays visible, and eligibility is explicitly weather eligibility. `truck` or `small_truck` requires provider-account access. The backend returns an actionable error instead of silently downgrading. Three distinct alternatives are requested; fewer are returned with a warning when the provider cannot supply three.

Open-Meteo's public evaluation API needs no key. Its optional key selects the commercial endpoint. Set `VITE_API_BASE_URL` only when hosting the frontend separately; it is a public backend origin, never a secret. Restart Django after changing `.env`.

Other backend settings are in `.env.example`: debug mode, secret key, allowed hosts, explicit CORS/CSRF origins and trusted proxy handling. Legacy `SQLITE_PATH` values are ignored. Your actual `.env` is not changed by the implementation.

## Load Risk Test demonstration

The dashboard's **Load Risk Test** panel uses simulated manual inputs and the same backend function used at live checkpoints. It works without routing/weather credentials or external API calls. Enter wind in mph and load in lb, or select any of the nine predefined assessment cases. Results show general wind risk, the load-specific restriction, rule identifier and explanation. Test values never change trip weather or route recommendations.

Exact load rules:

- Wind ≥55 mph: No Travel for every load.
- Wind 45–54 mph inclusive and load >30,000 lb: No Travel.
- Wind 35–44 mph inclusive and load >40,000 lb: Severe.
- Otherwise no additional load restriction; general weather hazards still apply.

Exactly 30,000 and 40,000 lb do not satisfy their respective strict inequalities. Fractional speeds above 44 or 54 fall outside those specific inclusive override ranges; general wind risk still applies. For example, 35 mph / 40,000 lb has no additional load restriction but remains High general wind risk.

General wind bands are <25 / <35 / <45 / <55 / ≥55 mph. Rain bands are <0.10 / ≤0.25 / ≤0.50 / ≤1.00 / >1.00 in/hr. Snow bands are <0.5 / ≤1 / ≤2 / ≤3 / >3 in/hr. The most severe hazard wins, with Low=0 through No Travel=4. Missing measurements remain unknown.

## Live assessment and recommendation

Checkpoints follow cumulative road-polyline distance at 10/25/50-mile intervals, including both endpoints. ETA interpolates provider driving duration by distance; it excludes traffic updates and rest stops. Forecasts use the hour ending at or after each ETA. Rain plus showers converts mm to inches; snowfall converts cm to inches. Requests batch and deduplicate locations and cache for up to 15 minutes.

A segment's miles take the worse endpoint risk. Unknown endpoints make the segment unavailable, except a known No Travel restriction takes precedence. This is a sampling approximation. Routes with No Travel or incomplete weather cannot be recommended. Eligible alternatives are ordered lexicographically by **Severe miles → High miles → mileage-weighted average risk → driving duration**, with a stable ID tie-breaker.

The 0–48-hour slider shows a common forecast time across sampled points; arrival mode uses each checkpoint's ETA. The chart uses real forecasts at the selected checkpoint, with gaps for missing data. It is sampled corridor weather, not radar. Slider changes never alter ETA-based recommendations. Arrival dates are shown in UTC. Changed inputs and old analyses produce reanalysis notices.

## API and architecture

| Endpoint | Purpose |
|---|---|
| `GET /api/health/` or `/health/` | Liveness |
| `GET /api/geocode/?q=...` | Explicit location candidates |
| `POST /api/routes/analyze/` | Genuine alternatives, checkpoint weather, rule explanations and ranking |
| `GET /api/weather/forecast/` | Independent point/time forecast |
| `GET /api/risk/load-test/` | Nine simulated test scenarios |
| `POST /api/risk/load-test/` | Assess `{ "wind_mph":45, "load_weight_lb":30001, "wind_unit":"mph", "load_unit":"lb" }` |

Analysis input contains `origin`/`destination` objects with `label`, `lat`, `lon`; timezone-aware `departure_time`; `load_weight_lb`; and `interval_miles`. Responses include the analyzed trip, assessment time, routing-profile limitation, route geometry/distance/duration/arrival, risk miles, checkpoint load-rule details, recommendation and warnings. Missing forecasts are null, not zero. Invalid input is 400; provider failures are 502/503; throttling is 429.

Backend services are under `backend/routing/services/`; DRF serializers and thin views handle HTTP. Reusable frontend components are under `frontend/src/components/`, state hooks under `src/hooks/`, and API/types/helpers under `src/lib/` and `src/types/`.

## Tests

```sh
cd backend
uv run python manage.py check
uv run python manage.py test
uv run ruff check .
uv run ruff format --check .
cd ../frontend
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
```

The backend suite includes all load boundaries, missing data, provider/profile failures, distinct alternatives, serialized route restrictions and ranking. The frontend suite covers request/result consistency, stale results and UTC arrival dates. Unit tests use no paid API calls and no database. Browser checks also cover all nine simulated cases, input isolation, error handling, unsafe-route exclusion, map/slider continuity and mobile widths.

## Live dashboard audit

The screenshot trip was reproduced with actual provider responses on 28 Oct 2026 at 06:01 UTC: Bengaluru → Jharkhand, departure 12:00 Asia/Calcutta, 40,000 lb, 50-mile sampling.

| Rank | Provider route | Miles | Duration | Arrival, 29 Oct UTC | Severe / High miles | Average risk |
|---|---|---:|---|---|---|---:|
| A | route-1 | 1109.502 | 35h 56m | 18:25:34 | 0 / 0 | 0.000000 |
| B | route-3 | 1169.747 | 37h 7m | 19:36:58 | 0 / 0 | 0.085489 |
| C | route-2 | 1121.682 | 35h 58m | 18:27:56 | 0 / 150 | 0.401183 |

All geometries, distances, durations and ETAs were distinct. Jharkhand's selected geocoding point was 23.4559809, 85.2557301; the road endpoint was approximately 136 m away after normal provider snapping. All 73 checkpoints and all 49 slider hours per checkpoint were independently matched to captured raw forecasts: 3,650 weather records. Mileage totals, average risks and recommendation order were independently recalculated. Route A's zero average was genuine Low risk: wind 4.8–17.5 mph and rain below 0.10 in/hr. These are audit-time results, not a promise that later forecasts remain identical. Original browser-network history was unavailable; this was an exact-input reproduction.

## Deployment and provider limits

For production, set `DJANGO_DEBUG=false`, a random secret of at least 50 characters, actual allowed hosts and explicit HTTPS frontend origins. Trust forwarded protocol headers only behind a proxy that replaces client headers. Run the included backend Dockerfile or `uv run gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 4 --timeout 300`. Health path: `/api/health/`. Build the frontend with its production backend origin and host `dist/` statically. No migration or collectstatic step is needed. Docker runtime deployment is not verified while the daemon is stopped.

GraphHopper profiles, distance/credit quotas and alternative availability depend on the account. Free Open-Meteo access is for noncommercial evaluation; commercial use requires an appropriate subscription. Forecast horizon/variables can be unavailable, and an analysis is capped at 600 checkpoint entries. The application is a weather assessment, not certified truck navigation.

Attribution and terms: [GraphHopper](https://docs.graphhopper.com/openapi), [Open-Meteo / CC BY 4.0](https://open-meteo.com/en/docs), [OpenStreetMap tiles](https://operations.osmfoundation.org/policies/tiles/).
