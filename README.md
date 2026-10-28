# Wayweather — Weather-aware truck routing

A React and Django assessment application that compares genuine GraphHopper route alternatives, samples weather along road geometry, and ranks routes by weather exposure. The normal workflow always calls the backend and real providers. There is no fake results mode.

## Architecture

```text
weather-truck-routing/
  backend/
    config/                   Django settings and HTTP entry points
    routing/
      serializers.py          Validated input and typed route responses
      views.py                Thin DRF endpoints
      services/               Providers, checkpoints, risk, analysis, ranking
      test_suite/             Business and mocked provider integration tests
    pyproject.toml, uv.lock
    Dockerfile
  frontend/
    src/components/           Location search, map, route cards
    src/lib/                  API client and formatting
    src/types/                Shared frontend contracts
    package.json, pnpm-lock.yaml
    Dockerfile
  deploy/nginx.conf
  compose.yaml
```

Python 3.12+, Django/DRF, httpx, dotenv, in-process caching, Gunicorn and WhiteNoise; React, TypeScript, Vite, Tailwind CSS and React Leaflet. Native accessible form controls serve this focused dashboard without another component framework. SQLite is used only for Django's built-in admin/session tables; trip analysis has no database dependency. No Redis, Celery or PostgreSQL is needed.

## Local setup on macOS

Install Python 3.12+, uv, Node 22.12+ and pnpm 11. The frontend was validated on Node 22.14 and pnpm 11.18. Backend versions are locked by uv; frontend versions by pnpm.

```sh
brew install uv node pnpm
cd backend
uv sync --frozen
cp .env.example .env
```

Edit `backend/.env`: set `GRAPHHOPPER_API_KEY` to your GraphHopper Directions API key. The `truck` profile must be enabled for your account/plan. Keep this key on the backend. For evaluating geometry on an account without truck access, explicitly set `GRAPHHOPPER_PROFILE=car`; such routes do not enforce truck road restrictions. The UI's weather/load rules still apply, but this fallback must not be used as truck navigation. Truck dimensions, total vehicle weight, hazardous cargo restrictions, closures, traffic and driver rest periods are outside this assessment.

```sh
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput
uv run python manage.py runserver
```

In another terminal, from the project root:

```sh
cd frontend
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Open http://localhost:5173. Vite proxies `/api` to Django at http://127.0.0.1:8000. Search each endpoint, choose a specific suggestion, enter departure and load, select sampling distance, and analyze. Ambiguous locations remain user choices; no first-result guessing occurs. Without a routing key, place search and analysis return an actionable 503 error. You can still open the dashboard and check `/api/health/` or `/health/`.

## Environment

| Variable | Meaning |
|---|---|
| `DJANGO_DEBUG` | `true` locally; `false` in production |
| `DJANGO_SECRET_KEY` | Production requires a random secret of at least 50 characters |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated backend hostnames, without schemes |
| `CORS_ALLOWED_ORIGINS` | Explicit frontend origins; no wildcard production CORS |
| `CSRF_TRUSTED_ORIGINS` | Explicit trusted frontend origins |
| `GRAPHHOPPER_API_KEY` | Required routing and place-search credential |
| `GRAPHHOPPER_PROFILE` | `truck`, or a profile enabled on your account |
| `OPEN_METEO_API_KEY` | Optional; switches to the commercial customer endpoint |
| `SQLITE_PATH` | Optional SQLite file path; Compose uses `/app/data/db.sqlite3` on a volume |
| `TRUST_PROXY` | Set true only behind a proxy that strips/replaces inbound forwarded headers |
| `VITE_API_BASE_URL` | Empty for same-origin `/api`; otherwise the HTTPS backend origin, without `/api` |

Frontend environment values are public and compiled into the build. Never place provider secrets there. Env files, local SQLite databases, virtual environments, dependency folders and build output are ignored. The application exposes public analysis endpoints; DRF throttles anonymous clients to 30 requests/minute per IP. Health is exempt. Configure a trusted edge rate limiter and access control for a public deployment. Cache and throttles are local to each worker, not distributed guarantees.

## API

Every timestamp is normalized to UTC. Input departure and independent forecast timestamps must include an explicit offset or `Z`. The browser date picker is in the timezone named next to the field, then converts to UTC for transport. Results, ETAs and forecast-valid times are labeled UTC. Forecast timestamps are validity times, not model issue times.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health/` or `/health/` | Process liveness; returns `status`, `service`, `message` |
| GET | `/api/geocode/?q=Philadelphia` | Up to five GraphHopper place candidates: `label`, `lat`, `lon` |
| POST | `/api/routes/analyze/` | Route geometries, checkpoint forecasts, 49-hour corridor timelines, exposure and ranking |
| GET | `/api/weather/forecast/?lat=40&lon=-75&time=2026-10-28T12:00:00Z&load_weight_lb=30000` | Independent point forecast with normalized weather and hazards |

Example analysis request (replace departure with a future time within 15 days):

```sh
curl -X POST http://127.0.0.1:8000/api/routes/analyze/ \
  -H 'Content-Type: application/json' \
  -d '{"origin":{"label":"Philadelphia","lat":39.9526,"lon":-75.1652},"destination":{"label":"New York","lat":40.7128,"lon":-74.0060},"departure_time":"2026-10-28T12:00:00Z","load_weight_lb":30000,"interval_miles":25}'
```

Response contract:

```text
{
  routes: [{
    id, summary, geometry: [[longitude, latitude], ...],
    distance_miles, duration_seconds, arrival_time,
    status: "viable" | "unsafe" | "insufficient-data",
    rank, recommended, average_risk: number | null,
    risk_miles: {Low, Moderate, High, Severe, "No Travel", Unavailable},
    checkpoints: [{
      lat, lon, distance_miles, arrival_time, forecast_time,
      wind_mph, rain_in_hr, snow_in_hr,
      hazards: {wind, rain, snow}, risk, complete, availability,
      timeline: [49 forecast records for departure + 0..48 hours]
    }]
  }],
  recommended_route_id: string | null,
  warnings: [string, ...], forecast_base_time, timezone: "UTC"
}
```

A health response is `{"status":"ok","service":"weather-truck-routing-api","message":"Backend is running successfully"}`. A missing-key response is `{"error":{"code":"provider_error","message":"Configure GRAPHHOPPER_API_KEY on the backend to enable routing and place search."}}` with status 503. Validation failures use 400 with `error.details`; provider failures use 502, rate limits/timeouts 503, excessive sampling 422 and application throttles 429. Availability distinguishes `available`, `incomplete`, `outside_forecast_horizon` and `provider_unavailable`. Weather failures are partial analysis responses with null measurements and no eligible recommendation where coverage is incomplete. Unsupported routing profiles or unsnappable destinations produce a provider error. Requests never accept arbitrary fetch URLs. `/docs` is not a Swagger endpoint; this README is the API reference.

## Checkpoints and forecast alignment

Checkpoint positions follow cumulative haversine distance over the actual route polyline, scaled to the routing provider's reported distance. Checkpoints start at mile zero, occur at the requested 10/25/50-mile interval and include the exact final partial segment. ETA uses route driving duration interpolated by cumulative distance. This is a documented constant-average-speed approximation, not a traffic-aware segment time profile. Route arrival uses the selected departure plus provider duration.

Open-Meteo requests are batched in groups of 40 locations, deduplicated to four decimal places (roughly 11 m), and cached for 15 minutes. Place searches cache for a day. At most 600 checkpoint entries per analysis are supported. Both ETA forecasts and the complete slider timeline reuse these hourly data; moving the slider does not consume another API request.

Forecast hour selection uses the hour ending at or after the requested time. Rain and snow are hourly accumulation proxies for rates during that preceding hour; wind is the instantaneous forecast at that hour. Rain adds large-scale rain and convective showers, with millimeters converted to inches by dividing by 25.4. Snowfall depth is centimeters converted to inches by dividing by 2.54. Snow is not liquid-water-equivalent precipitation. Raw measurements, individual hazard levels and forecast-valid timestamps remain visible in the response. No current weather is substituted for unavailable hours. Up to 16 calendar days are requested; actual variable/model coverage can be shorter. A departure near the limit can have later checkpoints or slider hours outside coverage.

The corridor heatmap displays real forecast-risk circles at sampled points on the selected route. It is deliberately a sampled corridor visualization rather than interpolated spatial radar. Gray means missing measurements. Arrival mode instead shows each checkpoint at its own ETA. Changing slider time updates the map, popups and checkpoint table, preserves route geometry and selection, and does not change the ETA-based recommendation. Only the selected route's checkpoint markers are drawn; the bounded sample count avoids drawing markers from every overlapping route. All available route geometries remain visible, with solid viable, dashed unsafe and dotted incomplete routes.

## Risk rules

Risk ordering and numeric average scale: Low=0, Moderate=1, High=2, Severe=3, No Travel=4. Missing measurements are unknown, never Low. Any known No Travel hazard remains a prohibition even when another hazard is missing; otherwise an incomplete checkpoint has null overall risk. The most severe available complete hazard controls each checkpoint.

| Hazard | Low | Moderate | High | Severe | No Travel |
|---|---|---|---|---|---|
| Wind mph | <25 | 25 to <35 | 35 to <45 | 45 to <55 | ≥55 |
| Rain in/hr | <0.10 | 0.10–0.25 | >0.25–0.50 | >0.50–1.00 | >1.00 |
| Snow in/hr | <0.5 | 0.5–1.0 | >1.0–2.0 | >2.0–3.0 | >3.0 |

Wind bands are lower-inclusive, upper-exclusive, resolving fractional speeds such as 34.9 and 54.9 without gaps. Rain and snow use inclusive upper endpoints for the middle bands exactly as the assessment states. At wind ≥55 every load is No Travel. At wind 45 to <55 and load >30,000 lb, wind becomes No Travel. At wind 35 to <45 and load >40,000 lb, wind becomes Severe. Exactly 30,000 or 40,000 does not trigger the corresponding strict-greater override.

## Exposure and recommendation

Each pair of adjacent checkpoints owns its actual mileage difference, including the final partial segment. Assign the entire segment the worse of its two endpoint risks. Either endpoint being unknown makes it Unavailable, except a known No Travel endpoint takes precedence. This conservative approximation can overestimate risk between samples and can miss weather between checkpoints; it is not continuous observation. Risk miles sum to the provider route distance. Average risk is mileage-weighted using the 0–4 scale and is null for any incomplete route.

Routes containing any No Travel segment are unsafe. Routes with incomplete measurements are ineligible. Only complete routes without prohibitions can be recommended. Among eligible routes, compare the tuple `(Severe miles, High miles, average risk, duration seconds)` lexicographically. No weighted tradeoff can override an earlier criterion. Stable route ID is the final deterministic tie-breaker. Viable routes display first, incomplete routes next, unsafe routes last. If every route is unsafe or incomplete there is no recommendation.

## Providers, attribution and limits

- [GraphHopper hosted API reference](https://docs.graphhopper.com/openapi): real routing and geocoding; `algorithm=alternative_route`, `alternative_route.max_paths=3`, and unencoded longitude/latitude geometry. Maximum paths is a request, not a guarantee. The backend removes identical geometries. If only one or two genuine alternatives exist, it returns those and a prominent warning. It never duplicates a route or invents via points to imply genuine alternatives. This provider limitation is the documented fallback for the three-route requirement.
- [GraphHopper pricing](https://www.graphhopper.com/pricing/) and [credits](https://www.graphhopper.com/faq/what-is-one-credit/): quotas, routing profiles, geographic limits and geocoding availability depend on your account. Check your dashboard before evaluation and production; rate limits are not assumed universal. Standard two-point routing consumes credits; search/autocomplete consumes additional credits. Provider 429 responses are surfaced without automatic retry storms. GraphHopper attribution is shown in the footer.
- [Open-Meteo documentation](https://open-meteo.com/en/docs) and [pricing/terms](https://open-meteo.com/en/pricing): free evaluation endpoint is noncommercial, up to 600 calls/minute, 5,000/hour, 10,000/day and 300,000/month at the time of verification. Multi-location/long-horizon requests may count as multiple billable calls; batching is not a quota bypass. Commercial deployments require an appropriate subscription. Weather attribution is CC BY 4.0; the app modifies units and derives risk categories.
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/): visible interactive tiles only; no prefetch/offline scraping. Attribution is retained. Replace the public tile layer with a suitable commercial or self-hosted tile provider for large-scale production use.
- Public Nominatim is intentionally unused: its policy prohibits autocomplete. Openrouteservice was evaluated but its public alternative-routing endpoint limits alternatives to 100 km; GraphHopper better fits longer trips.

## Validation

```sh
cd backend
uv run python manage.py check
uv run python manage.py test
uv run ruff check .
uv run ruff format --check .
cd ../frontend
pnpm typecheck
pnpm lint
pnpm build
```

Tests use mocked routing/weather APIs, so unit tests never require a credential or paid request. They cover exact and adjacent weather thresholds, load boundaries, missing/invalid values, priority order, all-unsafe routes, deterministic ties, partial mileage, geometry interpolation, weather units, independent forecast validation, provider timeout/failure and successful serialized multi-route analysis.

## Deployment

Two Dockerfiles, a Compose example and Nginx configuration are included. From the root, create a root `.env` with production backend variables described above. Set a random secret, `DJANGO_DEBUG=false`, the actual domain in allowed hosts, explicit HTTPS frontend origins, a routing credential and `TRUST_PROXY=true` only when using a trusted TLS reverse proxy. The root `.env` is read by Compose; `backend/.env` remains the local direct-run configuration. Do not commit either.

```sh
docker compose build
docker compose up -d
```

The frontend is exposed at port 8080; place an HTTPS ingress in front of it. Nginx serves the SPA and proxies `/api/` and `/health/` to Gunicorn. The ingress must strip incoming `X-Forwarded-Proto` and set it accurately; the included Nginx forwards that header. The backend is not exposed on a host port. Production settings redirect plain HTTP to HTTPS. Local container liveness checks explicitly send the secure-proxy header because they bypass TLS inside the trusted container network. The frontend image checks `/healthz`; backend checks `/api/health/`. Both health checks are liveness only and intentionally do not spend provider credits or assert external API readiness.

For separate hosting: deploy `backend/` to a Python container service with `uv sync --frozen --no-dev`, `uv run python manage.py migrate`, `uv run python manage.py collectstatic --noinput`, then `uv run gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 300`. Configure the platform's health path `/api/health/` and trusted HTTPS proxy. A 300-second timeout allows bounded weather batches; upstream ingress timeouts must match. Store SQLite on persistent storage if using admin users. Analysis does not persist trips and does not require migrations to query routes. Production assets are served by WhiteNoise.

Deploy `frontend/dist` to a static host after `pnpm install --frozen-lockfile && pnpm build`. Set `VITE_API_BASE_URL=https://your-backend.example` before building and configure the backend's CORS origin to the exact frontend domain. The default empty value supports the included same-origin Nginx deployment. Configure SPA fallback to `index.html`; `frontend/nginx.conf` shows this. No localhost URL is compiled into production API calls. Vite's localhost target exists only in its development proxy.

Run `uv run python manage.py check --deploy` with actual production variables before release. Verify HTTPS `/api/health/`, frontend health, a place search, one paid route analysis and the route-map/forecast interaction with your enabled provider profile. Live car-profile routing and keyless Open-Meteo forecasts were verified for Bengaluru to Ranchi: three distinct routes and 143 checkpoints with complete arrival forecasts. No cloud deployment was made. True truck routing requires a key with truck-profile access; the current key was explicitly rejected for truck by GraphHopper.

## Walkthrough

1. Search and select two unambiguous locations. Set a future local departure, load in pounds, and 10/25/50-mile samples.
2. Analyze; inspect the returned option count and any provider or weather-coverage warnings.
3. Select a route card or map line to fit the map and view its checkpoints. Review Severe, High, No Travel and unknown mileage in the comparison table.
4. Open a checkpoint popup for raw measurements, hazard classes and forecast validity versus truck ETA.
5. Switch to corridor heatmap or drag the forecast slider. Compare the common forecast hour against ETA mode. Gray locations mean missing data.
6. If no complete, unrestricted option exists, the app shows no recommended route. Do not interpret absence of a restriction in a different layer or slider hour as a safe ETA-based journey.

## Known limitations

Provider availability and plan-specific truck access are external dependencies. Three genuine alternatives are not guaranteed. ETA uses constant average speed and omits traffic/rest stops. Forecasts are hourly model estimates, have finite horizons and may omit variables. Corridor circles do not interpolate a continuous heat field. Geometry and endpoint maximums approximate weather mileage. Load means the assessment's supplied load, not gross vehicle weight. This is a weather assessment dashboard, not certified turn-by-turn navigation. The application code and configuration contain no comments; explanatory material is kept here.

## Verified implementation checks

The completed implementation passed Django system checks, the production deployment security check with production environment values, 25 backend tests, Ruff lint/format checks, frontend TypeScript checking, ESLint and a Vite production build. Browser checks covered desktop/mobile layouts, the real missing-key error, and a successful three-route flow against an isolated backend with mocked external providers: map routes, selection, slider updates and arrival-mode restoration, with no browser errors or horizontal overflow. A live Open-Meteo response verified measurement units. Compose configuration syntax was validated; container images were not built because the Docker daemon was not running. Paid live routing and cloud deployment remain operator steps.

## Modular dashboard and current routing access

The dashboard follows the supplied map-first layout. `src/App.tsx` composes separate planner, map, route options, forecast timeline/chart, checkpoint, comparison, notices, rules and footer components. Trip request/validation state lives in `hooks/useTripAnalysis.ts`; forecast playback and time selection live in `hooks/useForecastExplorer.ts`. Leaflet viewport controls, checkpoint markers and map layers are separate modules. Tailwind v4 is integrated through `@tailwindcss/vite`; shared design tokens and component classes live in `src/styles.css`. The navbar is intentionally not rendered at the user's request; `components/layout/Header.tsx` is retained.

Responsive layout was browser-checked at widths 320, 360, 390, 600, 640, 768, 850, 900, 1024, 1136, 1250, 1280, 1440 and 1920 pixels. Trip fields use explicit responsive grid areas so the weather sampling selector cannot enter the narrow swap-button column. No field overlaps or horizontal page overflow were found. The forecast plot observes its container width so axes stay aligned on phones. The UI supports origin/destination swapping, keyboard location selection, route selection, forecast playback, hazard-specific corridor layers and expandable checkpoint measurements.

`OPEN_METEO_API_KEY=` is valid and intentional: the public forecast endpoint needs no key. Its optional key is for the commercial customer endpoint only. Wind is explicitly requested in mph, and rain/snow unit conversion is tested.

GraphHopper's documentation lists every profile supported by the service, including truck. Availability is account-specific. The current key returned HTTP 400 with: `For your account the profile parameter can only be one of [car, bike, foot] but was truck`. GraphHopper's pricing page says the free tier has limited vehicle profiles; its support forum confirms that paid packages starting with Basic include all profiles. If your account is already paid, verify the API key belongs to that account or contact provider support. An application setting cannot grant missing provider permissions.

Use `GRAPHHOPPER_PROFILE=truck` only with an authorized key. For evaluation with the existing key, `GRAPHHOPPER_PROFILE=car` was tested successfully; the response exposes `routing_profile` and `truck_restrictions_enforced=false`, and the UI displays a persistent weather-only assessment warning. All wind/rain/snow and load rules continue to apply, but car routes must not be presented as truck-compatible roads. If the profile is changed in `.env`, restart Django to reload it. The user's current explicit profile selection is preserved; the application does not silently downgrade rejected truck requests.

Provider references: [standard routing profiles](https://docs.graphhopper.com/openapi/map-data-and-routing-profiles/openstreetmap/standard-routing-profiles), [pricing restrictions](https://www.graphhopper.com/pricing/), [provider support clarification](https://discuss.graphhopper.com/t/message-for-your-account-the-profile-parameter-can-only-be-one-of-car-bike-foot-but-was-small-truck/9468).
