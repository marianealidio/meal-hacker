#  Meal Hacker
**Smart Meal Planner and Inventory Manager**

BSc Computer Science Final Year Project — Mariane Alidio (w19740405)
Supervisor: Qasim Abbas — University of Westminster, 2026

Meal Hacker is a Django web application that helps reduce food waste and simplify daily meal planning. Add your kitchen ingredients, get recipe suggestions based on what you own, plan your week on a calendar, and auto-generate a shopping list for anything you are missing.

---

## Run it locally

Backend (Python 3.9+):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # add your own keys, or leave them blank for offline demo mode
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

With no `SPOONACULAR_API_KEY` the app serves built-in sample recipes; with no `GROQ_API_KEY` the assistant gives a canned reply.

Run the tests: `python manage.py test`
API schema: http://localhost:8000/api/schema/

---

## API notes

| API | Purpose | Limit |
|-----|---------|-------|
| Spoonacular | Recipe suggestions, library, meal details | 50 points / day |
| Groq (LLaMA 3.1) | AI kitchen chatbot | Free tier |

If the Spoonacular daily limit is reached, recipe pages will show a fallback message. Please try again the following day.

---

## Troubleshooting

**`python` command not found on Mac**
Use `python3` instead of `python` for all commands.

**Port already in use**
```
python manage.py runserver 8080
```

---
## Using the website

1. Click **Sign Up** to create an account
2. Go to **Inventory** and add at least 3 ingredients (e.g. chicken, garlic, onion) — choose a category (Pantry / Fridge / Freezer) and optionally set an expiry date
3. Go to **Meal Ideas** to see recipe suggestions based on your inventory
4. Visit the **Library** to browse recipes, filter by cuisine or diet, and add meals to your calendar
5. The **Homepage** shows your best meal suggestion of the day, expiring items, a notes section, and an AI kitchen chatbot
6. The **Calendar** shows your planned meals for the current week
7. The **Shopping List** collects missing ingredients automatically when you add meals from the Library, or add items manually

---

*Mariane Alidio · w19740405 · BSc (Hons) Computer Science · University of Westminster · 2026*
