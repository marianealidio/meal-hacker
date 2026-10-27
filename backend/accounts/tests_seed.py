from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.demo import DEMO_MAX_AGE, FAVOURITES, INVENTORY, PLANS, USED, seed_demo_data

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


@override_settings(SPOONACULAR_API_KEY="")
class LazyDemoResetTests(TestCase):                                      # I1
    def setUp(self):
        cache.clear()
        call_command("seed_demo")
        self.demo = User.objects.get(username=DEMO_USERNAME)
        self.full = len(INVENTORY) + len(USED)

    def set_seeded_at(self, value):
        p = get_profile(self.demo)
        p.demo_seeded_at = value
        p.save()

    def login(self):
        r = APIClient().post("/api/auth/demo/")
        self.assertEqual(r.status_code, 200)
        return r

    def test_seed_records_seeded_at(self):
        seeded = get_profile(self.demo).demo_seeded_at
        self.assertIsNotNone(seeded)
        self.assertLess(timezone.now() - seeded, timedelta(minutes=1))

    def test_fresh_seed_is_not_reset_on_login(self):
        InventoryItem.objects.create(user=self.demo, name="visitor added this")
        self.login()
        self.assertTrue(InventoryItem.objects.filter(user=self.demo, name="visitor added this").exists())

    def test_old_seed_is_reset_on_login(self):
        InventoryItem.objects.filter(user=self.demo).delete()
        InventoryItem.objects.create(user=self.demo, name="visitor added this")
        p = get_profile(self.demo)
        p.display_name = "rude words"
        p.save()
        self.set_seeded_at(timezone.now() - timedelta(hours=25))
        r = self.login()
        self.assertEqual(InventoryItem.objects.filter(user=self.demo).count(), self.full)
        self.assertFalse(InventoryItem.objects.filter(user=self.demo, name="visitor added this").exists())
        self.assertEqual(get_profile(self.demo).display_name, "Guest chef")
        self.assertEqual(r.json()["display_name"], "Guest chef")
        self.assertLess(timezone.now() - get_profile(self.demo).demo_seeded_at, timedelta(minutes=1))

    def test_missing_seeded_at_is_reset_on_login(self):
        InventoryItem.objects.create(user=self.demo, name="visitor added this")
        self.set_seeded_at(None)
        self.login()
        self.assertFalse(InventoryItem.objects.filter(user=self.demo, name="visitor added this").exists())

    def test_immediate_second_login_does_not_reset_again(self):
        self.set_seeded_at(timezone.now() - timedelta(hours=25))
        self.login()
        InventoryItem.objects.create(user=self.demo, name="visitor added this")
        self.login()
        self.assertTrue(InventoryItem.objects.filter(user=self.demo, name="visitor added this").exists())

    def test_lazy_reseed_rechecks_age_and_skips_lookups(self):
        # Another request reseeded after this one decided to: the lazy call must do nothing.
        InventoryItem.objects.create(user=self.demo, name="visitor added this")
        with mock.patch("recipes.spoonacular.information") as info:
            seed_demo_data(self.demo, reset=True, max_age=DEMO_MAX_AGE)
        info.assert_not_called()
        self.assertTrue(InventoryItem.objects.filter(user=self.demo, name="visitor added this").exists())

    def test_noop_seed_skips_recipe_lookups(self):
        with mock.patch("recipes.spoonacular.information") as info:
            call_command("seed_demo")
        info.assert_not_called()

    def test_forced_reset_ignores_age(self):
        InventoryItem.objects.create(user=self.demo, name="visitor added this")
        call_command("seed_demo", "--reset")
        self.assertFalse(InventoryItem.objects.filter(user=self.demo, name="visitor added this").exists())


@override_settings(SPOONACULAR_API_KEY="live-key")
class DemoSeedCacheTests(TestCase):
    def test_reset_prefers_expired_cache_over_network(self):
        from recipes import spoonacular
        from recipes.models import RecipeCache
        ids = {r for r, _, _ in PLANS} | set(FAVOURITES)

        def fake_get(url, params, timeout):
            rid = int(url.split("/")[-2])
            m = mock.Mock(status_code=200)
            m.raise_for_status.return_value = None
            m.json.return_value = {"id": rid, "title": f"Cached {rid}", "image": "", "summary": ""}
            return m

        with mock.patch("recipes.spoonacular.requests.get", side_effect=fake_get):
            for rid in ids:
                spoonacular.information(rid)
        RecipeCache.objects.update(expires_at=timezone.now() - timedelta(days=1))
        cache.clear()
        with mock.patch("recipes.spoonacular.requests.get") as g:
            call_command("seed_demo", "--reset")
        g.assert_not_called()
        demo = User.objects.get(username=DEMO_USERNAME)
        self.assertTrue(all(t.startswith("Cached ")
                            for t in FavouriteRecipe.objects.filter(user=demo).values_list("title", flat=True)))
