import math

LEVELS = ["Low", "Moderate", "High", "Severe", "No Travel"]


def valid(value):
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value >= 0
    )


def assess_load(wind, load):
    if not valid(load) or load <= 0:
        raise ValueError("Load must be finite, positive, and expressed in lb")
    if wind is not None and not valid(wind):
        raise ValueError("Wind must be finite, non-negative, and expressed in mph")
    base = None if wind is None else LEVELS[sum(wind >= t for t in (25, 35, 45, 55))]
    restriction = None
    code = "NO_LOAD_RESTRICTION"
    rule = "No load-specific rule triggered."
    explanation = "The load adds no restriction. General wind, rain, and snow risks still apply."
    if wind is None:
        code = "WIND_UNAVAILABLE"
        rule = "Wind measurement unavailable."
        explanation = (
            "Load-related wind risk cannot be assessed without wind data; it is not Low risk."
        )
    elif wind >= 55:
        restriction = "No Travel"
        code = "WIND_55_ANY_LOAD"
        rule = "Wind >= 55 mph: No Travel for every load."
        explanation = (
            f"Wind is {wind:g} mph, so travel is prohibited regardless of the {load:g} lb load."
        )
    elif 45 <= wind <= 54 and load > 30000:
        restriction = "No Travel"
        code = "WIND_45_54_OVER_30000"
        rule = "45 <= wind <= 54 mph and load > 30,000 lb: No Travel."
        explanation = f"Wind is {wind:g} mph and load is {load:g} lb, strictly above 30,000 lb."
    elif 35 <= wind <= 44 and load > 40000:
        restriction = "Severe"
        code = "WIND_35_44_OVER_40000"
        rule = "35 <= wind <= 44 mph and load > 40,000 lb: Severe."
        explanation = f"Wind is {wind:g} mph and load is {load:g} lb, strictly above 40,000 lb."
    risk = max([base, restriction], key=LEVELS.index) if restriction else base
    return {
        "wind_mph": wind,
        "load_weight_lb": load,
        "wind_unit": "mph",
        "load_unit": "lb",
        "general_wind_risk": base,
        "risk": risk,
        "restriction": restriction,
        "triggered": restriction is not None,
        "rule_code": code,
        "rule": rule,
        "explanation": explanation,
    }


def classify(wind, rain, snow, load):
    if not valid(load) or load <= 0:
        raise ValueError("Load must be positive")
    for value in (wind, rain, snow):
        if value is not None and not valid(value):
            raise ValueError("Weather measurements must be finite and non-negative")
    load_assessment = assess_load(wind, load)
    w = None if load_assessment["risk"] is None else LEVELS.index(load_assessment["risk"])
    r = (
        None
        if rain is None
        else (
            0 if rain < 0.1 else 1 if rain <= 0.25 else 2 if rain <= 0.5 else 3 if rain <= 1 else 4
        )
    )
    s = (
        None
        if snow is None
        else (0 if snow < 0.5 else 1 if snow <= 1 else 2 if snow <= 2 else 3 if snow <= 3 else 4)
    )
    hazards = {
        "wind": None if w is None else LEVELS[w],
        "rain": None if r is None else LEVELS[r],
        "snow": None if s is None else LEVELS[s],
    }
    available = [v for v in (w, r, s) if v is not None]

    risk = (
        "No Travel" if 4 in available else None if len(available) != 3 else LEVELS[max(available)]
    )
    return {
        "risk": risk,
        "hazards": hazards,
        "complete": len(available) == 3,
        "load_assessment": load_assessment,
    }
