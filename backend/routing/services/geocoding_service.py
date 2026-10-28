from django.conf import settings

from .providers import ProviderError, fetch


def credentials():
    if not settings.GRAPHHOPPER_API_KEY:
        raise ProviderError(
            "Configure GRAPHHOPPER_API_KEY on the backend to enable routing and place search.", 503
        )
    return settings.GRAPHHOPPER_API_KEY


def search(query):
    data = fetch(
        "https://graphhopper.com/api/1/geocode",
        {"q": query, "limit": 5, "locale": "en", "key": credentials()},
        86400,
    )
    try:
        return [
            {
                "label": ", ".join(
                    dict.fromkeys(
                        str(h[k]) for k in ("name", "city", "state", "country") if h.get(k)
                    )
                ),
                "lat": h["point"]["lat"],
                "lon": h["point"]["lng"],
            }
            for h in data["hits"]
        ]
    except (KeyError, TypeError):
        raise ProviderError("Geocoder returned invalid data.") from None
