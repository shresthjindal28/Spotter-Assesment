from .risk_service import LEVELS, valid


def summarize(route):
    miles = {level: 0.0 for level in LEVELS + ["Unavailable"]}
    for a, b in zip(route["checkpoints"], route["checkpoints"][1:], strict=False):
        risks = [a["risk"], b["risk"]]
        category = (
            "No Travel"
            if "No Travel" in risks
            else "Unavailable"
            if None in risks
            else max(risks, key=LEVELS.index)
        )
        miles[category] += b["distance_miles"] - a["distance_miles"]
    no_travel_count = sum(p["risk"] == "No Travel" for p in route["checkpoints"])
    load_restriction_count = sum(
        bool(p.get("load_assessment", {}).get("triggered")) for p in route["checkpoints"]
    )
    incomplete = any(not p["complete"] for p in route["checkpoints"])
    status = (
        "unsafe"
        if no_travel_count or miles["No Travel"] > 0
        else "insufficient-data"
        if incomplete
        else "viable"
    )
    average = (
        None
        if incomplete
        else sum(miles[level] * i for i, level in enumerate(LEVELS)) / route["distance_miles"]
    )
    if status == "unsafe":
        restriction_summary = f"No Travel at {no_travel_count} checkpoint(s); {miles['No Travel']:.1f} affected miles. This route cannot be recommended under the weather/load rules."
    elif incomplete:
        restriction_summary = "Incomplete weather coverage; this route cannot be recommended."
    elif load_restriction_count:
        restriction_summary = f"Load-specific restrictions at {load_restriction_count} checkpoint(s); no No Travel checkpoints."
    else:
        restriction_summary = "No checkpoints are classified No Travel under the weather/load rules. Truck road suitability is assessed separately."
    wind_values = [p.get("wind_mph") for p in route["checkpoints"] if valid(p.get("wind_mph"))]
    assessed_loads = {
        p.get("load_assessment", {}).get("load_weight_lb")
        for p in route["checkpoints"]
        if valid(p.get("load_assessment", {}).get("load_weight_lb"))
    }
    evidence = []
    if len(assessed_loads) == 1:
        load_label = format(next(iter(assessed_loads)), ",").removesuffix(".0")
        evidence.append(f"Assessed load: {load_label} lb.")
    if wind_values:
        evidence.append(
            f"Arrival-forecast wind: {min(wind_values):.1f}–{max(wind_values):.1f} mph ({len(wind_values)}/{len(route['checkpoints'])} checkpoints)."
        )
    else:
        evidence.append("Arrival-forecast wind is unavailable; no zero-wind assumption is made.")
    restriction_summary = " ".join([*evidence, restriction_summary])
    route.update(
        risk_miles=miles,
        average_risk=average,
        status=status,
        no_travel_checkpoint_count=no_travel_count,
        load_restriction_checkpoint_count=load_restriction_count,
        restriction_summary=restriction_summary,
    )
    return route


def rank(routes):
    ordered = sorted(
        routes,
        key=lambda r: (
            {"viable": 0, "insufficient-data": 1, "unsafe": 2}[r["status"]],
            r["risk_miles"]["Severe"],
            r["risk_miles"]["High"],
            r["average_risk"] if r["average_risk"] is not None else float("inf"),
            r["duration_seconds"],
            r["id"],
        ),
    )
    recommended = next((r["id"] for r in ordered if r["status"] == "viable"), None)
    for i, route in enumerate(ordered):
        route.update(rank=i + 1, recommended=route["id"] == recommended)
    return ordered, recommended
