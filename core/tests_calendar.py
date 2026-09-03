"""
Meal Hacker - QA tests for the weekly Calendar page and add-to-calendar
action (CAL-*). Own file so it composes with core/tests.py and other branches.
"""
from datetime import date
from unittest import mock

from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse

from core.models import MealPlan, ShoppingListItem


def _freeze_today(d):
    """calendar() uses django.utils.timezone.localdate(); patch it so the
    rendered week is deterministic regardless of the real clock."""
    return mock.patch("core.views.timezone.localdate", return_value=d)


class CalendarWeekBoundaryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("cal2", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="cal2", password="Str0ngPass!23")

    def _week(self, frozen):
        with _freeze_today(frozen):
            return [d["date"] for d in self.c.get(reverse("calendar")).context["days"]]

    def test_week_is_seven_contiguous_days_from_monday(self):        # CAL-003
        week = self._week(date(2026, 9, 3))          # a Thursday
        self.assertEqual(len(week), 7)
        self.assertEqual(week[0].weekday(), 0)
        self.assertEqual(week[6].weekday(), 6)
        self.assertTrue(all((week[i + 1] - week[i]).days == 1 for i in range(6)))
        self.assertIn(date(2026, 9, 3), week)

    def test_month_boundary(self):                                   # CAL-005
        week = self._week(date(2026, 9, 1))          # Tue 1 Sep -> week starts Mon 31 Aug
        self.assertEqual(week[0], date(2026, 8, 31))
        self.assertEqual(week[6], date(2026, 9, 6))

    def test_year_boundary(self):                                    # CAL-006
        week = self._week(date(2026, 12, 31))        # Thu -> week Mon 28 Dec .. Sun 3 Jan
        self.assertEqual(week[0], date(2026, 12, 28))
        self.assertEqual(week[6], date(2027, 1, 3))

    def test_leap_year_end_of_february(self):                        # CAL / EDGE-019
        week = self._week(date(2028, 2, 29))         # 2028 leap year; 29 Feb is a Tuesday
        self.assertIn(date(2028, 2, 29), week)
        self.assertEqual(week[0], date(2028, 2, 28))
        self.assertEqual(week[6], date(2028, 3, 5))

    def test_only_this_users_plans_are_shown(self):                 # CAL-007 / isolation
        other = User.objects.create_user("cal2_other", password="Str0ngPass!23")
        MealPlan.objects.create(user=other, recipe_id=1, recipe_title="OtherMeal",
                                planned_date=date(2026, 9, 3))
        MealPlan.objects.create(user=self.user, recipe_id=2, recipe_title="MineMeal",
                                planned_date=date(2026, 9, 3))
        with _freeze_today(date(2026, 9, 3)):
            r = self.c.get(reverse("calendar"))
        self.assertContains(r, "MineMeal")
        self.assertNotContains(r, "OtherMeal")


class AddToCalendarTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("addcal", password="Str0ngPass!23")
        self.c = Client()
        self.c.login(username="addcal", password="Str0ngPass!23")

    def test_valid_post_creates_plan_and_shopping_items(self):       # CAL / SHOP auto
        r = self.c.post(reverse("add_to_calendar"), {
            "recipe_id": "715538", "recipe_title": "Bruschetta",
            "recipe_image": "http://x/img.jpg", "planned_date": "2026-09-10",
            "ingredients": ["tomato", "basil"],
        })
        self.assertRedirects(r, reverse("calendar"))
        plan = MealPlan.objects.get(user=self.user)
        self.assertEqual(plan.recipe_title, "Bruschetta")
        self.assertEqual(str(plan.planned_date), "2026-09-10")
        self.assertEqual(
            sorted(ShoppingListItem.objects.filter(user=self.user).values_list("ingredient_name", flat=True)),
            ["basil", "tomato"],
        )
        self.assertTrue(all(s.source == "auto" for s in ShoppingListItem.objects.filter(user=self.user)))

    def test_get_request_does_not_create_anything(self):            # method guard
        r = self.c.get(reverse("add_to_calendar"))
        self.assertRedirects(r, reverse("calendar"))
        self.assertEqual(MealPlan.objects.count(), 0)

    def test_missing_planned_date_is_rejected_without_error(self):   # CAL / VAL-013  (regression: MH-B008)
        """No planned_date -> the view must not 500 and must not create a
        half-formed MealPlan; it just redirects back."""
        r = self.c.post(reverse("add_to_calendar"), {
            "recipe_id": "1", "recipe_title": "NoDate", "recipe_image": "",
            "ingredients": ["salt"],
        })
        self.assertEqual(r.status_code, 302)
        self.assertEqual(MealPlan.objects.count(), 0)
        self.assertEqual(ShoppingListItem.objects.count(), 0)   # no partial side effects

    def test_invalid_planned_date_string_is_rejected(self):         # CAL / VAL-005  (regression: MH-B008)
        r = self.c.post(reverse("add_to_calendar"), {
            "recipe_id": "1", "recipe_title": "BadDate", "recipe_image": "",
            "planned_date": "not-a-date",
        })
        self.assertEqual(r.status_code, 302)
        self.assertEqual(MealPlan.objects.count(), 0)

    def test_non_numeric_recipe_id_is_coerced_not_fatal(self):      # CAL / VAL-004  (regression: MH-B009)
        """A non-numeric recipe_id must not 500; it is coerced to 0."""
        r = self.c.post(reverse("add_to_calendar"), {
            "recipe_id": "abc", "recipe_title": "BadId", "recipe_image": "",
            "planned_date": "2026-09-10",
        })
        self.assertEqual(r.status_code, 302)
        self.assertEqual(MealPlan.objects.get(user=self.user).recipe_id, 0)
