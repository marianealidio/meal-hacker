import html
from typing import Any, Dict, List, Optional, Set

from django.utils.html import strip_tags

from kitchen.matching import have_ingredient


def describe(summary_html: Optional[str], limit: Optional[int] = 160) -> str:
    """Plain text of a Spoonacular summary, cut at a word boundary after `limit` characters (None keeps it all)."""
    if not summary_html:
        return ""
    text = " ".join(html.unescape(strip_tags(summary_html)).split())
    if limit is None or len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:.- ")
    return cut + "…"


def _ingredient_name(i: Dict[str, Any]) -> str:
    return (i.get("name") or i.get("originalName") or i.get("original") or "").strip()


def summary_from_api(raw: Dict[str, Any], inventory: Set[str]) -> Dict[str, Any]:
    if "usedIngredients" in raw or "missedIngredients" in raw:
        used = [n for n in (_ingredient_name(i) for i in raw.get("usedIngredients") or []) if n]
        missing = [{"name": _ingredient_name(i), "aisle": i.get("aisle") or ""}
                   for i in raw.get("missedIngredients") or [] if _ingredient_name(i)]
    else:
        used, missing = [], []
        for i in raw.get("extendedIngredients") or []:
            name = (i.get("name") or i.get("originalName") or "").strip()
            if not name:
                continue
            if have_ingredient(inventory, name):
                used.append(name)
            else:
                missing.append({"name": name, "aisle": i.get("aisle") or ""})
    return {
        "id": int(raw.get("id") or 0),
        "title": raw.get("title") or "Untitled recipe",
        "image": raw.get("image") or "",
        "description": describe(raw.get("summary")),
        "ready_in_minutes": raw.get("readyInMinutes"),
        "servings": raw.get("servings"),
        "diets": list(raw.get("diets") or []),
        "used": used,
        "missing": missing,
    }


def _steps(raw: Dict[str, Any]) -> List[str]:
    steps: List[str] = []
    for block in raw.get("analyzedInstructions") or []:
        for s in block.get("steps") or []:
            if s.get("step"):
                steps.append(s["step"].strip())
    if not steps and raw.get("instructions"):
        steps = [p.strip() for p in strip_tags(raw["instructions"]).split("\n") if p.strip()]
    return steps


def detail_from_api(raw: Dict[str, Any], inventory: Set[str]) -> Dict[str, Any]:
    base = summary_from_api({k: v for k, v in raw.items()
                             if k not in ("usedIngredients", "missedIngredients")}, inventory)
    ingredients = []
    for i in raw.get("extendedIngredients") or []:
        name = _ingredient_name(i)
        if not name:
            continue
        ingredients.append({
            "name": name,
            "amount": i.get("amount"),
            "unit": i.get("unit") or "",
            "original": i.get("original") or name,
            "aisle": i.get("aisle") or "",
            "have": have_ingredient(inventory, name),
        })
    base.update({
        "summary": describe(raw.get("summary"), limit=None),
        "ingredients": ingredients,
        "steps": _steps(raw),
        "source_url": raw.get("sourceUrl") or "",
        "cuisines": list(raw.get("cuisines") or []),
    })
    return base
