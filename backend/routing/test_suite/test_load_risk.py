from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APISimpleTestCase

from routing.services.providers import ProviderError
from routing.services.risk_service import assess_load, classify


class LoadRuleTests(SimpleTestCase):
    def test_required_scenarios(self):
        cases = [
            (30, 45000, None, "Moderate", "NO_LOAD_RESTRICTION"),
            (35, 40000, None, "High", "NO_LOAD_RESTRICTION"),
            (35, 40001, "Severe", "Severe", "WIND_35_44_OVER_40000"),
            (44, 45000, "Severe", "Severe", "WIND_35_44_OVER_40000"),
            (45, 30000, None, "Severe", "NO_LOAD_RESTRICTION"),
            (45, 30001, "No Travel", "No Travel", "WIND_45_54_OVER_30000"),
            (54, 35000, "No Travel", "No Travel", "WIND_45_54_OVER_30000"),
            (55, 1000, "No Travel", "No Travel", "WIND_55_ANY_LOAD"),
            (70, 80000, "No Travel", "No Travel", "WIND_55_ANY_LOAD"),
        ]
        for wind, load, restriction, risk, code in cases:
            with self.subTest(wind=wind, load=load):
                result = assess_load(wind, load)
                self.assertEqual(result["restriction"], restriction)
                self.assertEqual(result["risk"], risk)
                self.assertEqual(result["rule_code"], code)
                self.assertEqual(result["triggered"], restriction is not None)
                self.assertTrue(result["rule"])
                self.assertTrue(result["explanation"])
                self.assertEqual(classify(wind, 0, 0, load)["risk"], risk)

    def test_same_wind_different_loads(self):
        for wind, cases in [
            (35, [(1000, None), (40000, None), (40000.01, "Severe")]),
            (45, [(1000, None), (30000, None), (30000.01, "No Travel")]),
            (55, [(1000, "No Travel"), (30000, "No Travel"), (80000, "No Travel")]),
        ]:
            for load, expected in cases:
                self.assertEqual(assess_load(wind, load)["restriction"], expected)

    def test_exact_inclusive_wind_limits(self):
        cases = [
            (34.999, None),
            (35, "Severe"),
            (44, "Severe"),
            (44.001, None),
            (44.999, None),
            (45, "No Travel"),
            (54, "No Travel"),
            (54.001, None),
            (54.999, None),
            (55, "No Travel"),
        ]
        for wind, restriction in cases:
            with self.subTest(wind=wind):
                self.assertEqual(assess_load(wind, 45000)["restriction"], restriction)
        self.assertEqual(assess_load(44.5, 45000)["risk"], "High")
        self.assertEqual(assess_load(54.5, 45000)["risk"], "Severe")

    def test_missing_weather_is_not_low(self):
        result = classify(None, 0, 0, 80000)
        self.assertIsNone(result["risk"])
        self.assertIsNone(result["load_assessment"]["risk"])
        self.assertEqual(result["load_assessment"]["rule_code"], "WIND_UNAVAILABLE")
        self.assertFalse(result["complete"])
        self.assertEqual(classify(55, None, None, 1000)["risk"], "No Travel")

    def test_general_weather_is_not_suppressed(self):
        self.assertEqual(classify(30, 1.01, 0, 45000)["risk"], "No Travel")
        self.assertEqual(classify(35, 0, 3.01, 40000)["risk"], "No Travel")
        self.assertEqual(classify(35, 0, 0, 40001)["hazards"]["wind"], "Severe")

    def test_invalid_engine_inputs(self):
        for wind, load in [
            (-1, 1000),
            (float("nan"), 1000),
            (float("inf"), 1000),
            (True, 1000),
            ("35", 1000),
            (35, 0),
            (35, -1),
            (35, None),
            (35, True),
            (35, float("inf")),
        ]:
            with self.subTest(wind=wind, load=load), self.assertRaises(ValueError):
                assess_load(wind, load)


@override_settings(GRAPHHOPPER_API_KEY="", GRAPHHOPPER_PROFILE="truck")
class LoadRiskEndpointTests(APISimpleTestCase):
    def setUp(self):
        cache.clear()

    @patch(
        "routing.services.providers.httpx.get", side_effect=AssertionError("No network expected")
    )
    def test_presets_and_assessment_need_no_provider(self, provider):
        response = self.client.get("/api/risk/load-test/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mode"], "simulated")
        self.assertEqual(len(response.data["scenarios"]), 9)
        for scenario in response.data["scenarios"]:
            response = self.client.post(
                "/api/risk/load-test/",
                {
                    "wind_mph": scenario["wind_mph"],
                    "load_weight_lb": scenario["load_weight_lb"],
                    "wind_unit": "mph",
                    "load_unit": "lb",
                    "mode": "live",
                },
                format="json",
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["mode"], "simulated")
            self.assertEqual(response.data["source"], "manual_test_input")
            self.assertEqual(response.data["scope"], "wind_and_load_only")
            assessment = response.data["assessment"]
            self.assertEqual(assessment["restriction"], scenario["expected_restriction"])
            self.assertEqual(assessment["rule_code"], scenario["expected_rule_code"])
            self.assertEqual(assessment["wind_unit"], "mph")
            self.assertEqual(assessment["load_unit"], "lb")
            self.assertNotIn("forecast_time", assessment)
        provider.assert_not_called()

    def test_invalid_input_and_units(self):
        base = {"wind_mph": 45, "load_weight_lb": 30001}
        cases = [
            {},
            {"wind_kph": 72, "load_weight_lb": 30001},
            {**base, "wind_unit": "km/h"},
            {**base, "load_unit": "kg"},
        ]
        for field, value in [
            ("wind_mph", -1),
            ("wind_mph", None),
            ("wind_mph", "NaN"),
            ("wind_mph", "Infinity"),
            ("wind_mph", True),
            ("load_weight_lb", -1),
            ("load_weight_lb", 0),
            ("load_weight_lb", 200001),
            ("load_weight_lb", "NaN"),
            ("load_weight_lb", True),
        ]:
            cases.append({**base, field: value})
        for payload in cases:
            with self.subTest(payload=payload):
                response = self.client.post("/api/risk/load-test/", payload, format="json")
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn("error", response.data)


@override_settings(GRAPHHOPPER_API_KEY="test-only", GRAPHHOPPER_PROFILE="car")
class LoadRouteIntegrationTests(APISimpleTestCase):
    def setUp(self):
        cache.clear()
        self.departure = timezone.now().replace(minute=0, second=0, microsecond=0) + timedelta(
            hours=1
        )

    def payload(self, load=30001):
        return {
            "origin": {"label": "A", "lat": 40, "lon": -75},
            "destination": {"label": "B", "lat": 41, "lon": -74},
            "departure_time": self.departure.isoformat(),
            "load_weight_lb": load,
            "interval_miles": 25,
        }

    def provider_routes(self):
        return {
            "paths": [
                {
                    "points": {"coordinates": [[-75, 40], [-74.8 + i * 0.1, 40.5], [-74, 41]]},
                    "distance": 90000 + i * 1000,
                    "time": 3600000,
                    "description": [f"Road {i}"],
                }
                for i in range(3)
            ]
        }

    def weather(self, url, params, **kwargs):
        times = [int((self.departure + timedelta(hours=i)).timestamp()) for i in range(60)]
        return [
            {
                "hourly": {
                    "time": times,
                    "wind_speed_10m": [getattr(self, "forecast_wind", 45)] * 60,
                    "rain": [0] * 60,
                    "showers": [0] * 60,
                    "snowfall": [0] * 60,
                }
            }
            for _ in params["latitude"].split(",")
        ]

    @patch("routing.services.weather_service.fetch")
    @patch("routing.services.routing_service.fetch")
    def test_car_routes_use_load_rules_and_surface_no_travel(self, routing, weather):
        routing.return_value = self.provider_routes()
        weather.side_effect = self.weather
        response = self.client.post("/api/routes/analyze/", self.payload(), format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["routes"]), 3)
        self.assertEqual(response.data["routing_profile"], "car")
        self.assertFalse(response.data["truck_restrictions_enforced"])
        self.assertEqual(response.data["trip"]["destination"], self.payload()["destination"])
        self.assertEqual(response.data["trip"]["origin"], self.payload()["origin"])
        self.assertEqual(response.data["trip"]["load_weight_lb"], 30001)
        self.assertEqual(response.data["trip"]["interval_miles"], 25)
        self.assertEqual(
            timezone.datetime.fromisoformat(response.data["trip"]["departure_time"]), self.departure
        )
        self.assertLess(
            abs(
                (
                    timezone.now() - timezone.datetime.fromisoformat(response.data["analyzed_at"])
                ).total_seconds()
            ),
            10,
        )
        self.assertTrue(
            any(
                "Truck-specific road restrictions are not enforced" in w
                for w in response.data["warnings"]
            )
        )
        self.assertIsNone(response.data["recommended_route_id"])
        self.assertTrue(any("No route is currently safe" in w for w in response.data["warnings"]))
        for route in response.data["routes"]:
            self.assertEqual(route["status"], "unsafe")
            self.assertFalse(route["recommended"])
            self.assertEqual(route["no_travel_checkpoint_count"], len(route["checkpoints"]))
            self.assertEqual(route["load_restriction_checkpoint_count"], len(route["checkpoints"]))
            self.assertIn("No Travel", route["restriction_summary"])
            self.assertAlmostEqual(route["risk_miles"]["No Travel"], route["distance_miles"])
            for point in route["checkpoints"]:
                self.assertEqual(point["load_assessment"]["rule_code"], "WIND_45_54_OVER_30000")
                self.assertEqual(point["load_assessment"]["load_weight_lb"], 30001)
                self.assertEqual(point["wind_mph"], 45)
                self.assertIsNotNone(point["forecast_time"])
        response = self.client.post("/api/routes/analyze/", self.payload(30000), format="json")
        self.assertIsNotNone(response.data["recommended_route_id"])
        for route in response.data["routes"]:
            self.assertEqual(route["no_travel_checkpoint_count"], 0)
            self.assertEqual(route["load_restriction_checkpoint_count"], 0)
            self.assertEqual(route["checkpoints"][0]["risk"], "Severe")

    @patch(
        "routing.services.weather_service.fetch", side_effect=ProviderError("weather unavailable")
    )
    @patch("routing.services.routing_service.fetch")
    def test_missing_forecast_does_not_remove_danger_or_create_safety(self, routing, weather):
        routing.return_value = self.provider_routes()
        response = self.client.post("/api/routes/analyze/", self.payload(), format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["recommended_route_id"])
        for route in response.data["routes"]:
            self.assertEqual(route["status"], "insufficient-data")
            self.assertEqual(
                route["checkpoints"][0]["load_assessment"]["rule_code"], "WIND_UNAVAILABLE"
            )
            self.assertIsNone(route["checkpoints"][0]["risk"])

    @patch("routing.services.weather_service.fetch")
    @patch("routing.services.routing_service.fetch")
    def test_duplicates_are_not_used_to_fill_three_options(self, routing, weather):
        paths = self.provider_routes()["paths"]
        routing.return_value = {"paths": [paths[0], paths[0], paths[1]]}
        weather.side_effect = self.weather
        response = self.client.post("/api/routes/analyze/", self.payload(), format="json")
        self.assertEqual(len(response.data["routes"]), 2)
        self.assertTrue(any("2 distinct route(s)" in w for w in response.data["warnings"]))

    @override_settings(GRAPHHOPPER_PROFILE="truck")
    @patch("routing.services.weather_service.fetch")
    @patch(
        "routing.services.routing_service.fetch",
        side_effect=ProviderError("Set GRAPHHOPPER_PROFILE to an enabled profile", 503),
    )
    def test_profile_error_does_not_silently_fallback(self, routing, weather):
        response = self.client.post("/api/routes/analyze/", self.payload(), format="json")
        self.assertEqual(response.status_code, 503)
        self.assertIn("GRAPHHOPPER_PROFILE", response.data["error"]["message"])
        self.assertEqual(settings.GRAPHHOPPER_PROFILE, "truck")
        self.assertEqual(routing.call_args.args[1]["profile"], "truck")
        routing.assert_called_once()
        weather.assert_not_called()

    @patch("routing.services.weather_service.fetch")
    @patch("routing.services.routing_service.fetch")
    def test_sixty_thousand_lb_uses_forecast_wind_for_route_classification(self, routing, weather):
        routing.return_value = self.provider_routes()
        weather.side_effect = self.weather
        for wind, risk, state in [
            (11.7, "Low", "viable"),
            (30, "Moderate", "viable"),
            (35, "Severe", "viable"),
            (44, "Severe", "viable"),
            (45, "No Travel", "unsafe"),
            (54, "No Travel", "unsafe"),
            (55, "No Travel", "unsafe"),
        ]:
            with self.subTest(wind=wind):
                self.forecast_wind = wind
                response = self.client.post(
                    "/api/routes/analyze/", self.payload(60000), format="json"
                )
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data["trip"]["load_weight_lb"], 60000)
                for route in response.data["routes"]:
                    self.assertEqual(route["status"], state)
                    self.assertIn("Assessed load: 60,000 lb", route["restriction_summary"])
                    self.assertIn(f"{wind:.1f}–{wind:.1f} mph", route["restriction_summary"])
                    for point in route["checkpoints"]:
                        self.assertEqual(point["load_assessment"]["load_weight_lb"], 60000)
                        self.assertEqual(point["risk"], risk)
                if state == "unsafe":
                    self.assertIsNone(response.data["recommended_route_id"])
                    self.assertTrue(
                        all(not route["recommended"] for route in response.data["routes"])
                    )
