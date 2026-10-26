"""
Meal Hacker - QA tests for page heading structure (ACC-006, MH-B013).

Every page's visible title is now an <h1 class="page-title"> instead of a
styled <div>, so assistive tech can navigate by heading.
"""
import re

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


def _h1s(html):
    return [m.strip() for m in re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.S)]


class HeadingStructureTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("hdg", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="hdg", password="Str0ngPass!23")

    def _assert_single_h1(self, url_name, expected_text):
        html = self.c.get(reverse(url_name)).content.decode()
        h1s = _h1s(html)
        self.assertEqual(len(h1s), 1, f"{url_name} should have exactly one <h1>, got {h1s}")
        self.assertEqual(h1s[0], expected_text)

    def test_homepage_h1(self):        self._assert_single_h1("homepage", "Homepage")
    def test_inventory_h1(self):       self._assert_single_h1("inventory", "Inventory")
    def test_shoppinglist_h1(self):    self._assert_single_h1("shoppinglist", "Shopping List")
    def test_calendar_h1(self):        self._assert_single_h1("calendar", "Calendar")
    def test_generatedmeals_h1(self):  self._assert_single_h1("generatedmeals", "Meal Ideas")
    def test_profile_h1(self):         self._assert_single_h1("profile", "Profile")

    def test_library_h1(self):
        # library hits the API; mock it so the page renders offline
        from unittest import mock
        m = mock.Mock(); m.raise_for_status.return_value = None
        m.json.return_value = {"results": []}
        with mock.patch("core.views.requests.get", return_value=m):
            self._assert_single_h1("library", "Library")

    def test_login_and_signup_h1_when_logged_out(self):
        c = Client()
        for url_name, text in [("login", "Log In"), ("signup", "Sign Up")]:
            h1s = _h1s(c.get(reverse(url_name)).content.decode())
            self.assertEqual(h1s, [text])
