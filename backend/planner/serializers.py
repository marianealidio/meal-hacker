from rest_framework import serializers

from .models import MealPlan, ShoppingListItem

DATE_FORMATS = ["%Y-%m-%d"]


class MealPlanSerializer(serializers.ModelSerializer):
    planned_date = serializers.DateField(input_formats=DATE_FORMATS)

    class Meta:
        model = MealPlan
        fields = ["id", "recipe_id", "recipe_title", "recipe_image", "description", "planned_date", "slot"]
        read_only_fields = ["id", "recipe_id", "recipe_title", "recipe_image", "description"]


class MealPlanCreateSerializer(serializers.Serializer):
    recipe_id = serializers.IntegerField(min_value=1, max_value=2147483647)
    planned_date = serializers.DateField(input_formats=DATE_FORMATS)
    slot = serializers.ChoiceField(choices=[s for s, _ in MealPlan.SLOTS], default="dinner")
    add_missing = serializers.BooleanField(default=False)


class ShoppingItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(max_length=100)

    class Meta:
        model = ShoppingListItem
        fields = ["id", "ingredient_name", "quantity", "aisle", "checked", "source", "meal_plan", "date_added"]
        read_only_fields = ["id", "source", "meal_plan", "date_added"]

    def validate_ingredient_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Enter an item name.")
        return value


class ToInventorySerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=["Fridge", "Pantry", "Freezer"], default="Fridge")
    expiry_date = serializers.DateField(input_formats=DATE_FORMATS, required=False, allow_null=True)
