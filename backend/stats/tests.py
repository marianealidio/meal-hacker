from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from kitchen.models import InventoryItem
from planner.models import MealPlan


class StatsTests(TestCase):
    def test_counts(self):
        user = User.objects.create_user("ann", password="x")
        other = User.objects.create_user("bob", password="x")
        today = timezone.localdate()
        InventoryItem.objects.create(user=user, name="a", used_at=timezone.now())
        InventoryItem.objects.create(user=user, name="b", expiry_date=today + timedelta(days=1))
        InventoryItem.objects.create(user=user, name="c")
        InventoryItem.objects.create(user=other, name="d", used_at=timezone.now())
        MealPlan.objects.create(user=user, recipe_id=1, recipe_title="x", planned_date=today)
        c = APIClient()
        c.force_authenticate(user)
        body = c.get("/api/stats/").json()
        self.assertEqual(body["used_this_month"], 1)
        self.assertEqual(body["items_in_kitchen"], 2)
        self.assertEqual(body["expiring_soon"], 1)
        self.assertEqual(body["meals_planned_this_week"], 1)
        self.assertIn("expired_this_month", body)

    def test_requires_login(self):
        self.assertIn(APIClient().get("/api/stats/").status_code, (401, 403))
