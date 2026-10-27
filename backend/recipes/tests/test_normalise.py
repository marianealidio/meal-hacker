from django.test import SimpleTestCase

from kitchen.matching import normalise
from recipes.normalise import describe, detail_from_api, summary_from_api

RAW = {
    "id": 716429,
    "title": "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs",
    "image": "https://img.spoonacular.com/recipes/716429-556x370.jpg",
    "summary": "<b>Pasta with Garlic</b> is a <a href='x'>main course</a> that serves 2. "
               "One serving contains 584 calories &amp; it's loved by many cooks who want something quick.",
    "readyInMinutes": 45,
    "servings": 2,
    "diets": ["dairy free"],
    "cuisines": ["Italian"],
    "sourceUrl": "https://example.com/pasta",
    "extendedIngredients": [
        {"name": "garlic", "amount": 2, "unit": "cloves", "original": "2 cloves garlic", "aisle": "Produce"},
        {"name": "cauliflower florets", "amount": 2, "unit": "cups", "original": "2 cups cauliflower", "aisle": "Produce"},
        {"amount": 1, "unit": "", "original": "mystery"},
    ],
    "analyzedInstructions": [{"steps": [{"number": 1, "step": "Boil pasta."}, {"number": 2, "step": "Toss."}]}],
}


class DescribeTests(SimpleTestCase):
    def test_strips_html_and_entities(self):
        d = describe(RAW["summary"])
        self.assertNotIn("<", d)
        self.assertIn("&", d)
        self.assertTrue(d.startswith("Pasta with Garlic is a main course"))

    def test_truncates_at_word_boundary(self):
        d = describe(RAW["summary"], limit=40)
        self.assertLessEqual(len(d), 41)
        self.assertTrue(d.endswith("…"))
        self.assertFalse(d[:-1].endswith(" "))

    def test_none_and_empty(self):
        self.assertEqual(describe(None), "")
        self.assertEqual(describe(""), "")


class SummaryTests(SimpleTestCase):
    def test_summary_from_complex_search_result(self):
        raw = dict(RAW, usedIngredients=[{"name": "garlic"}],
                   missedIngredients=[{"name": "scallions", "aisle": "Produce"}, {"aisle": "?"}])
        s = summary_from_api(raw, {normalise("Garlic")})
        self.assertEqual(s["id"], 716429)
        self.assertEqual(s["ready_in_minutes"], 45)
        self.assertEqual(s["used"], ["garlic"])
        self.assertEqual(s["missing"], [{"name": "scallions", "aisle": "Produce"}])
        self.assertTrue(s["description"])

    def test_summary_without_used_lists_falls_back_to_matching(self):
        s = summary_from_api(RAW, {normalise("garlic")})
        self.assertEqual(s["used"], ["garlic"])
        self.assertEqual([m["name"] for m in s["missing"]], ["cauliflower florets"])

    def test_missing_fields_do_not_raise(self):
        s = summary_from_api({"id": 1}, set())
        self.assertEqual(s["title"], "Untitled recipe")
        self.assertEqual(s["description"], "")
        self.assertEqual(s["used"], [])


class DetailTests(SimpleTestCase):
    def test_detail(self):
        d = detail_from_api(RAW, {normalise("garlic")})
        self.assertEqual(d["steps"], ["Boil pasta.", "Toss."])
        self.assertEqual(d["cuisines"], ["Italian"])
        names = [(i["name"], i["have"]) for i in d["ingredients"]]
        self.assertEqual(names, [("garlic", True), ("cauliflower florets", False), ("mystery", False)])
        self.assertEqual(d["source_url"], "https://example.com/pasta")

    def test_detail_summary_is_full_plain_text(self):
        long_text = " ".join(["Tasty"] * 80) + " &amp; done."
        d = detail_from_api({**RAW, "summary": f"<b>{long_text}</b>"}, set())
        self.assertTrue(d["description"].endswith("…"))
        self.assertEqual(d["summary"], " ".join(["Tasty"] * 80) + " & done.")
