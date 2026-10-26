from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from kitchen.models import InventoryItem, Note


class InventoryModelTests(TestCase):
    def test_expires_soon_boundaries(self):                              # INV-exp-01..05
        today = timezone.localdate()
        self.assertFalse(InventoryItem(name="Flour").expires_soon())
        self.assertTrue(InventoryItem(name="a", expiry_date=today).expires_soon())
        self.assertTrue(InventoryItem(name="a", expiry_date=today + timedelta(days=3)).expires_soon())
        self.assertFalse(InventoryItem(name="a", expiry_date=today + timedelta(days=4)).expires_soon())
        self.assertTrue(InventoryItem(name="a", expiry_date=today - timedelta(days=2)).expires_soon())

    def test_days_left(self):
        today = timezone.localdate()
        self.assertIsNone(InventoryItem(name="a").days_left())
        self.assertEqual(InventoryItem(name="a", expiry_date=today + timedelta(days=2)).days_left(), 2)


class InventoryApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_requires_login(self):
        self.assertIn(APIClient().get("/api/inventory/").status_code, (401, 403))

    def test_create_from_fields(self):
        r = self.c.post("/api/inventory/", {"name": "Milk", "quantity": "1", "unit": "l",
                                             "category": "Fridge", "expiry_date": "2030-01-01"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["name"], "Milk")
        self.assertEqual(r.json()["category"], "Fridge")

    def test_create_from_quick_add_text(self):
        r = self.c.post("/api/inventory/", {"text": "2 red peppers", "category": "Fridge"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.json()["quantity"], r.json()["name"]), ("2", "red peppers"))

    def test_blank_name_rejected(self):                                  # MH-B shoppinglist/inventory blank
        r = self.c.post("/api/inventory/", {"text": "   "}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("name", r.json()["error"]["fields"])
        self.assertEqual(InventoryItem.objects.count(), 0)

    def test_invalid_date_rejected_not_500(self):                        # fix/inventory-invalid-date
        r = self.c.post("/api/inventory/", {"name": "Milk", "expiry_date": "31/12/2030"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("expiry_date", r.json()["error"]["fields"])

    def test_invalid_category_rejected(self):
        r = self.c.post("/api/inventory/", {"name": "Milk", "category": "Garage"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_list_only_own_active_sorted_by_expiry_nulls_last(self):
        today = timezone.localdate()
        InventoryItem.objects.create(user=self.user, name="NoDate")
        InventoryItem.objects.create(user=self.user, name="Later", expiry_date=today + timedelta(days=9))
        InventoryItem.objects.create(user=self.user, name="Soon", expiry_date=today + timedelta(days=1))
        InventoryItem.objects.create(user=self.user, name="Used", used_at=timezone.now())
        InventoryItem.objects.create(user=self.other, name="NotMine")
        names = [i["name"] for i in self.c.get("/api/inventory/").json()]
        self.assertEqual(names, ["Soon", "Later", "NoDate"])

    def test_filter_by_category(self):
        InventoryItem.objects.create(user=self.user, name="Peas", category="Freezer")
        InventoryItem.objects.create(user=self.user, name="Rice", category="Pantry")
        names = [i["name"] for i in self.c.get("/api/inventory/?category=Freezer").json()]
        self.assertEqual(names, ["Peas"])

    def test_patch_and_delete_own(self):
        item = InventoryItem.objects.create(user=self.user, name="Milk")
        r = self.c.patch(f"/api/inventory/{item.id}/", {"category": "Pantry", "quantity": "2"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["category"], "Pantry")
        self.assertEqual(self.c.delete(f"/api/inventory/{item.id}/").status_code, 204)
        self.assertFalse(InventoryItem.objects.filter(id=item.id).exists())

    def test_cannot_touch_other_users_item(self):                        # SEC IDOR
        item = InventoryItem.objects.create(user=self.other, name="Secret")
        self.assertEqual(self.c.patch(f"/api/inventory/{item.id}/", {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/inventory/{item.id}/").status_code, 404)
        self.assertEqual(self.c.post(f"/api/inventory/{item.id}/use/").status_code, 404)
        self.assertTrue(InventoryItem.objects.filter(id=item.id, name="Secret").exists())

    def test_get_cannot_delete(self):                                    # GET-delete CSRF fix
        item = InventoryItem.objects.create(user=self.user, name="Milk")
        self.c.get(f"/api/inventory/{item.id}/")
        self.assertTrue(InventoryItem.objects.filter(id=item.id).exists())

    def test_mark_used_hides_from_list(self):
        item = InventoryItem.objects.create(user=self.user, name="Milk")
        r = self.c.post(f"/api/inventory/{item.id}/use/")
        self.assertEqual(r.status_code, 200)
        item.refresh_from_db()
        self.assertIsNotNone(item.used_at)
        self.assertEqual(self.c.get("/api/inventory/").json(), [])


class NoteApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_get_creates_empty_note(self):
        r = self.c.get("/api/note/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["note"], "")
        self.assertTrue(Note.objects.filter(user=self.user).exists())

    def test_put_saves_note(self):                                       # SEC notes form
        r = self.c.put("/api/note/", {"note": "<script>x</script> buy eggs"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Note.objects.get(user=self.user).note, "<script>x</script> buy eggs")

    def test_note_length_limited(self):
        r = self.c.put("/api/note/", {"note": "x" * 5001}, format="json")
        self.assertEqual(r.status_code, 400)
