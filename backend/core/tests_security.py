"""
Meal Hacker - QA security / hardening tests (SEC-*) plus the notes/reminders
form (which stores free user text). Own file; no external API calls.
"""
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from django.urls import reverse
from django.conf import settings

from core.models import InventoryItem, Reminder


class RemindersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("rem", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="rem", password="Str0ngPass!23")

    def test_note_is_saved_and_shown_back(self):                    # notes persistence
        self.c.post(reverse("save_reminders"), {"note": "buy oat milk"})
        self.assertEqual(Reminder.objects.get(user=self.user).note, "buy oat milk")
        self.assertContains(self.c.get(reverse("homepage")), "buy oat milk")

    def test_note_can_be_updated(self):
        self.c.post(reverse("save_reminders"), {"note": "first"})
        self.c.post(reverse("save_reminders"), {"note": "second"})
        self.assertEqual(Reminder.objects.get(user=self.user).note, "second")
        self.assertEqual(Reminder.objects.filter(user=self.user).count(), 1)  # OneToOne

    def test_get_request_does_not_change_the_note(self):            # method guard
        Reminder.objects.create(user=self.user, note="keep me")
        self.c.get(reverse("save_reminders"))
        self.assertEqual(Reminder.objects.get(user=self.user).note, "keep me")

    def test_long_note_is_accepted(self):                          # EDGE-007 (TextField)
        big = "x" * 20000
        self.c.post(reverse("save_reminders"), {"note": big})
        self.assertEqual(len(Reminder.objects.get(user=self.user).note), 20000)

    def test_note_html_is_escaped_on_the_homepage(self):           # SEC-013 (notes)
        self.c.post(reverse("save_reminders"), {"note": "</textarea><script>alert(1)</script>"})
        r = self.c.get(reverse("homepage"))
        self.assertNotContains(r, "<script>alert(1)</script>", html=False)
        self.assertContains(r, "&lt;script&gt;")

    def test_notes_are_per_user(self):                             # isolation
        other = User.objects.create_user("rem_other", password="Str0ngPass!23")
        Reminder.objects.create(user=other, note="other-secret-note")
        self.c.post(reverse("save_reminders"), {"note": "mine"})
        r = self.c.get(reverse("homepage"))
        self.assertContains(r, "mine")
        self.assertNotContains(r, "other-secret-note")


class InjectionAndTamperingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("sec", password="Str0ngPass!23")
        self.other = User.objects.create_user("sec_other", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="sec", password="Str0ngPass!23")

    def test_sql_injection_string_in_item_name_is_stored_literally(self):   # SEC-014
        payload = "Rice'); DROP TABLE core_inventoryitem;--"
        self.c.post(reverse("inventory"), {"name": payload, "category": "Pantry"})
        # table still exists and the value round-trips unchanged
        item = InventoryItem.objects.get(user=self.user)
        self.assertEqual(item.name, payload)
        self.assertEqual(InventoryItem.objects.count(), 1)

    def test_search_query_with_sql_metacharacters_is_safe(self):    # SEC-014 (library filter)
        r = self.c.get(reverse("inventory"), {"q": "' OR '1'='1"})
        self.assertEqual(r.status_code, 200)

    def test_cannot_assign_item_to_another_user_via_post(self):     # SEC-016 (tampered POST)
        self.c.post(reverse("inventory"), {
            "name": "TamperTest", "category": "Fridge",
            "user": str(self.other.id), "user_id": str(self.other.id),
        })
        item = InventoryItem.objects.get(name="TamperTest")
        self.assertEqual(item.user, self.user)          # bound to request.user, not the POST field

    def test_cannot_delete_another_users_item_by_id(self):          # SEC-015 (object-id tampering)
        theirs = InventoryItem.objects.create(user=self.other, name="theirs")
        r = self.c.get(reverse("delete_item", kwargs={"item_id": theirs.id}))
        self.assertEqual(r.status_code, 404)
        self.assertTrue(InventoryItem.objects.filter(id=theirs.id).exists())

    def test_unicode_and_emoji_item_name_round_trips(self):         # EDGE-010 / EDGE-011
        for name in ["Crème brûlée", "Půl kila mouky", "🍅 tomato", "米"]:
            self.c.post(reverse("inventory"), {"name": name, "category": "Pantry"})
        stored = set(InventoryItem.objects.filter(user=self.user).values_list("name", flat=True))
        self.assertEqual(stored, {"Crème brûlée", "Půl kila mouky", "🍅 tomato", "米"})


class ConfigTests(TestCase):
    def test_debug_is_off_by_default(self):                        # SEC-019
        self.assertFalse(settings.DEBUG)

    def test_clickjacking_header_present(self):                    # SEC (X-Frame-Options)
        c = Client()
        User.objects.create_user("cfg", password="Str0ngPass!23")
        c.login(username="cfg", password="Str0ngPass!23")
        r = c.get(reverse("homepage"))
        self.assertIn("X-Frame-Options", r)

    @override_settings(DEBUG=True)
    def test_password_validators_are_configured(self):             # SEC (registration hardening)
        self.assertGreaterEqual(len(settings.AUTH_PASSWORD_VALIDATORS), 3)
