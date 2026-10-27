import re
from typing import Tuple

_QTY = re.compile(
    r"^(?P<qty>(?:\d+\s\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛])(?:\s?(?:g|kg|ml|l|oz|lb|tbsp|tsp|cups?|pcs?|x))?)\s+(?P<name>.+)$",
    re.IGNORECASE,
)


def parse_quick_add(text: str) -> Tuple[str, str]:
    cleaned = " ".join((text or "").split())
    m = _QTY.match(cleaned)
    if m:
        return m.group("qty"), m.group("name")
    return "", cleaned
