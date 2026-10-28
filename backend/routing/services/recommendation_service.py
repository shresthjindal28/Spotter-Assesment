from .risk_service import LEVELS


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
        restriction_summary = "No No Travel checkpoints under the weather/load rules. Truck road suitability is assessed separately."
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
