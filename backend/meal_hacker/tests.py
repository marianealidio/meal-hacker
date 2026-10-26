from unittest import mock

from django.test import TestCase, override_settings
from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.test import APIClient


@api_view(["GET"])
@permission_classes([AllowAny])
def _boom(request):
    raise RuntimeError("kaboom")


urlpatterns = [path("api/boom/", _boom)]


class HealthTests(TestCase):
    def test_health_is_public_and_ok(self):
        r = APIClient().get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"status": "ok"})


class ErrorEnvelopeTests(TestCase):
    def test_unknown_api_route_uses_envelope(self):
        r = APIClient().get("/api/does-not-exist/")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()["error"]["code"], "not_found")

    def test_auth_required_uses_envelope(self):
        # /api/inventory/ is added in Task 3; until then use a guarded probe
        from meal_hacker.api_errors import error_envelope_handler
        from rest_framework.exceptions import NotAuthenticated
        resp = error_envelope_handler(NotAuthenticated(), {})
        self.assertIn(resp.status_code, (401, 403))
        self.assertEqual(resp.data["error"]["code"], "not_authenticated")
        self.assertIn("message", resp.data["error"])
        self.assertEqual(resp.data["error"]["fields"], {})

    def test_validation_error_lists_fields(self):
        from meal_hacker.api_errors import error_envelope_handler
        from rest_framework.exceptions import ValidationError
        resp = error_envelope_handler(ValidationError({"name": ["This field is required."]}), {})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "invalid")
        self.assertEqual(resp.data["error"]["fields"], {"name": ["This field is required."]})


@override_settings(ROOT_URLCONF="meal_hacker.tests")
class UnhandledErrorTests(TestCase):
    def test_non_drf_exception_uses_envelope(self):                     # I5
        c = APIClient(raise_request_exception=False)
        with self.assertLogs("meal_hacker.api_errors", level="ERROR"):
            r = c.get("/api/boom/")
        self.assertEqual(r.status_code, 500)
        self.assertEqual(r.json(), {"error": {"code": "server_error",
                                              "message": "Something went wrong on our side.", "fields": {}}})

    def test_handler_rolls_back_atomic_requests(self):
        from meal_hacker.api_errors import error_envelope_handler
        with mock.patch("meal_hacker.api_errors.set_rollback") as rollback:
            with self.assertLogs("meal_hacker.api_errors", level="ERROR"):
                resp = error_envelope_handler(RuntimeError("x"), {})
        rollback.assert_called_once_with()
        self.assertEqual(resp.status_code, 500)


class SchemaAccessTests(TestCase):
    def test_schema_requires_login(self):
        r = APIClient().get("/api/schema/")
        self.assertIn(r.status_code, (401, 403))
        self.assertIn("code", r.json()["error"])


class TestKeysTests(TestCase):
    def test_live_api_keys_are_blank_during_tests(self):
        from django.conf import settings
        self.assertEqual(settings.SPOONACULAR_API_KEY, "")
        self.assertEqual(settings.GROQ_API_KEY, "")


class DevCsrfOriginsTests(TestCase):
    def test_dev_trusts_local_frontend_ports(self):
        from django.conf import settings
        for origin in ("http://localhost:3000", "http://localhost:3002", "http://127.0.0.1:3005"):
            self.assertIn(origin, settings.CSRF_TRUSTED_ORIGINS)
        self.assertNotIn("http://localhost:3006", settings.CSRF_TRUSTED_ORIGINS)
