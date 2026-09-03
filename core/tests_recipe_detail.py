"""
Meal Hacker - QA tests for the recipe-detail page (RECIPE-* / ERR-*).
Spoonacular is fully mocked - no API credits. Own file so it composes with
core/tests.py and other feature branches.
"""
from unittest import mock

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse


def _resp(json_data, status=200):
    m = mock.Mock()
    m.status_code = status
    m.raise_for_status.side_effect = None if status == 200 else Exception("HTTP %s" % status)
    m.json.return_value = json_data
    return m


_RECIPE = {
    "id": 42, "title": "Lemon Pasta", "image": "http://x/img.jpg",
    "readyInMinutes": 20, "servings": 2,
    "extendedIngredients": [{"original": "200g spaghetti"}, {"original": "1 lemon"}],
    "instructions": "<ol><li>Boil pasta</li><li>Add lemon</li></ol>",
}


class RecipeDetailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("rd", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="rd", password="Str0ngPass!23")
        self.url = reverse("recipe_detail", kwargs={"recipe_id": 42})

    def test_requires_login(self):                                  # SEC-005
        self.c.logout()
        r = self.c.get(self.url)
        self.assertEqual(r.status_code, 302)
        self.assertIn("/login/", r["Location"])

    def test_valid_response_shows_recipe(self):                     # RECIPE-001
        with mock.patch("core.views.requests.get", return_value=_resp(_RECIPE)):
            r = self.c.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Lemon Pasta")
        self.assertContains(r, "200g spaghetti")
        self.assertContains(r, "Serves 2")

    def test_api_exception_shows_fallback_not_500(self):            # RECIPE / ERR-003
        with mock.patch("core.views.requests.get", side_effect=Exception("connection reset")):
            r = self.c.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Could not load recipe")

    def test_api_http_error_shows_fallback(self):                   # RECIPE / ERR (404 from Spoonacular)
        with mock.patch("core.views.requests.get", return_value=_resp({}, status=404)):
            r = self.c.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Could not load recipe")

    def test_malformed_json_list_does_not_500(self):               # RECIPE / ERR-005
        with mock.patch("core.views.requests.get", return_value=_resp(["unexpected"])):
            r = self.c.get(self.url)
        self.assertEqual(r.status_code, 200)          # template guards with {% if recipe %}

    def test_non_integer_recipe_id_is_404(self):                   # RECIPE / URL validation
        r = self.c.get("/recipe-detail/not-a-number/")
        self.assertEqual(r.status_code, 404)

    def test_timeout_shows_fallback(self):                          # RECIPE / ERR-004
        with mock.patch("core.views.requests.get", side_effect=Exception("Read timed out")):
            r = self.c.get(self.url)
        self.assertContains(r, "Could not load recipe", status_code=200)

    def test_instructions_html_is_rendered_unescaped(self):        # RECIPE - documents MH-B011
        """The template renders {{ recipe.instructions|safe }}. Spoonacular's
        instructions legitimately contain markup (<ol><li>...), so it is rendered
        as HTML. This also means any markup in that third-party field reaches the
        page unsanitised - tracked as MH-B011 (low, defence-in-depth)."""
        with mock.patch("core.views.requests.get", return_value=_resp(_RECIPE)):
            r = self.c.get(self.url)
        self.assertContains(r, "<li>Boil pasta</li>", html=False)
