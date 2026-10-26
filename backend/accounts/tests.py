from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import DEMO_USERNAME, Profile


def csrf_client():
    c = APIClient(enforce_csrf_checks=True)
    token = c.get("/api/csrf/").json()["csrfToken"]
    c.credentials(HTTP_X_CSRFTOKEN=token)
    return c


def refresh_csrf(c):
    # login() rotates the CSRF token, so re-fetch it before the next POST.
    token = c.get("/api/csrf/").json()["csrfToken"]
    c.credentials(HTTP_X_CSRFTOKEN=token)


class CsrfTests(TestCase):
    def test_csrf_endpoint_sets_cookie(self):
        r = APIClient().get("/api/csrf/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("csrftoken", r.cookies)

    def test_login_without_csrf_token_is_rejected(self):
        User.objects.create_user("ann", password="Str0ngPass!23")
        c = APIClient(enforce_csrf_checks=True)
        r = c.post("/api/auth/login/", {"username": "ann", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(r.status_code, 403)


class SignupLoginTests(TestCase):
    def test_signup_creates_user_profile_and_session(self):              # AUTH-001
        c = csrf_client()
        r = c.post("/api/auth/signup/", {"username": "newuser", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["username"], "newuser")
        self.assertFalse(r.json()["onboarded"])
        self.assertTrue(Profile.objects.filter(user__username="newuser").exists())
        self.assertEqual(c.get("/api/auth/me/").status_code, 200)

    def test_signup_duplicate_username_is_field_error(self):            # AUTH-002
        User.objects.create_user("taken", password="Str0ngPass!23")
        r = csrf_client().post("/api/auth/signup/", {"username": "taken", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.json()["error"]["fields"])

    def test_signup_weak_password_is_field_error(self):                 # AUTH-003
        r = csrf_client().post("/api/auth/signup/", {"username": "weakuser", "password": "123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("password", r.json()["error"]["fields"])

    def test_login_ok_and_wrong_password(self):                         # AUTH-004/005
        User.objects.create_user("ann", password="Str0ngPass!23")
        c = csrf_client()
        bad = c.post("/api/auth/login/", {"username": "ann", "password": "nope"}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(bad.json()["error"]["code"], "invalid_credentials")
        ok = c.post("/api/auth/login/", {"username": "ann", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["username"], "ann")

    def test_logout_ends_session(self):                                 # AUTH-006
        User.objects.create_user("ann", password="Str0ngPass!23")
        c = csrf_client()
        c.post("/api/auth/login/", {"username": "ann", "password": "Str0ngPass!23"}, format="json")
        refresh_csrf(c)
        self.assertEqual(c.post("/api/auth/logout/").status_code, 204)
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

    def test_me_requires_login(self):                                   # SEC-001
        r = APIClient().get("/api/auth/me/")
        self.assertIn(r.status_code, (401, 403))
        self.assertIn("error", r.json())


class ProfileTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="Str0ngPass!23")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_patch_preferences(self):
        r = self.c.patch("/api/auth/me/", {"display_name": "Ann", "diet": "vegetarian",
                                            "intolerances": ["gluten", "peanut"], "onboarded": True}, format="json")
        self.assertEqual(r.status_code, 200)
        p = Profile.objects.get(user=self.user)
        self.assertEqual((p.display_name, p.diet, p.intolerances, p.onboarded),
                         ("Ann", "vegetarian", ["gluten", "peanut"], True))

    def test_unknown_diet_and_intolerance_rejected(self):
        r = self.c.patch("/api/auth/me/", {"diet": "carnivore", "intolerances": ["kryptonite"]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("diet", r.json()["error"]["fields"])
        self.assertIn("intolerances", r.json()["error"]["fields"])

    def test_is_demo_cannot_be_patched(self):
        self.c.patch("/api/auth/me/", {"is_demo": True}, format="json")
        self.assertFalse(Profile.objects.get(user=self.user).is_demo)

    def test_display_name_trimmed_and_limited(self):
        r = self.c.patch("/api/auth/me/", {"display_name": "x" * 61}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_change_password(self):
        r = self.c.post("/api/auth/password/", {"old_password": "Str0ngPass!23",
                                                 "new_password": "An0therStr0ng!"}, format="json")
        self.assertEqual(r.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("An0therStr0ng!"))

    def test_change_password_wrong_old(self):
        r = self.c.post("/api/auth/password/", {"old_password": "bad", "new_password": "An0therStr0ng!"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("old_password", r.json()["error"]["fields"])


class DemoTests(TestCase):
    def test_demo_login_creates_and_logs_in_demo_user(self):
        c = csrf_client()
        r = c.post("/api/auth/demo/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], DEMO_USERNAME)
        self.assertTrue(r.json()["is_demo"])
        self.assertEqual(c.get("/api/auth/me/").json()["username"], DEMO_USERNAME)

    def test_demo_user_cannot_change_password(self):                    # Review Focus 5
        c = csrf_client()
        c.post("/api/auth/demo/")
        refresh_csrf(c)
        r = c.post("/api/auth/password/", {"old_password": "x", "new_password": "An0therStr0ng!"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["error"]["code"], "demo_read_only")

    def test_demo_user_cannot_log_in_with_password(self):
        csrf_client().post("/api/auth/demo/")
        self.assertFalse(User.objects.get(username=DEMO_USERNAME).has_usable_password())


class ReservedUsernameTests(TestCase):
    def test_signup_as_demo_username_is_rejected(self):
        for name in ("demo", "Demo"):
            r = csrf_client().post("/api/auth/signup/", {"username": name, "password": "Str0ngPass!23"}, format="json")
            self.assertEqual(r.status_code, 400, name)
            self.assertIn("username", r.json()["error"]["fields"], name)
        self.assertFalse(User.objects.filter(username__iexact=DEMO_USERNAME).exists())


class PasswordWhitespaceTests(TestCase):
    def test_password_whitespace_is_significant(self):
        r = csrf_client().post("/api/auth/signup/", {"username": "spacey", "password": "  Str0ngPass!23  "},
                               format="json")
        self.assertEqual(r.status_code, 201)
        r = csrf_client().post("/api/auth/login/", {"username": "spacey", "password": "Str0ngPass!23"},
                               format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"]["code"], "invalid_credentials")


class MissingProfileTests(TestCase):
    def test_me_creates_missing_profile(self):
        user = User.objects.create_user("ghost", password="Str0ngPass!23")
        Profile.objects.filter(user=user).delete()
        c = APIClient()
        c.force_authenticate(user)
        r = c.get("/api/auth/me/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], "ghost")
        self.assertTrue(Profile.objects.filter(user=user).exists())


class DemoProfileTests(TestCase):
    def test_demo_user_cannot_patch_profile(self):
        c = csrf_client()
        c.post("/api/auth/demo/")
        refresh_csrf(c)
        r = c.patch("/api/auth/me/", {"display_name": "Hacker"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["error"]["code"], "demo_read_only")
        self.assertNotEqual(Profile.objects.get(user__username=DEMO_USERNAME).display_name, "Hacker")
