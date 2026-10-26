"""The only module that talks to Spoonacular.

Every response is cached in RecipeCache. When the API fails, a stale cache
entry is served instead. When no API key is configured, hand-written sample
recipes are served so the demo works without credits.
"""
import copy
import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import requests
from django.conf import settings
from django.utils import timezone

from kitchen.matching import have_ingredient, normalise

from .models import RecipeCache

BASE_URL = "https://api.spoonacular.com"
SEARCH_TTL = timedelta(hours=24)
DETAIL_TTL = timedelta(days=7)
TIMEOUT = 10

logger = logging.getLogger(__name__)


class SpoonacularUnavailable(Exception):
    pass


class RecipeNotFound(Exception):
    """Spoonacular (or the offline samples) has no recipe with that id. Not an outage."""


@dataclass
class Result:
    data: Any
    stale: bool = False


def is_offline() -> bool:
    return not settings.SPOONACULAR_API_KEY


def _key(endpoint: str, params: Dict[str, Any]) -> str:
    clean = {k: params[k] for k in sorted(params) if k != "apiKey"}
    return hashlib.sha256(f"{endpoint}|{json.dumps(clean, sort_keys=True, default=str)}".encode()).hexdigest()


def _fetch(endpoint: str, params: Dict[str, Any], ttl: timedelta) -> Result:
    key = _key(endpoint, params)
    now = timezone.now()
    entry = RecipeCache.objects.filter(key=key).first()
    if entry and entry.expires_at > now:
        return Result(entry.payload)
    try:
        resp = requests.get(f"{BASE_URL}{endpoint}",
                            params={**params, "apiKey": settings.SPOONACULAR_API_KEY}, timeout=TIMEOUT)
        if resp.status_code == 404 and not entry:
            raise RecipeNotFound(endpoint)
        resp.raise_for_status()
        payload = resp.json()
    except (requests.RequestException, ValueError) as exc:
        if entry:
            logger.warning("Spoonacular request to %s failed (%s); serving stale cache", endpoint, exc)
            return Result(entry.payload, stale=True)
        raise SpoonacularUnavailable(str(exc)) from exc
    RecipeCache.objects.update_or_create(
        key=key, defaults={"endpoint": endpoint, "payload": payload, "fetched_at": now, "expires_at": now + ttl})
    return Result(payload)


@lru_cache(maxsize=1)
def _samples() -> List[Dict[str, Any]]:
    path = Path(__file__).with_name("sample_recipes.json")
    return json.loads(path.read_text(encoding="utf-8"))


def _offline_search(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    query = (params.get("query") or "").lower()
    diet = (params.get("diet") or "").lower()
    dish_type = (params.get("type") or "").lower()
    cuisine = (params.get("cuisine") or "").lower()
    wanted = {normalise(n) for n in (params.get("includeIngredients") or "").split(",") if n.strip()}
    results = []
    for raw in copy.deepcopy(_samples()):
        if query and query not in raw["title"].lower():
            continue
        if diet and diet not in [d.lower() for d in raw.get("diets", [])]:
            continue
        if dish_type and dish_type not in [t.lower() for t in raw.get("dishTypes", [])]:
            continue
        if cuisine and cuisine not in [c.lower() for c in raw.get("cuisines", [])]:
            continue
        item = raw
        if wanted:
            used, missed = _split_ingredients(raw, wanted)
            if not used:
                continue
            item["usedIngredients"], item["missedIngredients"] = used, missed
            item["usedIngredientCount"], item["missedIngredientCount"] = len(used), len(missed)
        results.append(item)
    if wanted:
        results.sort(key=_by_match)
    return results[: int(params.get("number") or 20)]


def _split_ingredients(raw: Dict[str, Any], wanted: Set[str]) -> Tuple[List[dict], List[dict]]:
    used, missed = [], []
    for ing in raw.get("extendedIngredients", []):
        (used if have_ingredient(wanted, ing["name"]) else missed).append(
            {"name": ing["name"], "aisle": ing.get("aisle", "")})
    return used, missed


def _by_match(r: Dict[str, Any]) -> Tuple[int, int]:
    return -r["usedIngredientCount"], r["missedIngredientCount"]


def _offline_find_by_ingredients(ingredients: List[str], number: int) -> List[Dict[str, Any]]:
    wanted = {normalise(n) for n in ingredients if n.strip()}
    results = []
    for raw in _samples():
        used, missed = _split_ingredients(raw, wanted)
        if not used:
            continue
        results.append({"id": raw["id"], "title": raw["title"], "image": raw.get("image", ""),
                        "usedIngredients": used, "missedIngredients": missed,
                        "usedIngredientCount": len(used), "missedIngredientCount": len(missed)})
    results.sort(key=_by_match)
    return results[:number]


def search(params: Dict[str, Any]) -> Result:
    params = {k: v for k, v in params.items() if v not in ("", None)}
    if is_offline():
        return Result(_offline_search(params))
    full = {"addRecipeInformation": True, "fillIngredients": True, "number": 20, **params}
    result = _fetch("/recipes/complexSearch", full, SEARCH_TTL)
    data = result.data.get("results", []) if isinstance(result.data, dict) else []
    return Result(data, result.stale)


def find_by_ingredients(ingredients: List[str], number: int = 20) -> Result:
    """Recipes that use the given ingredients, most used first (no summaries: see information_bulk)."""
    if is_offline():
        return Result(_offline_find_by_ingredients(ingredients, number))
    params = {"ingredients": ",".join(ingredients), "ranking": 1, "ignorePantry": True, "number": number}
    result = _fetch("/recipes/findByIngredients", params, SEARCH_TTL)
    return Result(result.data if isinstance(result.data, list) else [], result.stale)


def information_bulk(ids: List[int]) -> Result:
    """Full information for several recipes in one call. Unknown ids are left out."""
    if not ids:
        return Result([])
    if is_offline():
        by_id = {raw["id"]: raw for raw in _samples()}
        return Result([copy.deepcopy(by_id[i]) for i in ids if i in by_id])
    params = {"ids": ",".join(str(i) for i in ids), "includeNutrition": False}
    result = _fetch("/recipes/informationBulk", params, DETAIL_TTL)
    return Result(result.data if isinstance(result.data, list) else [], result.stale)


def information(recipe_id: int) -> Result:
    if is_offline():
        for raw in _samples():
            if raw["id"] == recipe_id:
                return Result(copy.deepcopy(raw))
        raise RecipeNotFound(f"No sample recipe {recipe_id}")
    return _fetch(f"/recipes/{recipe_id}/information", {"includeNutrition": False}, DETAIL_TTL)
