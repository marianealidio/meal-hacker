"""
Meal Hacker - QA tests for the manual Shopping List (SHOP-*).
Own file so it composes with core/tests.py and other feature branches.
"""
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse

from core.models import ShoppingListItem


class ShoppingListTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("shop2", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="shop2", password="Str0ngPass!23")

    def _add(self, name, quantity=""):
        return self.c.post(reverse("shoppinglist"),
                           {"add_item": "1", "ingredient_name": name, "quantity": quantity})

    def test_add_valid_item(self):                                  # SHOP-001
        r = self._add("Olive oil", "1 bottle")
        self.assertRedirects(r, reverse("shoppinglist"))
        item = ShoppingListItem.objects.get(user=self.user)
        self.assertEqual(item.ingredient_name, "Olive oil")
        self.assertEqual(item.quantity, "1 bottle")
        self.assertEqual(item.source, "manual")

    def test_item_persists_after_reload(self):                      # SHOP-010
        self._add("Rice")
        self.assertContains(self.c.get(reverse("shoppinglist")), "Rice")

    def test_blank_name_is_not_stored(self):                        # SHOP-006  (regression: MH-B010)
        self._add("")
        self.assertEqual(ShoppingListItem.objects.filter(user=self.user).count(), 0)

    def test_whitespace_only_name_is_not_stored(self):              # SHOP-006  (regression: MH-B010)
        self._add("     ")
        self.assertEqual(ShoppingListItem.objects.filter(user=self.user).count(), 0)

    def test_name_is_trimmed_before_saving(self):                   # SHOP-003 / VAL-003
        self._add("  Bananas  ", "  ")
        self.assertEqual(ShoppingListItem.objects.get(user=self.user).ingredient_name, "Bananas")

    def test_delete_own_item(self):                                 # SHOP-003
        it = ShoppingListItem.objects.create(user=self.user, ingredient_name="Gone")
        self.c.get(reverse("delete_shopping_item", kwargs={"item_id": it.id}))
        self.assertFalse(ShoppingListItem.objects.filter(id=it.id).exists())

    def test_cannot_delete_another_users_item(self):                # SHOP-011 / SEC
        other = User.objects.create_user("shop2_other", password="Str0ngPass!23")
        it = ShoppingListItem.objects.create(user=other, ingredient_name="theirs")
        r = self.c.get(reverse("delete_shopping_item", kwargs={"item_id": it.id}))
        self.assertEqual(r.status_code, 404)
        self.assertTrue(ShoppingListItem.objects.filter(id=it.id).exists())

    def test_delete_nonexistent_item_404(self):                     # SHOP-003 negative
        self.assertEqual(
            self.c.get(reverse("delete_shopping_item", kwargs={"item_id": 999999})).status_code, 404)

    def test_list_only_shows_own_items(self):                       # SHOP-011
        other = User.objects.create_user("shop2_o2", password="Str0ngPass!23")
        ShoppingListItem.objects.create(user=other, ingredient_name="not-mine-xyz")
        self._add("mine-abc")
        r = self.c.get(reverse("shoppinglist"))
        self.assertContains(r, "mine-abc")
        self.assertNotContains(r, "not-mine-xyz")

    def test_ingredient_name_with_script_is_escaped(self):          # SHOP-008 / SEC-012
        self._add("<script>alert(1)</script>")
        r = self.c.get(reverse("shoppinglist"))
        self.assertNotContains(r, "<script>alert(1)</script>", html=False)
        self.assertContains(r, "&lt;script&gt;")

    def test_long_name_is_accepted_without_error(self):             # SHOP-007 / EDGE-007 (documents weak validation)
        self._add("x" * 300)
        obj = ShoppingListItem.objects.get(user=self.user)
        self.assertEqual(len(obj.ingredient_name), 300)   # CharField max_length=100 not enforced on write
