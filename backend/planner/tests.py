from datetime import date
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from kitchen.models import InventoryItem
from planner.models import MealPlan, ShoppingListItem


@override_settings(SPOONACULAR_API_KEY="")
class PlanTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_week_view_has_seven_days_starting_monday(self):
        r = self.c.get("/api/plans/?week=2026-10-29")      # a Thursday
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["week_start"], "2026-10-26")
        self.assertEqual(len(body["days"]), 7)
        self.assertEqual(body["days"][6]["date"], "2026-11-01")

    def test_overflow_week_param_is_400(self):
        self.assertEqual(self.c.get("/api/plans/?week=9999-12-27").status_code, 400)

    def test_meals_ordered_breakfast_lunch_dinner(self):
        d = date(2026, 10, 27)
        for slot in ("dinner", "lunch", "breakfast"):
            MealPlan.objects.create(user=self.user, recipe_id=1, recipe_title=slot, planned_date=d, slot=slot)
        days = self.c.get("/api/plans/?week=2026-10-26").json()["days"]
        self.assertEqual([m["slot"] for m in days[1]["meals"]], ["breakfast", "lunch", "dinner"])

    def test_bad_week_param_is_400(self):
        self.assertEqual(self.c.get("/api/plans/?week=notadate").status_code, 400)

    def test_create_plan_uses_server_recipe_data(self):            # never trust client title
        r = self.c.post("/api/plans/", {"recipe_id": 716429, "planned_date": "2026-10-27",
                                         "slot": "lunch", "recipe_title": "HACKED"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["recipe_title"].startswith("Pasta with Garlic"))
        self.assertTrue(r.json()["description"])
        self.assertEqual(r.json()["slot"], "lunch")
        self.assertEqual(r.json()["added_to_shopping"], 0)

    def test_add_missing_creates_shopping_rows_without_duplicates(self):   # Review Focus 4
        InventoryItem.objects.create(user=self.user, name="garlic")
        ShoppingListItem.objects.create(user=self.user, ingredient_name="Scallions")
        payload = {"recipe_id": 716429, "planned_date": "2026-10-27", "add_missing": True}
        first = self.c.post("/api/plans/", payload, format="json").json()
        second = self.c.post("/api/plans/", payload, format="json").json()
        self.assertGreater(first["added_to_shopping"], 0)
        self.assertEqual(second["added_to_shopping"], 0)
        names = [n.lower() for n in ShoppingListItem.objects.filter(user=self.user)
                 .values_list("ingredient_name", flat=True)]
        self.assertEqual(len(names), len(set(names)))
        self.assertNotIn("garlic", names)
        self.assertTrue(ShoppingListItem.objects.filter(user=self.user, source="auto").exclude(aisle="").exists())

    def test_invalid_inputs(self):                                  # validate ids and dates
        for bad in ({"recipe_id": 0, "planned_date": "2026-10-27"},
                    {"recipe_id": 716429, "planned_date": "27/10/2026"},
                    {"recipe_id": 716429, "planned_date": "2026-10-27", "slot": "brunch"}):
            self.assertEqual(self.c.post("/api/plans/", bad, format="json").status_code, 400, bad)

    def test_recipe_id_above_int_limit_is_400(self):
        r = self.c.post("/api/plans/", {"recipe_id": 2147483648, "planned_date": "2026-10-27"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_unknown_recipe_is_404(self):                           # M2
        r = self.c.post("/api/plans/", {"recipe_id": 999999999, "planned_date": "2026-10-27"}, format="json")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()["error"]["code"], "not_found")
        self.assertEqual(MealPlan.objects.count(), 0)

    def test_unavailable_recipe_is_503(self):
        from recipes import spoonacular
        with mock.patch("recipes.services.spoonacular.information",
                        side_effect=spoonacular.SpoonacularUnavailable("down")):
            r = self.c.post("/api/plans/", {"recipe_id": 716429, "planned_date": "2026-10-27"}, format="json")
        self.assertEqual(r.status_code, 503)

    def test_long_image_url_is_kept_whole(self):                    # M1
        from recipes import spoonacular
        image = "https://img.example.com/" + "a" * 300 + ".jpg"
        info = spoonacular.information(716429).data
        info["image"] = image
        with mock.patch("recipes.services.spoonacular.information", return_value=spoonacular.Result(info)):
            r = self.c.post("/api/plans/", {"recipe_id": 716429, "planned_date": "2026-10-27"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(MealPlan.objects.get().recipe_image, image)

    def test_week_lists_only_own_plans(self):
        MealPlan.objects.create(user=self.other, recipe_id=1, recipe_title="Theirs", planned_date=date(2026, 10, 27))
        MealPlan.objects.create(user=self.user, recipe_id=1, recipe_title="Mine", planned_date=date(2026, 10, 27))
        days = self.c.get("/api/plans/?week=2026-10-26").json()["days"]
        self.assertEqual([m["recipe_title"] for m in days[1]["meals"]], ["Mine"])

    def test_move_and_delete_own_only(self):
        mine = MealPlan.objects.create(user=self.user, recipe_id=1, recipe_title="Mine", planned_date=date(2026, 10, 27))
        theirs = MealPlan.objects.create(user=self.other, recipe_id=1, recipe_title="T", planned_date=date(2026, 10, 27))
        r = self.c.patch(f"/api/plans/{mine.id}/", {"planned_date": "2026-10-28", "slot": "breakfast"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["planned_date"], "2026-10-28")
        self.assertEqual(self.c.delete(f"/api/plans/{theirs.id}/").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/plans/{mine.id}/").status_code, 204)


class ShoppingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_add_manual_item(self):
        r = self.c.post("/api/shopping/", {"ingredient_name": " Eggs ", "quantity": "6"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["ingredient_name"], "Eggs")
        self.assertEqual(r.json()["source"], "manual")

    def test_blank_item_rejected(self):                                    # fix/shoppinglist-blank-item
        r = self.c.post("/api/shopping/", {"ingredient_name": "   "}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ShoppingListItem.objects.count(), 0)

    def test_order_unchecked_first(self):
        ShoppingListItem.objects.create(user=self.user, ingredient_name="b", checked=True)
        ShoppingListItem.objects.create(user=self.user, ingredient_name="a", aisle="Produce")
        ShoppingListItem.objects.create(user=self.other, ingredient_name="theirs")
        names = [i["ingredient_name"] for i in self.c.get("/api/shopping/").json()]
        self.assertEqual(names, ["a", "b"])

    def test_check_off(self):
        item = ShoppingListItem.objects.create(user=self.user, ingredient_name="Milk")
        r = self.c.patch(f"/api/shopping/{item.id}/", {"checked": True}, format="json")
        self.assertTrue(r.json()["checked"])

    def test_move_to_inventory(self):
        item = ShoppingListItem.objects.create(user=self.user, ingredient_name="Milk", quantity="1 l")
        r = self.c.post(f"/api/shopping/{item.id}/to-inventory/",
                        {"category": "Fridge", "expiry_date": "2030-01-01"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["name"], "Milk")
        self.assertFalse(ShoppingListItem.objects.filter(id=item.id).exists())
        self.assertTrue(InventoryItem.objects.filter(user=self.user, name="Milk", quantity="1 l").exists())

    def test_move_to_inventory_bad_date_keeps_row(self):
        item = ShoppingListItem.objects.create(user=self.user, ingredient_name="Milk")
        r = self.c.post(f"/api/shopping/{item.id}/to-inventory/", {"expiry_date": "soon"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(ShoppingListItem.objects.filter(id=item.id).exists())

    def test_clear_checked(self):
        ShoppingListItem.objects.create(user=self.user, ingredient_name="a", checked=True)
        ShoppingListItem.objects.create(user=self.user, ingredient_name="b")
        ShoppingListItem.objects.create(user=self.other, ingredient_name="c", checked=True)
        self.assertEqual(self.c.post("/api/shopping/clear-checked/").json(), {"deleted": 1})
        self.assertEqual(ShoppingListItem.objects.count(), 2)

    def test_other_users_item_is_404(self):
        item = ShoppingListItem.objects.create(user=self.other, ingredient_name="x")
        self.assertEqual(self.c.patch(f"/api/shopping/{item.id}/", {"checked": True}, format="json").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/shopping/{item.id}/").status_code, 404)
        self.assertEqual(self.c.post(f"/api/shopping/{item.id}/to-inventory/", {}, format="json").status_code, 404)
