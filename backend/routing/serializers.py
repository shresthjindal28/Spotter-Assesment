import math
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers


class FiniteFloatField(serializers.FloatField):
    def to_internal_value(self, data):
        if isinstance(data, bool):
            self.fail("invalid")
        value = super().to_internal_value(data)
        if not math.isfinite(value):
            self.fail("invalid")
        return value


class LocationSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=250)
    lat = FiniteFloatField(min_value=-90, max_value=90)
    lon = FiniteFloatField(min_value=-180, max_value=180)


class AnalysisSerializer(serializers.Serializer):
    origin = LocationSerializer()
    destination = LocationSerializer()
    departure_time = serializers.DateTimeField()
    load_weight_lb = FiniteFloatField(min_value=1, max_value=200000)
    interval_miles = serializers.ChoiceField(choices=[10, 25, 50])

    def validate_departure_time(self, value):
        raw = str(self.initial_data.get("departure_time", ""))
        if not (raw.endswith("Z") or "+" in raw[10:] or "-" in raw[10:]):
            raise serializers.ValidationError("Include a timezone offset or Z.")
        if value < timezone.now() - timedelta(minutes=5) or value > timezone.now() + timedelta(
            days=15
        ):
            raise serializers.ValidationError(
                "Choose a departure between now and 15 days ahead. Later checkpoint forecasts may be unavailable."
            )
        return value

    def validate(self, data):
        if (data["origin"]["lat"], data["origin"]["lon"]) == (
            data["destination"]["lat"],
            data["destination"]["lon"],
        ):
            raise serializers.ValidationError("Origin and destination must differ.")
        return data


class GeocodeSerializer(serializers.Serializer):
    q = serializers.CharField(min_length=3, max_length=200)


class ForecastSerializer(serializers.Serializer):
    lat = FiniteFloatField(min_value=-90, max_value=90)
    lon = FiniteFloatField(min_value=-180, max_value=180)
    time = serializers.DateTimeField()
    load_weight_lb = FiniteFloatField(min_value=1, max_value=200000, default=30000)

    def validate_time(self, value):
        raw = str(self.initial_data.get("time", ""))
        if not (raw.endswith("Z") or "+" in raw[10:] or "-" in raw[10:]):
            raise serializers.ValidationError("Include a timezone offset or Z.")
        return value


class LoadRiskTestSerializer(serializers.Serializer):
    wind_mph = FiniteFloatField(min_value=0)
    load_weight_lb = FiniteFloatField(min_value=1, max_value=200000)
    wind_unit = serializers.ChoiceField(choices=["mph"], default="mph")
    load_unit = serializers.ChoiceField(choices=["lb"], default="lb")


class LoadAssessmentSerializer(serializers.Serializer):
    wind_mph = FiniteFloatField(allow_null=True)
    load_weight_lb = FiniteFloatField()
    wind_unit = serializers.CharField()
    load_unit = serializers.CharField()
    general_wind_risk = serializers.CharField(allow_null=True)
    risk = serializers.CharField(allow_null=True)
    restriction = serializers.CharField(allow_null=True)
    triggered = serializers.BooleanField()
    rule_code = serializers.CharField()
    rule = serializers.CharField()
    explanation = serializers.CharField()


class CheckpointSerializer(serializers.Serializer):
    load_assessment = LoadAssessmentSerializer()
    availability = serializers.CharField()
    distance_miles = FiniteFloatField()
    lat = FiniteFloatField()
    lon = FiniteFloatField()
    arrival_time = serializers.DateTimeField()
    forecast_time = serializers.DateTimeField(allow_null=True)
    wind_mph = FiniteFloatField(allow_null=True)
    rain_in_hr = FiniteFloatField(allow_null=True)
    snow_in_hr = FiniteFloatField(allow_null=True)
    risk = serializers.CharField(allow_null=True)
    hazards = serializers.DictField()
    complete = serializers.BooleanField()
    timeline = serializers.ListField(child=serializers.DictField())


class RouteSerializer(serializers.Serializer):
    no_travel_checkpoint_count = serializers.IntegerField()
    load_restriction_checkpoint_count = serializers.IntegerField()
    restriction_summary = serializers.CharField()
    id = serializers.CharField()
    summary = serializers.CharField()
    geometry = serializers.ListField(child=serializers.ListField(child=FiniteFloatField()))
    distance_miles = FiniteFloatField()
    duration_seconds = FiniteFloatField()
    arrival_time = serializers.DateTimeField()
    checkpoints = CheckpointSerializer(many=True)
    risk_miles = serializers.DictField(child=FiniteFloatField())
    average_risk = FiniteFloatField(allow_null=True)
    status = serializers.CharField()
    rank = serializers.IntegerField()
    recommended = serializers.BooleanField()
