from django.contrib.auth.models import User
from django.db import models


class MealPlan(models.Model):
    SLOTS = [("breakfast", "Breakfast"), ("lunch", "Lunch"), ("dinner", "Dinner")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meal_plans")
    recipe_id = models.PositiveIntegerField()
    recipe_title = models.CharField(max_length=200)
    recipe_image = models.URLField(blank=True)
    description = models.CharField(max_length=300, blank=True)
    planned_date = models.DateField()
    slot = models.CharField(max_length=10, choices=SLOTS, default="dinner")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["planned_date", "slot", "created_at"]

    def __str__(self):
        return self.recipe_title


class ShoppingListItem(models.Model):
    SOURCES = [("manual", "Manual"), ("auto", "Auto")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shopping_items")
    ingredient_name = models.CharField(max_length=100)
    quantity = models.CharField(max_length=50, blank=True)
    aisle = models.CharField(max_length=60, blank=True)
    checked = models.BooleanField(default=False)
    source = models.CharField(max_length=10, choices=SOURCES, default="manual")
    meal_plan = models.ForeignKey(MealPlan, null=True, blank=True, on_delete=models.SET_NULL)
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["checked", "aisle", "ingredient_name"]

    def __str__(self):
        return self.ingredient_name
