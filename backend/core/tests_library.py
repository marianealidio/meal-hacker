"""
Meal Hacker - QA tests for the recipe Library page (LIB-*).

Kept in its own file so it composes cleanly with core/tests.py and other
feature branches. Spoonacular complexSearch is fully mocked - no API credits.
"""
from unittest import mock

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse

from core.models import InventoryItem


def _fake_search(results, status=200):
    m = mock.Mock()
    m.status_code = status
    m.raise_for_status.side_effect = None if status == 200 else Exception("HTTP %s" % status)
    m.json.return_value = {"results": results}
    return m


class LibraryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("lib", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="lib", password="Str0ngPass!23")

    def test_empty_library_renders_no_error(self):                   # LIB-001
        with mock.patch("core.views.requests.get", return_value=_fake_search([])):
            r = self.c.get(reverse("library"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(list(r.context["recipes"]), [])
        self.assertIsNone(r.context["error"])

    def test_valid_response_lists_recipes(self):                     # LIB-002 / LIB-006
        payload = [{"id": 1, "title": "Tomato Soup", "extendedIngredients": [{"name": "Tomato"}]},
                   {"id": 2, "title": "Rice Bowl", "extendedIngredients": [{"name": "Rice"}]}]
        with mock.patch("core.views.requests.get", return_value=_fake_search(payload)):
            r = self.c.get(reverse("library"))
        self.assertContains(r, "Tomato Soup")
        self.assertContains(r, "Rice Bowl")

    def test_have_and_missing_split_by_user_inventory(self):         # LIB (business rule)
        InventoryItem.objects.create(user=self.user, name="Tomato")
        payload = [{"id": 1, "title": "Soup",
                    "extendedIngredients": [{"name": "Tomato"}, {"name": "Basil"}]}]
        with mock.patch("core.views.requests.get", return_value=_fake_search(payload)):
            r = self.c.get(reverse("library"))
        recipe = r.context["recipes"][0]
        self.assertEqual([i["name"] for i in recipe["have"]], ["Tomato"])
        self.assertEqual([i["name"] for i in recipe["missing"]], ["Basil"])

    def test_library_only_uses_own_inventory(self):                 # LIB-008 (isolation)
        other = User.objects.create_user("lib_other", password="Str0ngPass!23")
        InventoryItem.objects.create(user=other, name="Tomato")
        payload = [{"id": 1, "title": "Soup", "extendedIngredients": [{"name": "Tomato"}]}]
        with mock.patch("core.views.requests.get", return_value=_fake_search(payload)):
            r = self.c.get(reverse("library"))
        self.assertEqual(r.context["recipes"][0]["have"], [])   # this user has no Tomato

    def test_api_error_shows_message_and_200(self):                  # LIB / ERR-003
        with mock.patch("core.views.requests.get", side_effect=Exception("boom")):
            r = self.c.get(reverse("library"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Could not load")

    def test_filter_params_are_forwarded_to_the_api(self):           # LIB (filter plumbing)
        with mock.patch("core.views.requests.get", return_value=_fake_search([])) as g:
            self.c.get(reverse("library"), {"cuisine": "Italian", "diet": "vegan", "query": "pasta"})
        sent = g.call_args.kwargs["params"]
        self.assertEqual(sent.get("cuisine"), "Italian")
        self.assertEqual(sent.get("diet"), "vegan")
        self.assertEqual(sent.get("query"), "pasta")

    def test_ingredient_without_name_does_not_crash(self):           # LIB-malformed / ERR-005  (regression: MH-B006)
        """A Spoonacular ingredient object with no 'name' key used to raise
        KeyError from the have/missing list comprehensions (which sit outside
        the view's try/except) and 500 the page. The view now reads
        i.get('name'), so a partial ingredient is tolerated."""
        payload = [{"id": 1, "title": "Odd Recipe",
                    "extendedIngredients": [{"amount": 2}, {"name": "Salt"}]}]
        with mock.patch("core.views.requests.get", return_value=_fake_search(payload)):
            r = self.c.get(reverse("library"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Odd Recipe")
