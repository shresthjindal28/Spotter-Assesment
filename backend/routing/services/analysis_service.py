from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .checkpoint_service import checkpoints
from .providers import ProviderError
from .recommendation_service import rank, summarize
from .routing_service import routes
from .weather_service import at_time, forecasts


def analyze(data):
    options = routes(data["origin"], data["destination"])
    for route in options:
        route["checkpoints"] = checkpoints(route, data["interval_miles"], data["departure_time"])
        route["arrival_time"] = (
            data["departure_time"] + timedelta(seconds=route["duration_seconds"])
        ).isoformat()
    points = [p for r in options for p in r["checkpoints"]]
    if len(points) > 600:
        raise ProviderError(
            "Trip requires too many weather samples. Choose a larger interval or shorter trip.", 422
        )
    weather = forecasts(points)
    for route in options:
        for p in route["checkpoints"]:
            rows = weather.get((round(p["lat"], 4), round(p["lon"], 4)), {})
            p.update(at_time(rows, p["arrival_time"], data["load_weight_lb"]))
            p["timeline"] = [
                at_time(rows, data["departure_time"] + timedelta(hours=h), data["load_weight_lb"])
                for h in range(49)
            ]
        summarize(route)
    ordered, recommended = rank(options)
    warnings = []
    truck_restrictions = settings.GRAPHHOPPER_PROFILE in {"truck", "small_truck"}
    if not truck_restrictions:
        warnings.append(
            f"Weather-only assessment using the {settings.GRAPHHOPPER_PROFILE} routing profile. Truck-specific road restrictions are not enforced; verify truck access independently."
        )
    if len(options) < 3:
        warnings.append(
            f"Provider returned {len(options)} distinct route(s). No synthetic or duplicate alternatives were added."
        )
    if any(
        r["status"] == "insufficient-data" or any(not p["complete"] for p in r["checkpoints"])
        for r in options
    ):
        warnings.append("Weather coverage is incomplete. Unknown measurements are not Low risk.")
    if all(r["status"] == "unsafe" for r in options):
        warnings.append(
            "Every route contains a No Travel segment. No route is currently safe under the configured rules."
        )
    elif recommended is None:
        warnings.append(
            "No route is currently eligible for recommendation under the configured rules."
        )
    return {
        "analyzed_at": timezone.now().isoformat(),
        "trip": {
            "origin": dict(data["origin"]),
            "destination": dict(data["destination"]),
            "departure_time": data["departure_time"].isoformat(),
            "load_weight_lb": data["load_weight_lb"],
            "interval_miles": data["interval_miles"],
        },
        "routes": ordered,
        "recommended_route_id": recommended,
        "warnings": warnings,
        "forecast_base_time": data["departure_time"].isoformat(),
        "timezone": "UTC",
        "routing_profile": settings.GRAPHHOPPER_PROFILE,
        "truck_restrictions_enforced": truck_restrictions,
    }
