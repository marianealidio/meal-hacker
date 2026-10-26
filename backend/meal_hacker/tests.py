from django.test import TestCase
from rest_framework.test import APIClient


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
