"""
Meal Hacker - QA functional / negative / boundary / security test suite.

Runs against Django's isolated test database (the real db.sqlite3 is never
touched). Every external HTTP call (Spoonacular / Groq) is mocked, so the
suite consumes no API credits.

Each test maps to a Test ID from the QA master plan. Tests marked
@expectedFailure document a real, currently-open defect (MH-B001..MH-B004):
they keep the suite green while recording the finding. Each corresponding
fix PR flips its @expectedFailure test into a normal passing assertion.
"""
from datetime import date, timedelta
from unittest import mock, expectedFailure

from django.test import TestCase, SimpleTestCase, Client, override_settings
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from core.models import InventoryItem, MealPlan, ShoppingListItem


# ---------------------------------------------------------------------------
# MODEL LOGIC - InventoryItem.expires_soon()
# ---------------------------------------------------------------------------
class ExpiresSoonTests(SimpleTestCase):
    """expires_soon() is True when expiry_date is today..+3 days, else False."""

    def test_no_expiry_date_is_not_soon(self):                       # INV-exp-01
        self.assertFalse(InventoryItem(name="Flour").expires_soon())

    def test_expiring_today_is_soon(self):                           # INV-exp-02
        self.assertTrue(InventoryItem(name="Milk", expiry_date=date.today()).expires_soon())

    def test_exactly_three_days_is_soon(self):                       # INV-exp-03 (boundary)
        self.assertTrue(InventoryItem(name="Yoghurt",
                        expiry_date=date.today() + timedelta(days=3)).expires_soon())

    def test_four_days_is_not_soon(self):                            # INV-exp-04 (boundary)
        self.assertFalse(InventoryItem(name="Cheese",
                         expiry_date=date.today() + timedelta(days=4)).expires_soon())

    def test_already_expired_is_still_soon(self):                    # INV-exp-05
        self.assertTrue(InventoryItem(name="Spinach",
                        expiry_date=date.today() - timedelta(days=2)).expires_soon())


# ---------------------------------------------------------------------------
# AUTH - registration / login / logout
# ---------------------------------------------------------------------------
class AuthTests(TestCase):
    def setUp(self):
        self.c = Client()
        User.objects.create_user("existing", "existing@example.com", "Str0ngPass!23")

    def test_valid_registration_creates_user_and_logs_in(self):      # AUTH-001
        r = self.c.post(reverse("signup"), {
            "username": "newuser",
            "password1": "Str0ngPass!23",
            "password2": "Str0ngPass!23",
        })
        self.assertRedirects(r, reverse("homepage"))
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_registration_password_mismatch_rejected(self):          # AUTH-001-D
        r = self.c.post(reverse("signup"), {
            "username": "mismatch", "password1": "Str0ngPass!23", "password2": "different!45",
        })
        self.assertEqual(r.status_code, 200)
        self.assertFalse(User.objects.filter(username="mismatch").exists())

    def test_registration_duplicate_username_rejected(self):         # AUTH-001-E
        r = self.c.post(reverse("signup"), {
            "username": "existing", "password1": "Str0ngPass!23", "password2": "Str0ngPass!23",
        })
        self.assertEqual(r.status_code, 200)
        self.assertEqual(User.objects.filter(username="existing").count(), 1)

    def test_registration_short_password_rejected(self):             # AUTH-001-H
        r = self.c.post(reverse("signup"), {
            "username": "shortpw", "password1": "ab1", "password2": "ab1",
        })
        self.assertEqual(r.status_code, 200)
        self.assertFalse(User.objects.filter(username="shortpw").exists())

    def test_registration_empty_username_rejected(self):             # AUTH-001-A
        r = self.c.post(reverse("signup"), {
            "username": "", "password1": "Str0ngPass!23", "password2": "Str0ngPass!23",
        })
        self.assertEqual(r.status_code, 200)
        self.assertEqual(User.objects.filter(username="").count(), 0)

    def test_valid_login(self):                                      # AUTH-002
        r = self.c.post(reverse("login"), {"username": "existing", "password": "Str0ngPass!23"})
        self.assertRedirects(r, reverse("homepage"))

    def test_login_wrong_password_rejected(self):                    # AUTH-002-A
        r = self.c.post(reverse("login"), {"username": "existing", "password": "wrong"})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("_auth_user_id", self.c.session)

    def test_login_unknown_user_rejected(self):                      # AUTH-002-B
        r = self.c.post(reverse("login"), {"username": "ghost", "password": "whatever123"})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("_auth_user_id", self.c.session)

    def test_login_both_fields_empty_rejected(self):                 # AUTH-002-E
        r = self.c.post(reverse("login"), {"username": "", "password": ""})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("_auth_user_id", self.c.session)

    def test_login_username_is_case_sensitive(self):                 # AUTH-002-F
        r = self.c.post(reverse("login"), {"username": "EXISTING", "password": "Str0ngPass!23"})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("_auth_user_id", self.c.session)

    def test_logout_clears_session_and_redirects_to_login(self):     # AUTH-003
        self.c.login(username="existing", password="Str0ngPass!23")
        r = self.c.get(reverse("logout"))
        self.assertRedirects(r, reverse("login"))
        self.assertNotIn("_auth_user_id", self.c.session)

    def test_dashboard_after_logout_redirects(self):                 # AUTH-003-B
        self.c.login(username="existing", password="Str0ngPass!23")
        self.c.get(reverse("logout"))
        r = self.c.get(reverse("homepage"))
        self.assertEqual(r.status_code, 302)
        self.assertIn("/login/", r["Location"])


# ---------------------------------------------------------------------------
# SEC - unauthenticated access is blocked on every protected view
# ---------------------------------------------------------------------------
class UnauthenticatedAccessTests(TestCase):
    def setUp(self):
        self.c = Client()

    def _assert_redirects_to_login(self, name):
        r = self.c.get(reverse(name))
        self.assertEqual(r.status_code, 302, f"{name} did not redirect")
        self.assertIn("/login/", r["Location"], f"{name} redirect target wrong")

    def test_homepage_requires_login(self):        self._assert_redirects_to_login("homepage")       # SEC-001
    def test_inventory_requires_login(self):       self._assert_redirects_to_login("inventory")      # SEC-002
    def test_library_requires_login(self):         self._assert_redirects_to_login("library")        # SEC-003
    def test_shoppinglist_requires_login(self):    self._assert_redirects_to_login("shoppinglist")   # SEC-004
    def test_calendar_requires_login(self):        self._assert_redirects_to_login("calendar")       # SEC-005a
    def test_generatedmeals_requires_login(self):  self._assert_redirects_to_login("generatedmeals") # SEC-005b
    def test_profile_requires_login(self):         self._assert_redirects_to_login("profile")        # SEC-005c
    def test_chatbot_requires_login(self):         self._assert_redirects_to_login("chatbot")        # SEC-005d


# ---------------------------------------------------------------------------
# SEC - cross-user data isolation
# ---------------------------------------------------------------------------
class UserIsolationTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", password="Str0ngPass!23")
        self.bob = User.objects.create_user("bob", password="Str0ngPass!23")
        self.bob_item = InventoryItem.objects.create(user=self.bob, name="bob-milk")
        self.bob_meal = MealPlan.objects.create(user=self.bob, recipe_id=1, recipe_title="Bob Stew",
                                                planned_date=date.today())
        self.bob_shop = ShoppingListItem.objects.create(user=self.bob, ingredient_name="bob-eggs")
        self.c = Client()
        self.c.login(username="alice", password="Str0ngPass!23")

    def test_alice_does_not_see_bobs_inventory(self):                # SEC-006 / INV-023
        self.assertNotContains(self.c.get(reverse("inventory")), "bob-milk")

    def test_alice_cannot_delete_bobs_inventory_item(self):          # SEC-008 / INV-025
        r = self.c.get(reverse("delete_item", kwargs={"item_id": self.bob_item.id}))
        self.assertEqual(r.status_code, 404)
        self.assertTrue(InventoryItem.objects.filter(id=self.bob_item.id).exists())

    def test_alice_cannot_delete_bobs_meal_plan(self):               # SEC / CAL isolation
        r = self.c.get(reverse("remove_meal", kwargs={"plan_id": self.bob_meal.id}))
        self.assertEqual(r.status_code, 404)
        self.assertTrue(MealPlan.objects.filter(id=self.bob_meal.id).exists())

    def test_alice_cannot_delete_bobs_shopping_item(self):           # SEC / SHOP-011
        r = self.c.get(reverse("delete_shopping_item", kwargs={"item_id": self.bob_shop.id}))
        self.assertEqual(r.status_code, 404)
        self.assertTrue(ShoppingListItem.objects.filter(id=self.bob_shop.id).exists())

    def test_alice_does_not_see_bobs_shopping_list(self):            # SHOP-011
        self.assertNotContains(self.c.get(reverse("shoppinglist")), "bob-eggs")


# ---------------------------------------------------------------------------
# INV - create / validate / persist
# ---------------------------------------------------------------------------
class InventoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("inv", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="inv", password="Str0ngPass!23")

    def test_add_valid_item(self):                                   # INV-001
        self.c.post(reverse("inventory"), {"name": "Carrots", "quantity": "3",
                                           "category": "Fridge", "expiry_date": "2026-12-01"})
        self.assertTrue(InventoryItem.objects.filter(user=self.user, name="Carrots").exists())

    def test_add_item_persists_after_reload(self):                   # INV-004
        self.c.post(reverse("inventory"), {"name": "Rice", "category": "Pantry"})
        self.assertContains(self.c.get(reverse("inventory")), "Rice")

    def test_empty_name_not_created(self):                           # INV-010
        self.c.post(reverse("inventory"), {"name": "", "category": "Fridge"})
        self.assertEqual(InventoryItem.objects.filter(user=self.user).count(), 0)

    def test_whitespace_only_name_not_created(self):                 # INV-011
        self.c.post(reverse("inventory"), {"name": "     ", "category": "Fridge"})
        self.assertEqual(InventoryItem.objects.filter(user=self.user).count(), 0)

    def test_delete_own_item(self):                                  # INV-003
        it = InventoryItem.objects.create(user=self.user, name="ToGo")
        self.c.get(reverse("delete_item", kwargs={"item_id": it.id}))
        self.assertFalse(InventoryItem.objects.filter(id=it.id).exists())

    def test_delete_nonexistent_item_404(self):                      # INV-022
        self.assertEqual(self.c.get(reverse("delete_item", kwargs={"item_id": 999999})).status_code, 404)

    def test_negative_quantity_is_accepted_as_text(self):            # INV-007 (documents weak validation)
        self.c.post(reverse("inventory"), {"name": "Sugar", "quantity": "-5", "category": "Pantry"})
        self.assertEqual(InventoryItem.objects.get(user=self.user, name="Sugar").quantity, "-5")

    def test_very_long_name_over_100_chars(self):                    # INV-012 (documents weak validation)
        self.c.post(reverse("inventory"), {"name": "x" * 300, "category": "Pantry"})
        obj = InventoryItem.objects.filter(user=self.user).first()
        self.assertIsNotNone(obj)
        self.assertEqual(len(obj.name), 300)   # max_length=100 is not enforced on write

    @expectedFailure
    def test_invalid_expiry_date_should_not_crash(self):             # INV-020 / VAL-005  -> MH-B002 (OPEN)
        """A non-date string in expiry_date is passed straight to .create(); Django's
        DateField raises ValidationError inside .save(); the view has no try/except,
        so the request returns an unhandled HTTP 500. Expected: no server error."""
        r = self.c.post(reverse("inventory"), {"name": "BadDate", "category": "Fridge",
                                               "expiry_date": "not-a-date"})
        self.assertIn(r.status_code, (200, 302))     # currently raises -> HTTP 500


# ---------------------------------------------------------------------------
# DASH / MEAL - external API mocked
# ---------------------------------------------------------------------------
def _fake_response(json_data, status=200):
    m = mock.Mock()
    m.json.return_value = json_data
    m.status_code = status
    m.raise_for_status.side_effect = None if status == 200 else Exception("HTTP %s" % status)
    return m


class DashboardTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("dash", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="dash", password="Str0ngPass!23")

    def test_dashboard_zero_ingredients_no_api_call(self):           # DASH-001
        with mock.patch("core.views.requests.get") as g:
            r = self.c.get(reverse("homepage"))
        self.assertEqual(r.status_code, 200)
        g.assert_not_called()

    def test_dashboard_three_ingredients_calls_api_and_shows_meal(self):  # DASH-009
        for n in ("egg", "flour", "milk"):
            InventoryItem.objects.create(user=self.user, name=n)
        payload = [{"id": 10, "title": "Pancakes", "image": "x.jpg",
                    "usedIngredientCount": 3, "missedIngredientCount": 0}]
        with mock.patch("core.views.requests.get", return_value=_fake_response(payload)):
            r = self.c.get(reverse("homepage"))
        self.assertContains(r, "Pancakes")

    def test_dashboard_api_failure_page_still_renders(self):         # DASH-011
        for n in ("egg", "flour", "milk"):
            InventoryItem.objects.create(user=self.user, name=n)
        with mock.patch("core.views.requests.get", side_effect=Exception("boom")):
            r = self.c.get(reverse("homepage"))
        self.assertEqual(r.status_code, 200)

    def test_dashboard_message_not_misleading_when_few_ingredients(self):  # MH-B001  (regression)
        """With <3 ingredients Spoonacular is never called. The homepage now shows
        only the 'add at least 3' guidance, not the recipe-service / limit text."""
        r = self.c.get(reverse("homepage"))
        self.assertContains(r, "at least 3")
        self.assertNotContains(r, "limit has been reached")

    def test_dashboard_message_mentions_service_when_enough_ingredients_but_no_meal(self):  # DASH-010
        for n in ("egg", "flour", "milk"):
            InventoryItem.objects.create(user=self.user, name=n)
        with mock.patch("core.views.requests.get", return_value=_fake_response([])):
            r = self.c.get(reverse("homepage"))
        self.assertContains(r, "limit has been reached")
        self.assertNotContains(r, "at least 3")


class MealGenerationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("meal", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="meal", password="Str0ngPass!23")

    def _add(self, *names):
        for n in names:
            InventoryItem.objects.create(user=self.user, name=n)

    def test_no_ingredients_shows_error(self):                       # MEAL-002
        self.assertContains(self.c.get(reverse("generatedmeals")), "at least 3 ingredients")

    def test_two_ingredients_shows_error(self):                      # MEAL-004 (boundary: <3)
        self._add("egg", "flour")
        self.assertContains(self.c.get(reverse("generatedmeals")), "at least 3 ingredients")

    def test_valid_response_returns_meals(self):                     # MEAL-006
        self._add("chicken", "rice", "onion", "garlic")
        payload = [
            {"id": 1, "title": "AlphaMeal", "usedIngredients": [1, 2, 3], "missedIngredients": []},
            {"id": 2, "title": "BetaMeal", "usedIngredients": [1, 2], "missedIngredients": [1]},
        ]
        with mock.patch("core.views.requests.get", return_value=_fake_response(payload)):
            r = self.c.get(reverse("generatedmeals"))
        self.assertContains(r, "AlphaMeal")
        self.assertContains(r, "BetaMeal")

    def test_api_http_error_shows_message_and_200(self):             # MEAL-008
        self._add("chicken", "rice", "onion")
        with mock.patch("core.views.requests.get", side_effect=Exception("500")):
            r = self.c.get(reverse("generatedmeals"))
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Could not load suggestions")

    def test_meals_filtered_to_two_plus_used_ingredients(self):      # MEAL-012/013 (business rule)
        self._add("chicken", "rice", "onion")
        payload = [
            {"id": 1, "title": "KeepMeal", "usedIngredients": [1, 2], "missedIngredients": []},
            {"id": 2, "title": "DropMeal", "usedIngredients": [1], "missedIngredients": [1]},
        ]
        with mock.patch("core.views.requests.get", return_value=_fake_response(payload)):
            r = self.c.get(reverse("generatedmeals"))
        self.assertContains(r, "KeepMeal")
        self.assertNotContains(r, "DropMeal")

    def test_ranking_more_used_ingredients_first(self):              # MEAL-015 (ranking correctness)
        self._add("chicken", "rice", "onion", "garlic", "pepper")
        payload = [
            {"id": 1, "title": "FewUsed", "usedIngredients": [1, 2], "missedIngredients": []},
            {"id": 2, "title": "ManyUsed", "usedIngredients": [1, 2, 3, 4], "missedIngredients": [1]},
            {"id": 3, "title": "MidUsed", "usedIngredients": [1, 2, 3], "missedIngredients": []},
        ]
        with mock.patch("core.views.requests.get", return_value=_fake_response(payload)):
            body = self.c.get(reverse("generatedmeals")).content.decode()
        self.assertLess(body.index("ManyUsed"), body.index("MidUsed"))
        self.assertLess(body.index("MidUsed"), body.index("FewUsed"))

    @expectedFailure
    def test_api_meal_missing_id_field_crashes_page(self):           # MEAL-011 / ERR-005 -> MH-B004 (OPEN)
        """A Spoonacular meal object with no 'id' makes generatedmeals.html render
        {% url 'recipe_detail' meal.id %} with an empty argument -> NoReverseMatch
        -> unhandled HTTP 500 (the view try/except does not wrap render()).
        Expected: the page degrades to 200 and shows the meal without a link."""
        self._add("chicken", "rice", "onion")
        payload = [{"title": "NoId", "usedIngredients": [1, 2], "missedIngredients": []}]
        with mock.patch("core.views.requests.get", return_value=_fake_response(payload)):
            r = self.c.get(reverse("generatedmeals"))
        self.assertEqual(r.status_code, 200)


# ---------------------------------------------------------------------------
# CAL - week / today calculation
# ---------------------------------------------------------------------------
class CalendarTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("cal", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="cal", password="Str0ngPass!23")

    def test_calendar_shows_seven_days_starting_monday(self):        # CAL-001/003
        r = self.c.get(reverse("calendar"))
        self.assertEqual(len(r.context["days"]), 7)
        self.assertEqual(r.context["days"][0]["date"].weekday(), 0)

    def test_planned_meal_appears_on_its_date(self):                 # CAL-007
        MealPlan.objects.create(user=self.user, recipe_id=5, recipe_title="PlannedThing",
                                planned_date=timezone.localdate())
        self.assertContains(self.c.get(reverse("calendar")), "PlannedThing")

    @override_settings(TIME_ZONE="Pacific/Kiritimati", USE_TZ=True)  # UTC+14
    @expectedFailure
    def test_today_uses_local_timezone_not_utc(self):               # CAL-002 -> MH-B003 (OPEN)
        """At 23:30 UTC it is already the next calendar day in Kiritimati (UTC+14).
        calendar() uses date.today() (process TZ forced to UTC by Django when
        USE_TZ=True), so it reports the UTC day. Expected: 'today' follows the
        configured local timezone."""
        from datetime import datetime, timezone as dt_tz
        fixed_now = datetime(2026, 9, 3, 23, 30, tzinfo=dt_tz.utc)
        with mock.patch("django.utils.timezone.now", return_value=fixed_now):
            r = self.c.get(reverse("calendar"))
        self.assertEqual(r.context["today"], date(2026, 9, 4))


# ---------------------------------------------------------------------------
# SHOP - shopping list
# ---------------------------------------------------------------------------
class ShoppingListTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("shop", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="shop", password="Str0ngPass!23")

    def test_add_item(self):                                         # SHOP-001
        self.c.post(reverse("shoppinglist"), {"add_item": "1", "ingredient_name": "Beans", "quantity": "2"})
        self.assertTrue(ShoppingListItem.objects.filter(user=self.user, ingredient_name="Beans").exists())

    def test_empty_item_still_created(self):                         # SHOP-006 (documents weak validation)
        self.c.post(reverse("shoppinglist"), {"add_item": "1", "ingredient_name": "   ", "quantity": ""})
        self.assertEqual(ShoppingListItem.objects.filter(user=self.user).count(), 1)
        self.assertEqual(ShoppingListItem.objects.get(user=self.user).ingredient_name, "")

    def test_delete_own_item(self):                                  # SHOP-003
        it = ShoppingListItem.objects.create(user=self.user, ingredient_name="Gone")
        self.c.get(reverse("delete_shopping_item", kwargs={"item_id": it.id}))
        self.assertFalse(ShoppingListItem.objects.filter(id=it.id).exists())


# ---------------------------------------------------------------------------
# SEC - CSRF and XSS
# ---------------------------------------------------------------------------
class CsrfTests(TestCase):
    def test_login_post_without_csrf_is_403(self):                   # SEC-010
        c = Client(enforce_csrf_checks=True)
        self.assertEqual(c.post(reverse("login"), {"username": "x", "password": "y"}).status_code, 403)


class XssTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("xss", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="xss", password="Str0ngPass!23")

    def test_inventory_name_script_is_escaped(self):                 # SEC-011
        InventoryItem.objects.create(user=self.user, name="<script>alert(1)</script>",
                                     category="Fridge", expiry_date=date.today())
        r = self.c.get(reverse("inventory"))
        self.assertNotContains(r, "<script>alert(1)</script>", html=False)
        self.assertContains(r, "&lt;script&gt;")
