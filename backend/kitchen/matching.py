import re
from typing import Optional, Set

_WORD = re.compile(r"[a-z]+")


def _singular(word: str) -> str:
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 4 and word.endswith("oes"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss") and not word.endswith("us"):
        return word[:-1]
    return word


def normalise(name: Optional[str]) -> str:
    words = _WORD.findall((name or "").lower())
    return " ".join(_singular(w) for w in words)


def have_ingredient(inventory_names: Set[str], ingredient_name: Optional[str]) -> bool:
    target = normalise(ingredient_name)
    if not target:
        return False
    if target in inventory_names:
        return True
    target_words = set(target.split())
    for inv in inventory_names:
        inv_words = set(inv.split())
        if not inv_words:
            continue
        # whole-word containment either way ("garlic" ⊂ "garlic clove", "cheddar" ⊂ "cheddar cheese")
        if inv_words <= target_words or target_words <= inv_words:
            return True
    return False
