from datetime import timedelta
from unittest.mock import patch

import httpx
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APISimpleTestCase

from routing.services.checkpoint_service import checkpoints
from routing.services.providers import ProviderError, fetch
from routing.services.recommendation_service import rank, summarize
from routing.services.risk_service import LEVELS, classify
from routing.services.weather_service import at_time, forecasts


class RiskTests(SimpleTestCase):
    def test_wind_boundaries(self):
        for threshold, below, at in [(25, 0, 1), (35, 1, 2), (45, 2, 3), (55, 3, 4)]:
            for value, expected in [
                (threshold - 0.001, below),
                (threshold, at),
                (threshold + 0.001, at),
            ]:
                with self.subTest(value=value):
                    self.assertEqual(classify(value, 0, 0, 10000)["risk"], LEVELS[expected])

    def test_precipitation_boundaries(self):
        for hazard, thresholds in [("rain", (0.1, 0.25, 0.5, 1)), ("snow", (0.5, 1, 2, 3))]:
            for i, t in enumerate(thresholds):
                for delta, expected in [(-0.00001, i), (0, 1 if i == 0 else i), (0.00001, i + 1)]:
                    values = {"wind": 0, "rain": 0, "snow": 0}
                    values[hazard] = t + delta
                    self.assertEqual(classify(**values, load=10000)["risk"], LEVELS[expected])

    def test_load_rules(self):
        for wind, load, expected in [
            (55, 1, "No Travel"),
            (45, 30000, "Severe"),
            (45, 30001, "No Travel"),
            (54.99, 30001, "Severe"),
            (35, 40000, "High"),
            (35, 40001, "Severe"),
            (44.99, 40001, "High"),
            (34.99, 50000, "Moderate"),
        ]:
            self.assertEqual(classify(wind, 0, 0, load)["risk"], expected)

    def test_combined_missing_invalid(self):
        self.assertEqual(classify(30, 0.6, 2, 1000)["risk"], "Severe")
        self.assertIsNone(classify(None, 0, 0, 1000)["risk"])
        self.assertEqual(classify(55, None, None, 1000)["risk"], "No Travel")
        for values in [
            (-1, 0, 0, 1),
            (0, -1, 0, 1),
            (0, 0, -1, 1),
            (0, 0, 0, -1),
            (float("nan"), 0, 0, 1),
            (0, 0, 0, 0),
        ]:
            with self.assertRaises(ValueError):
                classify(*values)


def option(identifier="a", severe=0, high=0, average=0, duration=100, status="viable"):
    return {
        "id": identifier,
        "status": status,
        "risk_miles": {"Severe": severe, "High": high},
        "average_risk": average,
        "duration_seconds": duration,
    }


class RecommendationTests(SimpleTestCase):
    def test_priority(self):
        pairs = [
            (option(severe=1), option("b", severe=0, high=100, average=3, duration=999)),
            (option(high=1), option("b", high=0, average=3, duration=999)),
            (option(average=2), option("b", average=1, duration=999)),
            (option(duration=101), option("b", duration=100)),
        ]
        for a, b in pairs:
            self.assertEqual(rank([a, b])[1], "b")

    def test_safety_and_missing(self):
        for state in ("unsafe", "insufficient-data"):
            self.assertEqual(rank([option(status=state), option("b", severe=100)])[1], "b")
            self.assertIsNone(rank([option(status=state)])[1])
        self.assertEqual(rank([option("b"), option("a")])[0][0]["id"], "a")

    def test_partial_segments(self):
        r = {
            "distance_miles": 26,
            "checkpoints": [
                {"distance_miles": 0, "risk": "Low", "complete": True},
                {"distance_miles": 25, "risk": "High", "complete": True},
                {"distance_miles": 26, "risk": "Severe", "complete": True},
            ],
        }
        summarize(r)
        self.assertEqual(r["risk_miles"]["High"], 25)
        self.assertEqual(r["risk_miles"]["Severe"], 1)
        self.assertEqual(sum(r["risk_miles"].values()), 26)
        r["checkpoints"][1].update(risk=None, complete=False)
        self.assertEqual(summarize(r)["status"], "insufficient-data")


class CheckpointTests(SimpleTestCase):
    def test_actual_geometry_and_eta(self):
        start = timezone.now()
        route = {
            "geometry": [[0, 0], [0, 1], [1, 1]],
            "distance_miles": 101,
            "duration_seconds": 1010,
        }
        points = checkpoints(route, 25, start)
        self.assertEqual([p["distance_miles"] for p in points], [0, 25, 50, 75, 100, 101])
        self.assertAlmostEqual(points[1]["lon"], 0)
        self.assertEqual(points[-1]["arrival_time"], (start + timedelta(seconds=1010)).isoformat())
        self.assertEqual(points[-1]["lon"], 1)

    def test_weather_hour_and_missing(self):
        start = timezone.now().replace(minute=0, second=0, microsecond=0)
        rows = {int(start.timestamp()): {"wind_mph": 10, "rain_in_hr": 0, "snow_in_hr": 0}}
        self.assertEqual(at_time(rows, start, 1000)["risk"], "Low")
        self.assertIsNone(at_time(rows, start + timedelta(minutes=1), 1000)["risk"])


@override_settings(GRAPHHOPPER_API_KEY="test-key")
class IntegrationTests(APISimpleTestCase):
    def payload(self):
        return {
            "origin": {"label": "A", "lat": 40, "lon": -75},
            "destination": {"label": "B", "lat": 41, "lon": -74},
            "departure_time": (timezone.now() + timedelta(hours=1)).isoformat(),
            "load_weight_lb": 30000,
            "interval_miles": 25,
        }

    def test_invalid(self):
        for field, value in [
            ("load_weight_lb", -1),
            ("interval_miles", 15),
            ("departure_time", "2020-01-01T00:00:00Z"),
            ("departure_time", "2027-01-01T12:00:00"),
        ]:
            payload = self.payload()
            payload[field] = value
            self.assertEqual(
                self.client.post("/api/routes/analyze/", payload, format="json").status_code, 400
            )

    @patch(
        "routing.services.analysis_service.routes", side_effect=ProviderError("Unavailable", 503)
    )
    def test_routing_failure(self, mock):
        self.assertEqual(
            self.client.post("/api/routes/analyze/", self.payload(), format="json").status_code, 503
        )

    @patch("routing.services.providers.httpx.get")
    def test_timeout(self, mock):
        mock.side_effect = httpx.ReadTimeout("timed out")
        with self.assertRaises(ProviderError):
            fetch("https://example.test", {"x": "timeout"})

    @patch("routing.services.weather_service.fetch", side_effect=ProviderError("down"))
    def test_weather_failure(self, mock):
        self.assertEqual(forecasts([{"lat": 0, "lon": 0}]), {(0, 0): {}})

    @patch("routing.services.weather_service.fetch")
    @patch("routing.services.routing_service.fetch")
    def test_success_real_normalization(self, routing, weather):
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        routing.return_value = {
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
        times = [int((now + timedelta(hours=i)).timestamp()) for i in range(80)]

        def mocked_weather(url, params, **kwargs):
            count = len(params["latitude"].split(","))
            return [
                {
                    "hourly": {
                        "time": times,
                        "wind_speed_10m": [10] * 80,
                        "rain": [0] * 80,
                        "showers": [0] * 80,
                        "snowfall": [0] * 80,
                    }
                }
                for _ in range(count)
            ]

        weather.side_effect = mocked_weather
        response = self.client.post("/api/routes/analyze/", self.payload(), format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["routes"]), 3)
        self.assertIsNotNone(response.data["recommended_route_id"])
        p = response.data["routes"][0]["checkpoints"][1]
        self.assertEqual(len(p["timeline"]), 49)
        self.assertEqual(p["risk"], "Low")
        weather.side_effect = ProviderError("offline")
        response = self.client.post("/api/routes/analyze/", self.payload(), format="json")
        self.assertIsNone(response.data["recommended_route_id"])
        self.assertTrue(all(r["status"] == "insufficient-data" for r in response.data["routes"]))


class WeatherNormalizationTests(SimpleTestCase):
    @patch("routing.services.weather_service.fetch")
    def test_units_and_partial_measurements(self, provider):
        provider.return_value = {
            "hourly": {
                "time": [3600],
                "wind_speed_10m": [55],
                "rain": [2.54],
                "showers": [2.54],
                "snowfall": [2.54],
            }
        }
        data = forecasts([{"lat": 1, "lon": 2}])[(1, 2)][3600]
        self.assertAlmostEqual(data["rain_in_hr"], 0.2)
        self.assertAlmostEqual(data["snow_in_hr"], 1)
        self.assertEqual(data["wind_mph"], 55)
        provider.return_value["hourly"]["snowfall"] = [None]
        data = forecasts([{"lat": 1, "lon": 2}])[(1, 2)]
        classified = at_time(
            data, timezone.datetime.fromtimestamp(3600, timezone.get_current_timezone()), 30000
        )
        self.assertEqual(classified["risk"], "No Travel")
        self.assertFalse(classified["complete"])

    @patch("routing.services.weather_service.fetch")
    def test_bad_and_incomplete_responses(self, provider):
        for value in [{"hourly": []}, {"error": True}, []]:
            provider.return_value = value
            self.assertEqual(forecasts([{"lat": 1, "lon": 2}]), {(1, 2): {}})


class AdditionalRecommendationTests(SimpleTestCase):
    def test_all_unsafe_and_input_order(self):
        self.assertIsNone(rank([option("a", status="unsafe"), option("b", status="unsafe")])[1])
        for items in ([option("a"), option("b")], [option("b"), option("a")]):
            self.assertEqual([r["id"] for r in rank(items)[0]], ["a", "b"])


class SerializerTests(SimpleTestCase):
    def test_nonfinite_inputs_and_timezone(self):
        from routing.serializers import AnalysisSerializer, ForecastSerializer

        for value in ("NaN", "Infinity", "-Infinity"):
            form = AnalysisSerializer(
                data={
                    "origin": {"label": "A", "lat": 40, "lon": -75},
                    "destination": {"label": "B", "lat": 41, "lon": -74},
                    "departure_time": (timezone.now() + timedelta(hours=1)).isoformat(),
                    "load_weight_lb": value,
                    "interval_miles": 25,
                }
            )
            self.assertFalse(form.is_valid())
        self.assertFalse(
            ForecastSerializer(
                data={"lat": 40, "lon": -75, "time": "2026-10-27T12:00:00"}
            ).is_valid()
        )


class AnalysisTimingTests(SimpleTestCase):
    @patch("routing.services.analysis_service.forecasts")
    @patch("routing.services.analysis_service.routes")
    def test_arrival_weather_and_horizon(self, routing, weather):
        from routing.services.analysis_service import analyze

        start = timezone.now().replace(minute=0, second=0, microsecond=0)

        def route():
            return {
                "id": "a",
                "summary": "Test road",
                "geometry": [[0, 0], [0, 1]],
                "distance_miles": 50,
                "duration_seconds": 7200,
            }

        routing.side_effect = lambda *args: [route()]
        rows = {
            int((start + timedelta(hours=h)).timestamp()): {
                "wind_mph": wind,
                "rain_in_hr": 0,
                "snow_in_hr": 0,
            }
            for h, wind in [(0, 10), (1, 35), (2, 55)]
        }
        weather.side_effect = lambda points: {
            (round(p["lat"], 4), round(p["lon"], 4)): rows for p in points
        }
        payload = {
            "origin": {},
            "destination": {},
            "departure_time": start,
            "load_weight_lb": 10000,
            "interval_miles": 25,
        }
        result = analyze(payload)
        self.assertEqual(
            [p["risk"] for p in result["routes"][0]["checkpoints"]], ["Low", "High", "No Travel"]
        )
        self.assertIsNone(result["recommended_route_id"])
        self.assertTrue(any("No route is currently safe" in w for w in result["warnings"]))
        rows.pop(int((start + timedelta(hours=2)).timestamp()))
        result = analyze(payload)
        self.assertEqual(result["routes"][0]["status"], "insufficient-data")
        self.assertEqual(
            result["routes"][0]["checkpoints"][-1]["availability"], "outside_forecast_horizon"
        )
        self.assertIsNone(result["recommended_route_id"])
        self.assertIsNone(result["routes"][0]["average_risk"])

    def test_intervals_and_route_deduplication(self):
        from routing.services.routing_service import routes

        for interval in (10, 25, 50):
            points = checkpoints(
                {"geometry": [[0, 0], [0, 1]], "distance_miles": 57, "duration_seconds": 100},
                interval,
                timezone.now(),
            )
            self.assertEqual(points[1]["distance_miles"], interval)
            self.assertEqual(points[-1]["distance_miles"], 57)
        with (
            override_settings(GRAPHHOPPER_API_KEY="test"),
            patch("routing.services.routing_service.fetch") as provider,
        ):
            path = {"points": {"coordinates": [[0, 0], [0, 1]]}, "distance": 50000, "time": 100000}
            provider.return_value = {"paths": [path, path, path]}
            self.assertEqual(len(routes({"lat": 0, "lon": 0}, {"lat": 1, "lon": 0})), 1)


class ProviderConfigurationTests(SimpleTestCase):
    @override_settings(OPEN_METEO_API_KEY="")
    @patch("routing.services.weather_service.fetch")
    def test_open_meteo_keyless_endpoint(self, provider):
        provider.return_value = {
            "hourly": {
                "time": [3600],
                "wind_speed_10m": [10],
                "rain": [0],
                "showers": [0],
                "snowfall": [0],
            }
        }
        forecasts([{"lat": 12, "lon": 77}])
        self.assertEqual(provider.call_args.args[0], "https://api.open-meteo.com/v1/forecast")
        self.assertNotIn("apikey", provider.call_args.args[1])
        self.assertEqual(provider.call_args.args[1]["wind_speed_unit"], "mph")

    @patch("routing.services.providers.httpx.get")
    def test_profile_error_is_actionable_and_redacted(self, provider):
        response = httpx.Response(
            400,
            json={
                "message": "For your account the profile parameter can only be one of [car, bike, foot] but was truck"
            },
            request=httpx.Request("GET", "https://graphhopper.com/api/1/route?key=private-secret"),
        )
        provider.return_value = response
        with self.assertRaises(ProviderError) as caught:
            fetch(
                "https://graphhopper.com/api/1/route",
                {"profile": "truck", "unique_test": "profile"},
            )
        self.assertIn("GRAPHHOPPER_PROFILE", str(caught.exception))
        self.assertNotIn("private-secret", str(caught.exception))

    @override_settings(GRAPHHOPPER_PROFILE="car")
    @patch("routing.services.analysis_service.forecasts", return_value={})
    @patch("routing.services.analysis_service.routes")
    def test_nontruck_profile_disclosure(self, routing, weather):
        from routing.services.analysis_service import analyze

        routing.return_value = [
            {
                "id": "a",
                "summary": "Test road",
                "geometry": [[0, 0], [0, 1]],
                "distance_miles": 50,
                "duration_seconds": 7200,
            }
        ]
        result = analyze(
            {
                "origin": {},
                "destination": {},
                "departure_time": timezone.now(),
                "load_weight_lb": 10000,
                "interval_miles": 25,
            }
        )
        self.assertFalse(result["truck_restrictions_enforced"])
        self.assertEqual(result["routing_profile"], "car")
        self.assertTrue(
            any(
                "Truck-specific road restrictions are not enforced" in warning
                for warning in result["warnings"]
            )
        )
