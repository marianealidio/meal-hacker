from datetime import timedelta
from typing import Optional

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from .models import DEMO_USERNAME, get_profile

INVENTORY = [
    # name, quantity, category, days until expiry (None = no date)
    ("spinach", "1 bag", "Fridge", 0),
    ("greek yogurt", "500 g", "Fridge", 2),
    ("chicken breast", "2", "Fridge", 3),
    ("cheddar", "200 g", "Fridge", 12),
    ("lemon", "3", "Fridge", 9),
    ("red pepper", "2", "Fridge", 4),
    ("tomato", "6", "Fridge", 5),
    ("garlic", "1 bulb", "Pantry", 30),
    ("onion", "4", "Pantry", 21),
    ("rice", "1 kg", "Pantry", None),
    ("pasta", "500 g", "Pantry", None),
    ("olive oil", "1 bottle", "Pantry", None),
    ("cannellini beans", "2 tins", "Pantry", None),
    ("frozen peas", "1 bag", "Freezer", 90),
    ("berries", "300 g", "Freezer", 60),
]
USED = [("milk", "Fridge"), ("carrot", "Fridge"), ("bread", "Pantry"), ("mushroom", "Fridge"), ("banana", "Pantry")]
PLANS = [  # recipe_id, day offset from Monday, slot
    (716429, 0, "dinner"), (715497, 1, "breakfast"), (782585, 2, "lunch"),
    (715415, 3, "dinner"), (716426, 4, "dinner"),
]
SHOPPING = [("scallions", "1 bunch", "Produce"), ("parmesan", "100 g", "Cheese"),
            ("breadcrumbs", "", "Bakery/Bread"), ("asparagus", "1 bunch", "Produce"), ("eggs", "6", "Dairy")]
FAVOURITES = [716429, 782585, 715497, 644387]
# Visitors share one demo kitchen; it is reset lazily on the first demo login after this age.
DEMO_MAX_AGE = timedelta(hours=24)


def ensure_demo_user() -> User:
    user, created = User.objects.get_or_create(username=DEMO_USERNAME)
    if created or user.has_usable_password():
        user.set_unusable_password()
        user.save()
    p = get_profile(user)
    if not p.is_demo:
        p.is_demo, p.onboarded = True, True
        p.display_name = p.display_name or "Guest chef"
        p.save()
    if not user.inventory.exists():
        seed_demo_data(user)
    return user


def _is_fresh(user: User, max_age: Optional[timedelta]) -> bool:
    seeded = get_profile(user).demo_seeded_at
    return max_age is not None and seeded is not None and timezone.now() - seeded < max_age


def refresh_demo_if_stale(user: User) -> None:
    """Reset the shared demo kitchen if it was last seeded more than DEMO_MAX_AGE ago."""
    if not _is_fresh(user, DEMO_MAX_AGE):
        seed_demo_data(user, reset=True, max_age=DEMO_MAX_AGE)


def _needs_seed(user: User, reset: bool, max_age: Optional[timedelta]) -> bool:
    if reset:
        return not _is_fresh(user, max_age)
    return not user.inventory.exists()


def seed_demo_data(user: User, reset: bool = False, max_age: Optional[timedelta] = None) -> None:
    """Fill the demo kitchen. reset=True wipes it first; with max_age the reset is skipped when the
    kitchen was seeded within max_age (the lazy path, where several logins may race)."""
    from kitchen.models import InventoryItem, Note
    from planner.models import MealPlan, ShoppingListItem
    from recipes import spoonacular
    from recipes.models import FavouriteRecipe
    from recipes.normalise import summary_from_api

    if not _needs_seed(user, reset, max_age):
        return

    # Recipe lookups happen before the transaction so no DB lock is held during I/O.
    # Any cached payload, even an expired one, beats spending API credits on a reset.
    def info(recipe_id):
        try:
            raw = spoonacular.cached_information(recipe_id) or spoonacular.information(recipe_id).data
            return summary_from_api(raw, set())
        except (spoonacular.SpoonacularUnavailable, spoonacular.RecipeNotFound):
            return {"title": "Planned meal", "image": "", "description": ""}

    infos = {rid: info(rid) for rid in {r for r, _, _ in PLANS} | set(FAVOURITES)}

    with transaction.atomic():
        # Row lock serialises concurrent seeds; conditions are re-checked after it is taken.
        User.objects.select_for_update().get(pk=user.pk)
        if not _needs_seed(user, reset, max_age):
            return
        p = get_profile(user)
        if reset:
            InventoryItem.objects.filter(user=user).delete()
            MealPlan.objects.filter(user=user).delete()
            ShoppingListItem.objects.filter(user=user).delete()
            FavouriteRecipe.objects.filter(user=user).delete()
            Note.objects.filter(user=user).delete()
            p.display_name, p.diet, p.intolerances, p.onboarded, p.is_demo = "Guest chef", "", [], True, True
        p.demo_seeded_at = timezone.now()
        p.save()

        today = timezone.localdate()
        now = timezone.now()
        for name, qty, cat, days in INVENTORY:
            InventoryItem.objects.create(user=user, name=name, quantity=qty, category=cat,
                                         expiry_date=today + timedelta(days=days) if days is not None else None)
        for i, (name, cat) in enumerate(USED):
            InventoryItem.objects.create(user=user, name=name, category=cat, used_at=now - timedelta(days=i))

        monday = today - timedelta(days=today.weekday())
        if not MealPlan.objects.filter(user=user).exists():
            for recipe_id, offset, slot in PLANS:
                s = infos[recipe_id]
                MealPlan.objects.create(user=user, recipe_id=recipe_id, recipe_title=s["title"][:200],
                                        recipe_image=s["image"], description=s["description"][:300],
                                        planned_date=monday + timedelta(days=offset), slot=slot)
        if not ShoppingListItem.objects.filter(user=user).exists():
            for name, qty, aisle in SHOPPING:
                ShoppingListItem.objects.create(user=user, ingredient_name=name, quantity=qty,
                                                aisle=aisle, source="auto")
        for recipe_id in FAVOURITES:
            if not FavouriteRecipe.objects.filter(user=user, recipe_id=recipe_id).exists():
                s = infos[recipe_id]
                FavouriteRecipe.objects.create(user=user, recipe_id=recipe_id, title=s["title"][:200],
                                               image=s["image"], description=s["description"][:300])
        Note.objects.update_or_create(user=user, defaults={"note": "Use the spinach tonight.\nBatch-cook rice on Sunday."})
