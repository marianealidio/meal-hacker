from datetime import timedelta
from typing import Dict, List, Optional, Set, Tuple

from django.utils import timezone

from accounts.models import get_profile
from kitchen.matching import have_ingredient, normalise
from kitchen.models import InventoryItem

from . import spoonacular
from .models import FavouriteRecipe
from .normalise import detail_from_api, summary_from_api

PANTRY_STAPLES = {"water", "salt", "pepper", "black pepper"}


def _active_items(user):
    return [i for i in InventoryItem.active_for(user) if normalise(i.name) not in PANTRY_STAPLES and normalise(i.name)]


def inventory_names(user) -> Set[str]:
    return {normalise(i.name) for i in _active_items(user)}


def _profile_params(user) -> Dict[str, str]:
    p = get_profile(user)
    params = {}
    if p.diet:
        params["diet"] = p.diet
    if p.intolerances:
        params["intolerances"] = ",".join(p.intolerances)
    return params


def _favourite_ids(user) -> Set[int]:
    return set(FavouriteRecipe.objects.filter(user=user).values_list("recipe_id", flat=True))


# Spoonacular's `diets` labels don't always match the `diet` query values, and stricter diets
# satisfy looser ones (a vegan recipe is vegetarian).
DIET_LABELS = {
    "vegetarian": ({"vegetarian", "lacto ovo vegetarian", "vegan"}, ("vegetarian", "vegan")),
    "vegan": ({"vegan"}, ("vegan",)),
    "gluten free": ({"gluten free"}, ("glutenFree",)),
    "pescetarian": ({"pescetarian", "pescatarian"}, ()),
    "paleo": ({"paleo", "paleolithic"}, ()),
    "ketogenic": ({"ketogenic"}, ()),
}


def matches_diet(raw: dict, diet: str) -> bool:
    diet = diet.lower()
    labels, flags = DIET_LABELS.get(diet, ({diet}, ()))
    diets = {d.lower() for d in raw.get("diets") or []}
    return bool(diets & labels) or any(raw.get(f) is True for f in flags)


def _expiry_order(items) -> List[str]:
    """Normalised names, soonest expiry first, then undated items alphabetically; no duplicates."""
    ordered = sorted(items, key=lambda i: (i.expiry_date is None, i.expiry_date or timezone.localdate(),
                                           normalise(i.name)))
    names: List[str] = []
    for i in ordered:
        n = normalise(i.name)
        if n not in names:
            names.append(n)
    return names


def suggestions(user, limit: int = 8) -> Tuple[List[dict], bool, Optional[str]]:
    # Intolerances are not applied here: findByIngredients has no such filter and its results
    # carry no allergen data. They still apply to search() (see the spec ruling in the report).
    items = _active_items(user)
    if len(items) < 3:
        return [], False, "need_more_ingredients"
    soon = timezone.localdate() + timedelta(days=3)
    expiring = {normalise(i.name) for i in items if i.expiry_date and i.expiry_date <= soon}
    names = sorted({normalise(i.name) for i in items})
    found = spoonacular.find_by_ingredients(names, number=20)
    ids = [int(r["id"]) for r in found.data if r.get("id")]
    bulk = spoonacular.information_bulk(ids) if ids else spoonacular.Result([])
    infos = {int(i["id"]): i for i in bulk.data if i.get("id")}
    diet = get_profile(user).diet
    inv = set(names)
    favs = _favourite_ids(user)
    out = []
    for raw in found.data:
        merged = {**infos.get(int(raw.get("id") or 0), {}),
                  **{k: v for k, v in raw.items() if v not in ("", None)}}
        if diet and not matches_diet(merged, diet):
            continue
        s = summary_from_api(merged, inv)
        if len(s["used"]) < 2:
            continue
        s["uses_expiring"] = [u for u in s["used"] if have_ingredient(expiring, u)]
        s["is_favourite"] = s["id"] in favs
        out.append(s)
    out.sort(key=lambda s: (-len(s["uses_expiring"]), -len(s["used"]), len(s["missing"])))
    return out[:limit], found.stale or bulk.stale, None


def search(user, q: str, cuisine: str, dish_type: str, diet: str, matches_kitchen: bool) -> Tuple[List[dict], bool]:
    params = {"query": q, "cuisine": cuisine, "type": dish_type, **_profile_params(user)}
    if diet:
        params["diet"] = diet
    items = _active_items(user)
    inv = {normalise(i.name) for i in items}
    if matches_kitchen and inv:
        params["includeIngredients"] = ",".join(_expiry_order(items)[:3])
        params["sort"] = "max-used-ingredients"
    result = spoonacular.search(params)
    favs = _favourite_ids(user)
    out = []
    for raw in result.data:
        s = summary_from_api(raw, inv)
        s["is_favourite"] = s["id"] in favs
        out.append(s)
    return out, result.stale


def recipe_detail(user, recipe_id: int) -> Tuple[dict, bool]:
    result = spoonacular.information(recipe_id)
    d = detail_from_api(result.data, inventory_names(user))
    d["is_favourite"] = recipe_id in _favourite_ids(user)
    return d, result.stale
