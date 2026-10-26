from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from kitchen.models import InventoryItem
from kitchen.serializers import InventoryItemSerializer
from meal_hacker.api_errors import api_error
from recipes import services as recipe_services
from recipes import spoonacular

from .models import MealPlan, ShoppingListItem
from .serializers import (MealPlanCreateSerializer, MealPlanSerializer, ShoppingItemSerializer,
                          ToInventorySerializer)
from .services import add_missing_to_shopping


@api_view(["GET", "POST"])
def plans(request):
    if request.method == "GET":
        raw = request.query_params.get("week")
        try:
            day = parse_date(raw) if raw else timezone.localdate()
        except ValueError:
            day = None
        if day is None:
            return api_error("invalid", "Use a week date like 2026-10-26.", 400, {"week": ["Invalid date."]})
        start = day - timedelta(days=day.weekday())
        week = [start + timedelta(days=i) for i in range(7)]
        qs = MealPlan.objects.filter(user=request.user, planned_date__range=(week[0], week[-1]))
        by_day = {d: [] for d in week}
        for p in qs:
            by_day[p.planned_date].append(MealPlanSerializer(p).data)
        return Response({"week_start": start.isoformat(),
                         "days": [{"date": d.isoformat(), "meals": by_day[d]} for d in week]})

    s = MealPlanCreateSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    v = s.validated_data
    try:
        recipe, _ = recipe_services.recipe_detail(request.user, v["recipe_id"])
    except spoonacular.SpoonacularUnavailable:
        return api_error("recipes_unavailable", "Recipes can't load right now. Try again in a minute.", 503)
    plan = MealPlan.objects.create(
        user=request.user, recipe_id=v["recipe_id"], recipe_title=recipe["title"][:200],
        recipe_image=(recipe["image"] or "")[:200], description=recipe["description"][:300],
        planned_date=v["planned_date"], slot=v["slot"])
    added = 0
    if v["add_missing"]:
        missing = [{"name": i["name"], "aisle": i["aisle"]} for i in recipe["ingredients"] if not i["have"]]
        added = add_missing_to_shopping(request.user, plan, missing)
    data = MealPlanSerializer(plan).data
    data["added_to_shopping"] = added
    return Response(data, status=status.HTTP_201_CREATED)


class PlanDetail(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = MealPlanSerializer
    http_method_names = ["patch", "delete"]

    def get_queryset(self):
        return MealPlan.objects.filter(user=self.request.user)


class ShoppingList(generics.ListCreateAPIView):
    serializer_class = ShoppingItemSerializer
    pagination_class = None

    def get_queryset(self):
        return ShoppingListItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, source="manual")


class ShoppingDetail(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = ShoppingItemSerializer
    http_method_names = ["patch", "delete"]

    def get_queryset(self):
        return ShoppingListItem.objects.filter(user=self.request.user)


@api_view(["POST"])
def to_inventory(request, pk):
    item = get_object_or_404(ShoppingListItem, pk=pk, user=request.user)
    s = ToInventorySerializer(data=request.data)
    s.is_valid(raise_exception=True)
    inv = InventoryItem.objects.create(
        user=request.user, name=item.ingredient_name, quantity=item.quantity,
        category=s.validated_data["category"], expiry_date=s.validated_data.get("expiry_date"))
    item.delete()
    return Response(InventoryItemSerializer(inv).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def clear_checked(request):
    deleted, _ = ShoppingListItem.objects.filter(user=request.user, checked=True).delete()
    return Response({"deleted": deleted})
