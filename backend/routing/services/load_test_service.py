from .risk_service import assess_load

SCENARIOS = [
    ("no-extra", 30, 45000, None, "NO_LOAD_RESTRICTION", "No load-specific restriction"),
    ("forty-thousand", 35, 40000, None, "NO_LOAD_RESTRICTION", "No load-specific Severe trigger"),
    ("over-forty-thousand", 35, 40001, "Severe", "WIND_35_44_OVER_40000", "Severe"),
    ("forty-four", 44, 45000, "Severe", "WIND_35_44_OVER_40000", "Severe"),
    (
        "thirty-thousand",
        45,
        30000,
        None,
        "NO_LOAD_RESTRICTION",
        "No load-specific No Travel trigger",
    ),
    ("over-thirty-thousand", 45, 30001, "No Travel", "WIND_45_54_OVER_30000", "No Travel"),
    ("fifty-four", 54, 35000, "No Travel", "WIND_45_54_OVER_30000", "No Travel"),
    ("fifty-five", 55, 1000, "No Travel", "WIND_55_ANY_LOAD", "No Travel"),
    ("seventy", 70, 80000, "No Travel", "WIND_55_ANY_LOAD", "No Travel"),
]


def scenarios():
    return [
        {
            "id": identifier,
            "wind_mph": wind,
            "load_weight_lb": load,
            "expected_restriction": restriction,
            "expected_rule_code": code,
            "expected_result": expected,
        }
        for identifier, wind, load, restriction, code, expected in SCENARIOS
    ]


def run_test(wind, load):
    return {
        "mode": "simulated",
        "source": "manual_test_input",
        "scope": "wind_and_load_only",
        "assessment": assess_load(wind, load),
    }
