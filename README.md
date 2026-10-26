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

Export the OpenAPI schema: `python manage.py spectacular --file schema.yml` (the `/api/schema/` endpoint needs a logged-in session).

---

## API notes

| API | Purpose | Limit |
|-----|---------|-------|
| Spoonacular | Recipe suggestions, library, meal details | 50 points / day |
| Groq (LLaMA 3.1) | AI kitchen chatbot | Free tier |

Every Spoonacular response is cached. If the daily limit is reached or the API is down, the API serves the last cached copy and marks the response with an `X-Stale: true` header; if nothing is cached it returns a `503` with the `recipes_unavailable` error code.

---

## Troubleshooting

**`python` command not found on Mac**
Use `python3` instead of `python` for all commands.

**Port already in use**
```
python manage.py runserver 8080
```

---

## Try the API

The Next.js frontend is coming; for now the backend is a JSON API under `/api/`.

1. `python manage.py seed_demo` creates the shared demo kitchen (`--reset` wipes and refills it).
2. `GET /api/csrf/` sets the `csrftoken` cookie and returns the token.
3. `POST /api/auth/demo/` with the `X-CSRFToken` header logs you in as the demo user.
4. Explore, for example `GET /api/inventory/`, `GET /api/recipes/suggestions/`, `GET /api/plans/`.

Errors always look like `{"error": {"code": ..., "message": ..., "fields": {...}}}`.

---

## Deploy

`render.yaml` sets up the API and a free Postgres database on Render. Set `CSRF_TRUSTED_ORIGINS` to the Vercel frontend origin(s), comma-separated (for example `https://meal-hacker.vercel.app`), and `ALLOWED_HOSTS` to any custom domain; the Render hostname is allowed automatically. The demo kitchen resets itself on the first demo login after 24 hours.

---

*Mariane Alidio · w19740405 · BSc (Hons) Computer Science · University of Westminster · 2026*
