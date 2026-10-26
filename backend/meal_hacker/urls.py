from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from .health import health

api_patterns = [
    path("health/", health, name="health"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
    path("", include("core.urls")),
]
