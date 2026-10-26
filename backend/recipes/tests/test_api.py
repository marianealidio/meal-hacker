from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from kitchen.models import InventoryItem
from recipes import spoonacular
from recipes.models import FavouriteRecipe


def add(user, *names, expiry_days=None):
    for n in names:
        InventoryItem.objects.create(
            user=user, name=n,
            expiry_date=(timezone.localdate() + timedelta(days=expiry_days)) if expiry_days is not None else None)


@override_settings(SPOONACULAR_API_KEY="")
class SuggestionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_requires_three_items(self):                                  # MEAL-001
        add(self.user, "garlic", "onion")
        r = self.c.get("/api/recipes/suggestions/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"results": [], "reason": "need_more_ingredients"})

    def test_results_have_description_and_counts(self):
        add(self.user, "garlic", "onion", "tomato", "rice")
        body = self.c.get("/api/recipes/suggestions/").json()
        self.assertIsNone(body["reason"])
        self.assertGreater(len(body["results"]), 0)
        first = body["results"][0]
        for key in ("id", "title", "image", "description", "ready_in_minutes", "used", "missing",
                    "uses_expiring", "is_favourite"):
            self.assertIn(key, first)
        self.assertTrue(first["description"])
        self.assertTrue(all(len(r["used"]) >= 2 for r in body["results"]))   # MEAL-filter >=2 used

    def test_pantry_staples_ignored(self):                                # MEAL ignore water/salt/pepper
        add(self.user, "water", "salt", "pepper")
        self.assertEqual(self.c.get("/api/recipes/suggestions/").json()["reason"], "need_more_ingredients")

    def test_expiring_ingredients_rank_first(self):                       # "use it up"
        add(self.user, "rice", "onion", "tomato")
        add(self.user, "spinach", "garlic", expiry_days=1)
        results = self.c.get("/api/recipes/suggestions/").json()["results"]
        self.assertTrue(results[0]["uses_expiring"])
        flags = [bool(r["uses_expiring"]) for r in results]
        self.assertEqual(flags, sorted(flags, reverse=True))

    def test_profile_diet_and_intolerances_sent_to_search(self):
        p = self.user.profile
        p.diet, p.intolerances = "vegan", ["gluten", "soy"]
        p.save()
        add(self.user, "garlic", "onion", "tomato")
        with mock.patch("recipes.services.spoonacular.search",
                        return_value=spoonacular.Result([])) as s:
            self.c.get("/api/recipes/suggestions/")
        params = s.call_args.args[0]
        self.assertEqual(params["diet"], "vegan")
        self.assertEqual(params["intolerances"], "gluten,soy")
        self.assertEqual(params["sort"], "max-used-ingredients")

    def test_unavailable_returns_503_envelope(self):                      # MEAL error path
        add(self.user, "garlic", "onion", "tomato")
        with mock.patch("recipes.services.spoonacular.search",
                        side_effect=spoonacular.SpoonacularUnavailable("down")):
            r = self.c.get("/api/recipes/suggestions/")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["error"]["code"], "recipes_unavailable")

    def test_stale_header(self):
        add(self.user, "garlic", "onion", "tomato")
        with mock.patch("recipes.services.spoonacular.search",
                        return_value=spoonacular.Result([], stale=True)):
            r = self.c.get("/api/recipes/suggestions/")
        self.assertEqual(r["X-Stale"], "true")


@override_settings(SPOONACULAR_API_KEY="")
class SearchAndDetailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_search_query_filter(self):
        r = self.c.get("/api/recipes/search/?q=soup")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["results"])
        self.assertTrue(all("soup" in x["title"].lower() for x in r.json()["results"]))

    def test_search_matches_kitchen_uses_inventory(self):
        add(self.user, "garlic")
        with mock.patch("recipes.services.spoonacular.search", return_value=spoonacular.Result([])) as s:
            self.c.get("/api/recipes/search/?matches_kitchen=1")
        self.assertIn("garlic", s.call_args.args[0]["includeIngredients"])

    def test_detail_have_missing(self):                                   # RD-*
        add(self.user, "garlic")
        r = self.c.get("/api/recipes/716429/")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["steps"])
        self.assertTrue(any(i["have"] for i in body["ingredients"]))
        self.assertFalse(body["is_favourite"])

    def test_detail_unknown_is_503_envelope(self):                        # fix/recipe-link-guard
        r = self.c.get("/api/recipes/123456789/")
        self.assertEqual(r.status_code, 503)
        self.assertIn("error", r.json())

    def test_detail_zero_id_is_404(self):
        self.assertEqual(self.c.get("/api/recipes/0/").status_code, 404)


@override_settings(SPOONACULAR_API_KEY="")
class FavouriteTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_add_list_remove(self):
        r = self.c.post("/api/favourites/", {"recipe_id": 716429}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["title"].startswith("Pasta with Garlic"))
        self.assertTrue(r.json()["description"])
        self.assertEqual(len(self.c.get("/api/favourites/").json()), 1)
        self.assertTrue(self.c.get("/api/recipes/716429/").json()["is_favourite"])
        self.assertEqual(self.c.delete("/api/favourites/716429/").status_code, 204)
        self.assertEqual(self.c.get("/api/favourites/").json(), [])

    def test_add_twice_is_idempotent(self):
        self.c.post("/api/favourites/", {"recipe_id": 716429}, format="json")
        r = self.c.post("/api/favourites/", {"recipe_id": 716429}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(FavouriteRecipe.objects.filter(user=self.user).count(), 1)

    def test_invalid_recipe_id(self):
        r = self.c.post("/api/favourites/", {"recipe_id": -5}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_cannot_see_or_delete_others(self):
        FavouriteRecipe.objects.create(user=self.other, recipe_id=716429, title="t")
        self.assertEqual(self.c.get("/api/favourites/").json(), [])
        self.assertEqual(self.c.delete("/api/favourites/716429/").status_code, 404)
        self.assertEqual(FavouriteRecipe.objects.count(), 1)
