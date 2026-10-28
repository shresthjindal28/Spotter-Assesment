from bisect import bisect_left
from datetime import timedelta
from math import asin, cos, radians, sin, sqrt


def distance(a, b):
    lon1, lat1, lon2, lat2 = map(radians, [a[0], a[1], b[0], b[1]])
    return (
        3958.7613
        * 2
        * asin(
            min(
                1,
                sqrt(
                    sin((lat2 - lat1) / 2) ** 2
                    + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
                ),
            )
        )
    )


def checkpoints(route, interval, departure):
    geometry = route["geometry"]
    cumulative = [0.0]
    for a, b in zip(geometry, geometry[1:], strict=False):
        cumulative.append(cumulative[-1] + distance(a, b))
    if cumulative[-1] <= 0:
        raise ValueError("Route geometry has zero length")
    total = route["distance_miles"]
    targets = [float(i) for i in range(0, int(total) + 1, interval)]
    if total - targets[-1] > 1e-8:
        targets.append(total)
    result = []
    for miles in targets:
        position = miles / total * cumulative[-1]
        j = max(1, min(len(geometry) - 1, bisect_left(cumulative, position)))
        fraction = (
            (position - cumulative[j - 1]) / (cumulative[j] - cumulative[j - 1])
            if cumulative[j] > cumulative[j - 1]
            else 0
        )
        a, b = geometry[j - 1], geometry[j]
        result.append(
            {
                "distance_miles": miles,
                "lon": a[0] + (b[0] - a[0]) * fraction,
                "lat": a[1] + (b[1] - a[1]) * fraction,
                "arrival_time": (
                    departure + timedelta(seconds=route["duration_seconds"] * miles / total)
                ).isoformat(),
            }
        )
    return result
