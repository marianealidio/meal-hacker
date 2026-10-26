from django.test import SimpleTestCase

from kitchen.parsing import parse_quick_add


class ParseQuickAddTests(SimpleTestCase):
    def test_number_then_name(self):
        self.assertEqual(parse_quick_add("2 red peppers"), ("2", "red peppers"))

    def test_number_with_unit(self):
        self.assertEqual(parse_quick_add("500g mince"), ("500g", "mince"))
        self.assertEqual(parse_quick_add("1.5 kg potatoes"), ("1.5 kg", "potatoes"))

    def test_unicode_fraction(self):                          # Review Focus 1
        self.assertEqual(parse_quick_add("½ lemon"), ("½", "lemon"))

    def test_name_only(self):
        self.assertEqual(parse_quick_add("  basil  "), ("", "basil"))

    def test_bare_number_becomes_name(self):                  # Review Focus 1
        self.assertEqual(parse_quick_add("7"), ("", "7"))

    def test_collapses_whitespace(self):
        self.assertEqual(parse_quick_add("3   spring   onions"), ("3", "spring onions"))
