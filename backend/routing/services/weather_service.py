from datetime import UTC, datetime
from math import ceil

from django.conf import settings

from .providers import ProviderError, fetch
from .risk_service import classify, valid


def forecasts(points):
    unique = list(dict.fromkeys((round(p["lat"], 4), round(p["lon"], 4)) for p in points))
    result = {}
    for start in range(0, len(unique), 40):
        batch = unique[start : start + 40]
        params = {
            "latitude": ",".join(str(p[0]) for p in batch),
            "longitude": ",".join(str(p[1]) for p in batch),
            "hourly": "wind_speed_10m,rain,showers,snowfall",
            "wind_speed_unit": "mph",
            "precipitation_unit": "mm",
            "timezone": "UTC",
            "forecast_days": 16,
            "timeformat": "unixtime",
        }
        if settings.OPEN_METEO_API_KEY:
            params["apikey"] = settings.OPEN_METEO_API_KEY
        url = (
            "https://customer-api.open-meteo.com/v1/forecast"
            if settings.OPEN_METEO_API_KEY
            else "https://api.open-meteo.com/v1/forecast"
        )
        try:
            data = fetch(url, params, timeout=12)
            data = data if isinstance(data, list) else [data]
            if len(data) != len(batch):
                raise ValueError()
            for coord, item in zip(batch, data, strict=True):
                hourly = item["hourly"]
                if not isinstance(hourly, dict):
                    raise ValueError()
                rows = {}
                for i, timestamp in enumerate(hourly["time"]):

                    def value(name, hourly=hourly, i=i):
                        values = hourly.get(name, [])
                        raw = values[i] if i < len(values) else None
                        return raw if valid(raw) else None

                    rain, showers = value("rain"), value("showers")

                    snow = value("snowfall")
                    rows[int(timestamp)] = {
                        "wind_mph": value("wind_speed_10m"),
                        "rain_in_hr": (rain + showers) / 25.4
                        if rain is not None and showers is not None
                        else None,
                        "snow_in_hr": snow / 2.54 if snow is not None else None,
                    }
                result[coord] = rows
        except (ProviderError, KeyError, TypeError, ValueError):
            for coord in batch:
                result[coord] = {}
    return result


def at_time(rows, timestamp, load):
    moment = datetime.fromisoformat(timestamp) if isinstance(timestamp, str) else timestamp

    hour = ceil(moment.timestamp() / 3600) * 3600
    weather = rows.get(hour, {"wind_mph": None, "rain_in_hr": None, "snow_in_hr": None})
    try:
        risk = classify(weather["wind_mph"], weather["rain_in_hr"], weather["snow_in_hr"], load)
    except ValueError:
        weather = {"wind_mph": None, "rain_in_hr": None, "snow_in_hr": None}
        risk = classify(None, None, None, load)
    return {
        **weather,
        **risk,
        "availability": "available"
        if risk["complete"]
        else "incomplete"
        if hour in rows
        else "outside_forecast_horizon"
        if rows
        else "provider_unavailable",
        "forecast_time": datetime.fromtimestamp(hour, UTC).isoformat() if hour in rows else None,
    }
