"""The only module that talks to Groq."""
from typing import Dict, List

import requests
from django.conf import settings

URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"
MAX_TOKENS = 300
SYSTEM = (
    "You are the Meal Hacker kitchen assistant. Only answer questions about food, cooking, "
    "recipes, storage and reducing food waste. Politely decline anything else. "
    "Keep answers short and practical. The user's kitchen currently contains: {inventory}."
)


class AssistantUnavailable(Exception):
    pass


def chat(messages: List[Dict[str, str]], inventory: List[str]) -> str:
    if not settings.GROQ_API_KEY:
        sample = ", ".join(inventory[:3]) or "a few basics"
        return (f"I'm running in offline demo mode, so I can't think properly right now. "
                f"With {sample}, a quick stir-fry or soup is usually a safe bet.")
    system = {"role": "system", "content": SYSTEM.format(inventory=", ".join(inventory) or "nothing yet")}
    try:
        resp = requests.post(
            URL,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": [system, *messages], "max_tokens": MAX_TOKENS},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError, AttributeError) as exc:
        raise AssistantUnavailable(str(exc)) from exc
