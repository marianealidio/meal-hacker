from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView
from rest_framework.renderers import JSONRenderer

from .health import api_not_found, health

api_patterns = [
    path("health/", health, name="health"),
    path("schema/", SpectacularAPIView.as_view(renderer_classes=[JSONRenderer]), name="schema"),
    path("", include("accounts.urls")),
    path("", include("kitchen.urls")),
    path("", include("recipes.urls")),
    path("", include("planner.urls")),
    path("", include("assistant.urls")),
    # Later tasks include() app URLs above this line. The catch-all MUST stay last.
    re_path(r"^.*$", api_not_found),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
    path("", include("core.urls")),
]
