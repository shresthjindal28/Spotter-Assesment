from django.contrib import admin
from django.urls import include, path

from routing.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health"),
    path("api/", include("routing.urls")),
]
