from django.urls import include, path

from routing.views import health_check

urlpatterns = [
    path("health/", health_check, name="health"),
    path("api/", include("routing.urls")),
]
