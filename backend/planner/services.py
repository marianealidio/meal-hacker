from typing import Dict, List

from .models import MealPlan, ShoppingListItem


def add_missing_to_shopping(user, plan: MealPlan, missing: List[Dict]) -> int:
    existing = {n.lower() for n in ShoppingListItem.objects.filter(user=user, checked=False)
                .values_list("ingredient_name", flat=True)}
    created = 0
    for m in missing:
        name = (m.get("name") or "").strip()[:100]
        if not name or name.lower() in existing:
            continue
        ShoppingListItem.objects.create(user=user, ingredient_name=name, aisle=(m.get("aisle") or "")[:60],
                                        source="auto", meal_plan=plan)
        existing.add(name.lower())
        created += 1
    return created
