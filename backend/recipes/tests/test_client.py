from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from recipes import spoonacular
from recipes.models import RecipeCache


def fake_response(payload, status=200):
    m = mock.Mock()
    m.status_code = status
    m.json.return_value = payload
    if status >= 400:
        import requests
        m.raise_for_status.side_effect = requests.HTTPError(f"{status}")
    else:
        m.raise_for_status.return_value = None
    return m


@override_settings(SPOONACULAR_API_KEY="test-key")
class LiveClientTests(TestCase):
    def test_search_calls_api_once_then_uses_cache(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": [{"id": 1}]})) as g:
            r1 = spoonacular.search({"query": "pasta"})
            r2 = spoonacular.search({"query": "pasta"})
        self.assertEqual(g.call_count, 1)
        self.assertEqual(r1.data, [{"id": 1}])
        self.assertEqual(r2.data, [{"id": 1}])
        self.assertFalse(r2.stale)
        params = g.call_args.kwargs["params"]
        self.assertEqual(params["apiKey"], "test-key")
        self.assertTrue(params["addRecipeInformation"])

    def test_cache_key_ignores_param_order_and_api_key(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": []})) as g:
            spoonacular.search({"query": "a", "diet": "vegan"})
            spoonacular.search({"diet": "vegan", "query": "a"})
        self.assertEqual(g.call_count, 1)
        self.assertNotIn("test-key", RecipeCache.objects.get().key)

    def test_expired_cache_refetches(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": [{"id": 1}]})) as g:
            spoonacular.search({"query": "x"})
            RecipeCache.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
            spoonacular.search({"query": "x"})
        self.assertEqual(g.call_count, 2)

    def test_quota_error_serves_stale_cache(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": [{"id": 7}]})):
            spoonacular.search({"query": "y"})
        RecipeCache.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({}, status=402)):
            r = spoonacular.search({"query": "y"})
        self.assertTrue(r.stale)
        self.assertEqual(r.data, [{"id": 7}])

    def test_stale_serve_logs_warning(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": []})):
            spoonacular.search({"query": "z"})
        RecipeCache.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({}, status=402)):
            with self.assertLogs("recipes.spoonacular", level="WARNING"):
                spoonacular.search({"query": "z"})

    def test_failure_without_cache_raises_unavailable(self):
        import requests
        with mock.patch("recipes.spoonacular.requests.get", side_effect=requests.ConnectionError()):
            with self.assertRaises(spoonacular.SpoonacularUnavailable):
                spoonacular.information(42)

    def test_404_without_cache_raises_not_found(self):                  # M2
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({}, status=404)):
            with self.assertRaises(spoonacular.RecipeNotFound):
                spoonacular.information(42)
        self.assertFalse(issubclass(spoonacular.RecipeNotFound, spoonacular.SpoonacularUnavailable))

    def test_404_with_stale_cache_serves_stale(self):
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({"id": 42})):
            spoonacular.information(42)
        RecipeCache.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({}, status=404)):
            r = spoonacular.information(42)
        self.assertTrue(r.stale)

    def test_find_by_ingredients_params_and_cache(self):                # I3
        found = [{"id": 1, "usedIngredients": [], "missedIngredients": []}]
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response(found)) as g:
            r1 = spoonacular.find_by_ingredients(["garlic", "onion"], number=10)
            r2 = spoonacular.find_by_ingredients(["garlic", "onion"], number=10)
        self.assertEqual(g.call_count, 1)
        self.assertEqual(r1.data, found)
        self.assertEqual(r2.data, found)
        self.assertTrue(g.call_args.args[0].endswith("/recipes/findByIngredients"))
        params = g.call_args.kwargs["params"]
        self.assertEqual((params["ingredients"], params["ranking"], params["ignorePantry"], params["number"]),
                         ("garlic,onion", 1, True, 10))
        entry = RecipeCache.objects.get()
        self.assertLessEqual(entry.expires_at - entry.fetched_at, timedelta(hours=24))

    def test_information_bulk_params_and_ttl(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response([{"id": 1}, {"id": 2}])) as g:
            r = spoonacular.information_bulk([1, 2])
        self.assertEqual([x["id"] for x in r.data], [1, 2])
        self.assertTrue(g.call_args.args[0].endswith("/recipes/informationBulk"))
        params = g.call_args.kwargs["params"]
        self.assertEqual(params["ids"], "1,2")
        self.assertFalse(params["includeNutrition"])
        entry = RecipeCache.objects.get()
        self.assertGreater(entry.expires_at - entry.fetched_at, timedelta(days=6))

    def test_information_bulk_empty_ids_skips_network(self):
        with mock.patch("recipes.spoonacular.requests.get") as g:
            self.assertEqual(spoonacular.information_bulk([]).data, [])
        g.assert_not_called()

    def test_cached_information_ignores_expiry_and_never_fetches(self):  # I1
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({"id": 42, "title": "T"})):
            spoonacular.information(42)
        RecipeCache.objects.update(expires_at=timezone.now() - timedelta(days=30))
        with mock.patch("recipes.spoonacular.requests.get") as g:
            self.assertEqual(spoonacular.cached_information(42)["title"], "T")
            self.assertIsNone(spoonacular.cached_information(43))
        g.assert_not_called()

    def test_information_uses_detail_ttl(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"id": 42, "title": "T"})):
            r = spoonacular.information(42)
        self.assertEqual(r.data["id"], 42)
        entry = RecipeCache.objects.get()
        self.assertGreater(entry.expires_at - entry.fetched_at, timedelta(days=6))


@override_settings(SPOONACULAR_API_KEY="")
class OfflineClientTests(TestCase):
    def test_offline_never_calls_network(self):
        with mock.patch("recipes.spoonacular.requests.get") as g:
            r = spoonacular.search({"query": ""})
            self.assertTrue(spoonacular.is_offline())
        g.assert_not_called()
        self.assertGreaterEqual(len(r.data), 8)
        self.assertTrue(all(x.get("summary") for x in r.data))

    def test_offline_search_filters_by_query_and_ingredients(self):
        r = spoonacular.search({"query": "soup"})
        self.assertTrue(r.data)
        self.assertTrue(all("soup" in x["title"].lower() for x in r.data))
        r2 = spoonacular.search({"includeIngredients": "garlic", "sort": "max-used-ingredients"})
        self.assertTrue(r2.data)
        self.assertTrue(all(any(i["name"] == "garlic" for i in x["usedIngredients"]) for x in r2.data))

    def test_offline_demo_inventory_finds_spinach_recipes(self):
        r = spoonacular.search({"includeIngredients": "spinach,garlic,onion", "sort": "max-used-ingredients"})
        self.assertGreaterEqual(len(r.data), 3)
        self.assertTrue(any(i["name"] == "spinach" for x in r.data for i in x["usedIngredients"]))

    def test_offline_results_are_copies(self):
        spoonacular.search({}).data[0]["title"] = "mutated"
        spoonacular.search({"includeIngredients": "garlic"}).data[0]["extendedIngredients"].clear()
        first_id = spoonacular.search({}).data[0]["id"]
        info = spoonacular.information(first_id).data
        info["title"] = "mutated"
        info["extendedIngredients"].clear()
        again = spoonacular.information(first_id).data
        self.assertNotEqual(again["title"], "mutated")
        self.assertTrue(again["extendedIngredients"])
        self.assertNotEqual(spoonacular.search({}).data[0]["title"], "mutated")

    def test_offline_information_by_id_and_unknown(self):
        first = spoonacular.search({}).data[0]
        self.assertEqual(spoonacular.information(first["id"]).data["id"], first["id"])
        with self.assertRaises(spoonacular.RecipeNotFound):
            spoonacular.information(999999999)

    def test_offline_find_by_ingredients_shape_and_order(self):         # I3
        r = spoonacular.find_by_ingredients(["spinach", "garlic", "onion"])
        self.assertTrue(r.data)
        for x in r.data:
            for key in ("id", "title", "image", "usedIngredients", "missedIngredients",
                        "usedIngredientCount", "missedIngredientCount"):
                self.assertIn(key, x)
            self.assertNotIn("summary", x)
            self.assertGreater(x["usedIngredientCount"], 0)
        order = [(-x["usedIngredientCount"], x["missedIngredientCount"]) for x in r.data]
        self.assertEqual(order, sorted(order))
        self.assertLessEqual(len(spoonacular.find_by_ingredients(["garlic"], number=2).data), 2)

    def test_offline_information_bulk_skips_unknown(self):
        first = spoonacular.search({}).data[0]["id"]
        r = spoonacular.information_bulk([first, 999999999])
        self.assertEqual([x["id"] for x in r.data], [first])
        r.data[0]["title"] = "mutated"
        self.assertNotEqual(spoonacular.information_bulk([first]).data[0]["title"], "mutated")
