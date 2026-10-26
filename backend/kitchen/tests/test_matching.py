from django.test import SimpleTestCase

from kitchen.matching import have_ingredient, normalise


class MatchingTests(SimpleTestCase):
    def test_normalise_lowercases_and_singularises(self):
        self.assertEqual(normalise("  Tomatoes "), "tomato")
        self.assertEqual(normalise("Chicken Thighs"), "chicken thigh")
        self.assertEqual(normalise("berries"), "berry")
        self.assertEqual(normalise("Hummus"), "hummus")
        self.assertEqual(normalise(""), "")
        self.assertEqual(normalise(None), "")

    def test_have_ingredient_exact_and_partial(self):
        inv = {normalise(n) for n in ["Chicken thighs", "garlic", "Cheddar cheese"]}
        self.assertTrue(have_ingredient(inv, "chicken thigh"))
        self.assertTrue(have_ingredient(inv, "garlic cloves"))
        self.assertTrue(have_ingredient(inv, "cheddar"))
        self.assertFalse(have_ingredient(inv, "beef"))
        self.assertFalse(have_ingredient(inv, ""))

    def test_normalise_es_plurals(self):
        self.assertEqual(normalise("peaches"), "peach")
        self.assertEqual(normalise("boxes"), "box")
        self.assertEqual(normalise("glasses"), "glass")
        self.assertEqual(normalise("dishes"), "dish")

    def test_short_words_do_not_false_match(self):
        inv = {normalise("egg")}
        self.assertFalse(have_ingredient(inv, "eggplant"))
