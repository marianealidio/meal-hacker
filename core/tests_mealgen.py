"""
Meal Hacker - QA tests for generatedmeals() ingredient filtering, API
plumbing, ranking and error handling (MEAL-*). Spoonacular fully mocked.
Own file so it composes with core/tests.py and other branches.
"""
from unittest import mock

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse

from core.models import InventoryItem


def _resp(json_data, status=200):
    m = mock.Mock()
    m.status_code = status
    m.raise_for_status.side_effect = None if status == 200 else Exception("HTTP %s" % status)
    m.json.return_value = json_data
    return m


def _meal(title, used, missed=0, mid=None):
    return {
        "id": mid if mid is not None else abs(hash(title)) % 100000,
        "title": title,
        "usedIngredients": [{"name": "x"}] * used,
        "missedIngredients": [{"name": "y"}] * missed,
    }


class MealGenIngredientFilterTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("mg", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="mg", password="Str0ngPass!23")

    def _add(self, *names):
        for n in names:
            InventoryItem.objects.create(user=self.user, name=n)

    def test_fewer_than_three_items_shows_the_inventory_error(self):     # MEAL-002
        self._add("egg", "flour")
        self.assertContains(self.c.get(reverse("generatedmeals")), "at least 3 ingredients")

    def test_three_items_but_two_are_pantry_shows_main_ingredient_error(self):  # MEAL-004 boundary
        self._add("water", "salt", "chicken")          # only "chicken" survives the pantry filter
        r = self.c.get(reverse("generatedmeals"))
        self.assertContains(r, "Add more main ingredients")

    def test_water_salt_pepper_are_excluded_from_the_api_call(self):     # MEAL-018 / business rule
        self._add("Water", "SALT", "Pepper", "chicken", "rice", "onion")
        with mock.patch("core.views.requests.get", return_value=_resp([])) as g:
            self.c.get(reverse("generatedmeals"))
        sent = g.call_args.kwargs["params"]["ingredients"].lower()
        for pantry in ("water", "salt", "pepper"):
            self.assertNotIn(pantry, sent.split(","))
        for keep in ("chicken", "rice", "onion"):
            self.assertIn(keep, sent.split(","))

    def test_api_is_called_with_expected_query_params(self):            # MEAL-006 plumbing
        self._add("chicken", "rice", "onion")
        with mock.patch("core.views.requests.get", return_value=_resp([])) as g:
            self.c.get(reverse("generatedmeals"))
        p = g.call_args.kwargs["params"]
        self.assertEqual(p["number"], 10)
        self.assertEqual(p["ranking"], 1)
        self.assertTrue(p["ignorePantry"])

    def test_empty_api_response_shows_no_meals_message(self):           # MEAL-007
        self._add("chicken", "rice", "onion")
        with mock.patch("core.views.requests.get", return_value=_resp([])):
            r = self.c.get(reverse("generatedmeals"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "No Meals found")

    def test_at_most_three_meals_are_shown(self):                       # MEAL-016
        self._add("chicken", "rice", "onion")
        payload = [_meal(f"Meal{i}", used=3, missed=0, mid=i) for i in range(10)]
        with mock.patch("core.views.requests.get", return_value=_resp(payload)):
            r = self.c.get(reverse("generatedmeals"))
        self.assertEqual(len(r.context["meals"]), 3)

    def test_meals_with_fewer_than_two_used_ingredients_are_dropped(self):  # MEAL-012
        self._add("chicken", "rice", "onion")
        payload = [_meal("Keep", used=2, mid=1), _meal("Drop", used=1, mid=2)]
        with mock.patch("core.views.requests.get", return_value=_resp(payload)):
            r = self.c.get(reverse("generatedmeals"))
        self.assertContains(r, "Keep")
        self.assertNotContains(r, "Drop")

    def test_ranking_more_used_then_fewer_missed(self):                 # MEAL-015 + tie-break
        self._add("chicken", "rice", "onion", "garlic")
        payload = [
            _meal("A_used2_miss0", used=2, missed=0, mid=1),
            _meal("B_used3_miss5", used=3, missed=5, mid=2),
            _meal("C_used3_miss1", used=3, missed=1, mid=3),
        ]
        with mock.patch("core.views.requests.get", return_value=_resp(payload)):
            body = self.c.get(reverse("generatedmeals")).content.decode()
        self.assertLess(body.index("C_used3_miss1"), body.index("B_used3_miss5"))   # tie on used -> fewer missed first
        self.assertLess(body.index("B_used3_miss5"), body.index("A_used2_miss0"))   # more used first

    def test_garbage_api_body_does_not_500(self):                      # MEAL-010 / ERR-005
        self._add("chicken", "rice", "onion")
        with mock.patch("core.views.requests.get", return_value=_resp({"unexpected": "dict"})):
            r = self.c.get(reverse("generatedmeals"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Could not load suggestions")

    def test_http_error_shows_credit_limit_message(self):              # MEAL-008
        self._add("chicken", "rice", "onion")
        with mock.patch("core.views.requests.get", return_value=_resp([], status=429)):
            r = self.c.get(reverse("generatedmeals"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "credit limit")

    def test_duplicate_inventory_names_are_passed_through(self):        # MEAL-017 (documents behaviour)
        self._add("chicken", "chicken", "rice")
        with mock.patch("core.views.requests.get", return_value=_resp([])) as g:
            self.c.get(reverse("generatedmeals"))
        # the view does not de-duplicate; Spoonacular tolerates repeats
        self.assertEqual(g.call_args.kwargs["params"]["ingredients"].count("chicken"), 2)
