from django.urls import path

from . import views

urlpatterns = [
    path("risk/load-test/", views.load_risk_test, name="load-risk-test"),
    path("health/", views.health_check, name="health-check"),
    path("routes/analyze/", views.analyze_routes, name="analyze-routes"),
    path("geocode/", views.geocode, name="geocode"),
    path("weather/forecast/", views.forecast, name="forecast"),
]
