"""
Meal Hacker - QA accessibility tests (ACC-*).

Covers the small, safe fixes made in this branch: programmatic labels
(aria-label) on the form fields that previously only had a placeholder, and
the inventory expiry column no longer printing the literal "None".
"""
from datetime import date

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse

from core.models import InventoryItem


class FormLabelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("acc", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="acc", password="Str0ngPass!23")

    def test_inventory_form_fields_have_accessible_names(self):     # ACC-002
        html = self.c.get(reverse("inventory")).content.decode()
        for label in ('aria-label="Item name"', 'aria-label="Quantity"',
                      'aria-label="Category"', 'aria-label="Expiry date"'):
            self.assertIn(label, html)

    def test_shopping_list_form_fields_have_accessible_names(self): # ACC-002
        html = self.c.get(reverse("shoppinglist")).content.decode()
        self.assertIn('aria-label="Ingredient name"', html)
        self.assertIn('aria-label="Quantity"', html)

    def test_homepage_note_and_chat_fields_have_accessible_names(self):  # ACC-002
        html = self.c.get(reverse("homepage")).content.decode()
        self.assertIn('aria-label="Notes"', html)
        self.assertIn('aria-label="Ask the kitchen assistant"', html)


class InventoryDisplayTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("acc2", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="acc2", password="Str0ngPass!23")

    def test_item_without_expiry_does_not_show_the_word_none(self): # ACC / UI-008  (regression: MH-B012)
        InventoryItem.objects.create(user=self.user, name="Flour", category="Pantry")
        html = self.c.get(reverse("inventory")).content.decode()
        self.assertIn("Flour", html)
        self.assertNotIn("> None <", html)          # the old literal render
        self.assertIn("—", html)               # em dash placeholder

    def test_item_with_expiry_still_shows_the_date(self):
        InventoryItem.objects.create(user=self.user, name="Milk", category="Fridge",
                                     expiry_date=date(2026, 12, 1))
        html = self.c.get(reverse("inventory")).content.decode()
        self.assertIn("Dec. 1, 2026", html)
