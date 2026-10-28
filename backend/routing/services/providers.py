import hashlib
import json

import httpx
from django.core.cache import cache


class ProviderError(Exception):
    def __init__(self, message, status=502):
        self.status = status
        super().__init__(message)


def fetch(url, params, ttl=900, timeout=30):
    key = hashlib.sha256((url + json.dumps(params, sort_keys=True)).encode()).hexdigest()
    value = cache.get(key)
    if value is not None:
        return value
    try:
        response = httpx.get(url, params=params, timeout=httpx.Timeout(timeout, connect=5))
        response.raise_for_status()
        value = response.json()
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        try:
            details = str(exc.response.json().get("message", "")).lower()
        except (ValueError, AttributeError):
            details = ""
        if status == 429:
            message = "Provider rate limit reached. Try again later."
        elif status in {401, 403}:
            message = "Provider credentials were rejected. Check the backend API key, account activation, and plan permissions."
        elif "profile" in details and ("account" in details or "supported" in details):
            message = "The configured routing profile is unavailable for this GraphHopper account. Set GRAPHHOPPER_PROFILE to an enabled profile; truck routing requires appropriate account access."
        elif "distance" in details and (
            "limit" in details or "maximum" in details or "too long" in details
        ):
            message = "This trip exceeds the routing provider's distance limit for the configured account. Try a shorter trip or a plan with longer-distance routing."
        elif (
            "connection" in details
            or "point" in details
            or "route" in details
            and "found" in details
        ):
            message = "No usable road route was found for these locations. Choose specific nearby road-accessible places."
        else:
            message = "External provider rejected the request. Verify the trip locations and provider account limits."
        raise ProviderError(
            message, 503 if status in {401, 403, 429} or "profile" in details else 502
        ) from None
    except (httpx.HTTPError, ValueError):
        raise ProviderError("External provider unavailable or timed out.", 503) from None
    cache.set(key, value, ttl)
    return value
