import math

from django.conf import settings

from .geocoding_service import credentials
from .providers import ProviderError, fetch


def routes(origin, destination):
    data = fetch(
        "https://graphhopper.com/api/1/route",
        {
            "point": [
                f"{origin['lat']},{origin['lon']}",
                f"{destination['lat']},{destination['lon']}",
            ],
            "profile": settings.GRAPHHOPPER_PROFILE,
            "algorithm": "alternative_route",
            "alternative_route.max_paths": 3,
            "points_encoded": "false",
            "key": credentials(),
        },
    )
    result, seen = [], set()
    try:
        for path in data["paths"]:
            geometry = path["points"]["coordinates"]
            signature = tuple(tuple(p[:2]) for p in geometry)
            if signature in seen:
                continue
            seen.add(signature)
            distance, duration = float(path["distance"]) / 1609.344, float(path["time"]) / 1000
            if len(geometry) < 2 or not all(
                math.isfinite(v) and v > 0 for v in (distance, duration)
            ):
                raise ValueError()
            if not all(len(p) >= 2 and -180 <= p[0] <= 180 and -90 <= p[1] <= 90 for p in geometry):
                raise ValueError()
            result.append(
                {
                    "id": f"route-{len(result) + 1}",
                    "summary": ", ".join(path.get("description", []))
                    or f"Alternative {len(result) + 1}",
                    "geometry": geometry,
                    "distance_miles": distance,
                    "duration_seconds": duration,
                }
            )
        if not result:
            raise ValueError()
        return result[:3]
    except (KeyError, TypeError, ValueError):
        raise ProviderError(
            "Routing provider returned no usable route. Check locations and configured profile."
        ) from None
