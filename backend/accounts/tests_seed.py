from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import DEMO_USERNAME, get_profile
from kitchen.models import InventoryItem
from planner.models import MealPlan, ShoppingListItem
from recipes.models import FavouriteRecipe


@override_settings(SPOONACULAR_API_KEY="")
class SeedDemoTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_seed_creates_a_full_kitchen(self):
        call_command("seed_demo")
        demo = User.objects.get(username=DEMO_USERNAME)
        self.assertGreaterEqual(InventoryItem.objects.filter(user=demo).count(), 12)
        self.assertTrue(InventoryItem.objects.filter(user=demo, expiry_date__isnull=False).exists())
        self.assertGreaterEqual(MealPlan.objects.filter(user=demo).count(), 4)
        self.assertGreaterEqual(ShoppingListItem.objects.filter(user=demo).count(), 4)
        self.assertGreaterEqual(FavouriteRecipe.objects.filter(user=demo).count(), 3)
        self.assertTrue(get_profile(demo).is_demo)

    def test_seed_is_idempotent_and_reset_restores(self):
        call_command("seed_demo")
        demo = User.objects.get(username=DEMO_USERNAME)
        count = InventoryItem.objects.filter(user=demo).count()
        call_command("seed_demo")
        self.assertEqual(InventoryItem.objects.filter(user=demo).count(), count)
        InventoryItem.objects.filter(user=demo).delete()
        profile = get_profile(demo)
        profile.display_name = "rude words"
        profile.save()
        call_command("seed_demo", "--reset")
        self.assertEqual(InventoryItem.objects.filter(user=demo).count(), count)
        self.assertEqual(get_profile(demo).display_name, "Guest chef")

    def test_reset_does_not_touch_other_users(self):
        ann = User.objects.create_user("ann", password="x")
        InventoryItem.objects.create(user=ann, name="mine")
        call_command("seed_demo", "--reset")
        self.assertTrue(InventoryItem.objects.filter(user=ann, name="mine").exists())

    def test_demo_login_seeds_first_time(self):
        c = APIClient()
        c.post("/api/auth/demo/")
        demo = User.objects.get(username=DEMO_USERNAME)
        self.assertGreater(InventoryItem.objects.filter(user=demo).count(), 0)
        self.assertEqual(c.get("/api/recipes/suggestions/").status_code, 200)
        self.assertTrue(c.get("/api/recipes/suggestions/").json()["results"])
