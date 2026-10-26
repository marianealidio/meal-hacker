from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient


class SchemaTests(TestCase):
    def test_schema_lists_core_paths(self):
        c = APIClient()
        c.force_authenticate(User.objects.create_user("ann", password="x"))
        r = c.get("/api/schema/")
        self.assertEqual(r.status_code, 200)
        text = r.content.decode()
        for path in ("/api/inventory/", "/api/recipes/suggestions/", "/api/plans/", "/api/shopping/",
                     "/api/assistant/chat/", "/api/auth/demo/", "/api/stats/"):
            self.assertIn(path, text)
