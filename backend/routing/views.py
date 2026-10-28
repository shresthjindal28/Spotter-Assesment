from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from .serializers import (
    AnalysisSerializer,
    ForecastSerializer,
    GeocodeSerializer,
    LoadAssessmentSerializer,
    LoadRiskTestSerializer,
    RouteSerializer,
)
from .services.analysis_service import analyze
from .services.geocoding_service import search
from .services.load_test_service import run_test, scenarios
from .services.providers import ProviderError
from .services.weather_service import at_time, forecasts


@api_view(["GET"])
@throttle_classes([])
def health_check(request):
    return Response(
        {
            "status": "ok",
            "service": "weather-truck-routing-api",
            "message": "Backend is running successfully",
        }
    )


def failure(exc):
    return Response({"error": {"code": "provider_error", "message": str(exc)}}, status=exc.status)


@api_view(["POST"])
def analyze_routes(request):
    serializer = AnalysisSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        result = analyze(serializer.validated_data)
        result["routes"] = RouteSerializer(result["routes"], many=True).data
        return Response(result)
    except ProviderError as exc:
        return failure(exc)


@api_view(["GET"])
def geocode(request):
    serializer = GeocodeSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    try:
        return Response({"results": search(serializer.validated_data["q"])})
    except ProviderError as exc:
        return failure(exc)


@api_view(["GET"])
def forecast(request):
    serializer = ForecastSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    point = {"lat": data["lat"], "lon": data["lon"]}
    rows = forecasts([point]).get((round(data["lat"], 4), round(data["lon"], 4)), {})
    return Response(at_time(rows, data["time"], data["load_weight_lb"]))


@api_view(["GET", "POST"])
def load_risk_test(request):
    if request.method == "GET":
        return Response(
            {"mode": "simulated", "source": "manual_test_input", "scenarios": scenarios()}
        )
    serializer = LoadRiskTestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    result = run_test(data["wind_mph"], data["load_weight_lb"])
    result["assessment"] = LoadAssessmentSerializer(result["assessment"]).data
    return Response(result)
