# Meal Hacker Plan A: Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the template-rendered Django app with a tested Django REST API (Tier 0 + Tier 1/2 backend) that the Next.js frontend (Plan B/C) will consume.

**Architecture:** The Django project moves into `backend/` and is split into apps `accounts`, `kitchen`, `recipes`, `planner`, `assistant`. All external HTTP goes through two client modules (`recipes/spoonacular.py`, `assistant/groq.py`). Spoonacular responses are cached in the `RecipeCache` table, and when no API key is configured the client serves hand-written sample recipes ("offline mode") so the demo always works. Session auth + CSRF are kept, because the frontend calls the API through a same-origin rewrite.

**Tech Stack:** Python 3.9, Django 4.2, djangorestframework 3.15, drf-spectacular, python-decouple, dj-database-url, whitenoise, gunicorn, psycopg2-binary, requests. Tests use Django's `TestCase` + DRF `APIClient`, run with `python manage.py test`.

**Spec:** `docs/superpowers/specs/2026-10-26-meal-hacker-redesign-design.md`

## Global Constraints

- Python 3.9: no `X | Y` type unions, no `match`. Use `Optional[...]` from `typing`.
- No test may make a real HTTP call. Patch `recipes.spoonacular.requests.get` / `assistant.groq.requests.post`, or rely on offline mode (key empty in test settings).
- Every API path lives under `/api/`. All endpoints except `csrf/`, `auth/login/`, `auth/signup/`, `auth/demo/` and `health/` require login.
- Error envelope everywhere: `{"error": {"code": str, "message": str, "fields": {...}}}`.
- Users can only ever see or change their own rows. Another user's id returns 404, not 403.
- `.env` is never committed. `.env.example` lists names only.
- The demo button copy is "Open the kitchen" (frontend concern, mentioned so API naming stays `auth/demo/`).
- Commit after every task with message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run everything from `backend/` with the venv: `cd backend && source .venv/bin/activate`.

## Review Focus

1. Quantity/name input like `"  "`, `"2"`, `"2 red peppers"`, `"½ lemon"` in kitchen quick-add: blank is rejected with a field error, a bare number becomes a name, unicode fractions are kept in quantity. (Task 3)
2. Spoonacular down or returning 402 (quota) with a stale cache entry: the user still gets recipes and `X-Stale: true`; with no cache at all, a clean 503 envelope, never a 500. (Task 4)
3. A recipe whose ingredient objects lack `name` or whose `summary` is null: normalisation must not raise. (Task 4)
4. Adding the same recipe to the plan twice with `add_missing`: shopping list must not get duplicate rows (case-insensitive). (Task 6)
5. Demo visitors changing the shared demo password or display name to something offensive: `auth/password/` refuses for the demo user, and `seed_demo --reset` restores everything. (Tasks 2 and 8)

---

## File structure

```
backend/
  manage.py                       (moved from repo root; default settings = meal_hacker.settings.dev)
  requirements.txt                (moved + new deps)
  meal_hacker/
    settings/__init__.py
    settings/base.py              shared settings, DRF config
    settings/dev.py               DEBUG, sqlite, default SECRET_KEY
    settings/prod.py              Postgres via DATABASE_URL, whitenoise, secure cookies
    urls.py                       /admin/, /api/ includes, schema
    api_errors.py                 exception handler -> error envelope
    health.py                     GET /api/health/
    wsgi.py, asgi.py
  accounts/  models.py (Profile) serializers.py views.py urls.py tests.py signals.py
  kitchen/   models.py (InventoryItem, Note) parsing.py matching.py serializers.py views.py urls.py tests/
  recipes/   models.py (RecipeCache, FavouriteRecipe) spoonacular.py normalise.py sample_recipes.json
             serializers.py views.py urls.py tests/
  planner/   models.py (MealPlan, ShoppingListItem) serializers.py views.py urls.py tests.py
  assistant/ groq.py views.py urls.py tests.py
  stats/     views.py urls.py tests.py   (no models)
  accounts/management/commands/seed_demo.py
render.yaml
.github/workflows/ci.yml
```

The legacy `core/`, `templates/` and `static/` are deleted in Task 9 after their behaviours are re-covered by API tests.

---

### Task 1: Move project to `backend/`, split settings, health endpoint, CI

**Files:**
- Move: `manage.py`, `meal_hacker/`, `core/`, `templates/`, `static/`, `requirements.txt` → `backend/`
- Create: `backend/meal_hacker/settings/{__init__,base,dev,prod}.py` (delete `backend/meal_hacker/settings.py`)
- Create: `backend/meal_hacker/health.py`, `backend/meal_hacker/api_errors.py`, `backend/meal_hacker/tests.py`
- Modify: `backend/meal_hacker/urls.py`, `backend/manage.py`, `backend/meal_hacker/wsgi.py`, `backend/requirements.txt`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `meal_hacker.api_errors.error_envelope_handler(exc, context)`; `meal_hacker.api_errors.api_error(code: str, message: str, status: int, fields: Optional[dict]=None) -> Response`; settings `SPOONACULAR_API_KEY`, `GROQ_API_KEY` (empty string allowed); URL `/api/health/` returning `{"status": "ok"}`.

- [ ] **Step 1: Move files with git and create venv**

```bash
mkdir backend
git mv manage.py meal_hacker core templates static requirements.txt backend/
cd backend
python3 -m venv .venv && source .venv/bin/activate
```

Replace `backend/requirements.txt` with:

```
asgiref==3.8.1
certifi==2026.2.25
charset-normalizer==3.4.6
dj-database-url==2.3.0
django==4.2.27
djangorestframework==3.15.2
drf-spectacular==0.28.0
gunicorn==23.0.0
idna==3.11
psycopg2-binary==2.9.10
python-decouple==3.8
requests==2.32.4
sqlparse==0.5.5
typing-extensions==4.13.2
urllib3==2.2.3
whitenoise==6.9.0
```

Run: `pip install -r requirements.txt`
Expected: installs without error. (If a pinned version is unavailable for Python 3.9, use the newest release that supports 3.9 and record it in the commit message.)

- [ ] **Step 2: Write the failing test**

`backend/meal_hacker/tests.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient


class HealthTests(TestCase):
    def test_health_is_public_and_ok(self):
        r = APIClient().get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"status": "ok"})


class ErrorEnvelopeTests(TestCase):
    def test_unknown_api_route_uses_envelope(self):
        r = APIClient().get("/api/does-not-exist/")
        self.assertEqual(r.status_code, 404)

    def test_auth_required_uses_envelope(self):
        # /api/inventory/ is added in Task 3; until then use a guarded probe
        from meal_hacker.api_errors import error_envelope_handler
        from rest_framework.exceptions import NotAuthenticated
        resp = error_envelope_handler(NotAuthenticated(), {})
        self.assertIn(resp.status_code, (401, 403))
        self.assertEqual(resp.data["error"]["code"], "not_authenticated")
        self.assertIn("message", resp.data["error"])
        self.assertEqual(resp.data["error"]["fields"], {})

    def test_validation_error_lists_fields(self):
        from meal_hacker.api_errors import error_envelope_handler
        from rest_framework.exceptions import ValidationError
        resp = error_envelope_handler(ValidationError({"name": ["This field is required."]}), {})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["error"]["code"], "invalid")
        self.assertEqual(resp.data["error"]["fields"], {"name": ["This field is required."]})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python manage.py test meal_hacker`
Expected: FAIL / ImportError (`meal_hacker.api_errors` missing, settings package missing).

- [ ] **Step 4: Split settings**

`backend/meal_hacker/settings/__init__.py`: empty file.

`backend/meal_hacker/settings/base.py`:

```python
from pathlib import Path

from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("SECRET_KEY", default="")
SPOONACULAR_API_KEY = config("SPOONACULAR_API_KEY", default="")
GROQ_API_KEY = config("GROQ_API_KEY", default="")
DEBUG = False
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "meal_hacker.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "meal_hacker.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "meal_hacker.api_errors.error_envelope_handler",
    "DEFAULT_THROTTLE_RATES": {"assistant": "20/hour"},
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Meal Hacker API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_TRUSTED_ORIGINS = [o for o in config("CSRF_TRUSTED_ORIGINS", default="").split(",") if o]
```

`backend/meal_hacker/settings/dev.py`:

```python
from .base import *  # noqa: F401,F403
from .base import SECRET_KEY as _SECRET_KEY

DEBUG = True
SECRET_KEY = _SECRET_KEY or "dev-only-insecure-key-change-me"
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
```

`backend/meal_hacker/settings/prod.py`:

```python
import dj_database_url
from decouple import config

from .base import *  # noqa: F401,F403
from .base import SECRET_KEY

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in production")

DEBUG = False
DATABASES = {"default": dj_database_url.config(conn_max_age=600, ssl_require=True)}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)
```

Delete `backend/meal_hacker/settings.py` (`git rm`).

In `backend/manage.py` and `backend/meal_hacker/asgi.py`, change the default to `os.environ.setdefault("DJANGO_SETTINGS_MODULE", "meal_hacker.settings.dev")`. In `backend/meal_hacker/wsgi.py` use `"meal_hacker.settings.prod"`.

- [ ] **Step 5: Error envelope and health**

`backend/meal_hacker/api_errors.py`:

```python
from typing import Optional

from django.http import Http404
from rest_framework import exceptions, status as http_status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_error(code: str, message: str, status: int, fields: Optional[dict] = None) -> Response:
    return Response({"error": {"code": code, "message": message, "fields": fields or {}}}, status=status)


def error_envelope_handler(exc, context):
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    response = exception_handler(exc, context)
    if response is None:
        return None
    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail if isinstance(exc.detail, dict) else {"non_field_errors": exc.detail}
        response.data = {"error": {"code": "invalid", "message": "Some fields need fixing.", "fields": detail}}
        response.status_code = http_status.HTTP_400_BAD_REQUEST
        return response
    code = getattr(exc, "default_code", "error")
    detail = getattr(exc, "detail", str(exc))
    response.data = {"error": {"code": str(getattr(detail, "code", code)), "message": str(detail), "fields": {}}}
    return response
```

`backend/meal_hacker/health.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})
```

`backend/meal_hacker/urls.py`:

```python
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from .health import health

api_patterns = [
    path("health/", health, name="health"),
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
    path("", include("core.urls")),
]
```

- [ ] **Step 6: Run tests**

Run: `python manage.py test meal_hacker core`
Expected: the 4 new tests PASS and the legacy `core` suite still passes (same count as before the move: run `python manage.py test core` and compare with `git stash`-free baseline of 155 test methods; failures caused only by moved paths must be fixed, e.g. `BASE_DIR` now points at `backend/`).

- [ ] **Step 7: CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, redesign]
  pull_request:
jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.9"
          cache: pip
          cache-dependency-path: backend/requirements.txt
      - run: pip install -r requirements.txt
      - run: python manage.py check
      - run: python manage.py makemigrations --check --dry-run
      - run: python manage.py test
```

- [ ] **Step 8: Commit**

```bash
cd .. && git add -A backend .github && git commit -m "chore: move Django project to backend/, split settings, add health endpoint, error envelope and CI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `accounts` app — Profile, auth endpoints

**Files:**
- Create: `backend/accounts/__init__.py`, `apps.py`, `models.py`, `signals.py`, `serializers.py`, `views.py`, `urls.py`, `tests.py`, `admin.py`, `migrations/__init__.py`
- Modify: `backend/meal_hacker/settings/base.py` (add `"accounts"` to INSTALLED_APPS), `backend/meal_hacker/urls.py` (include `accounts.urls`)

**Interfaces:**
- Consumes: `api_error` from Task 1.
- Produces: `accounts.models.Profile` (fields `user` O2O related_name `profile`, `display_name: str`, `diet: str`, `intolerances: list[str]`, `onboarded: bool`, `is_demo: bool`); constants `accounts.models.DIETS`, `accounts.models.INTOLERANCES`; `accounts.models.DEMO_USERNAME = "demo"`; profile auto-created by post_save signal. Endpoints: `GET /api/csrf/` (sets cookie, returns `{"csrfToken": str}`), `POST /api/auth/login/` `{username,password}`, `POST /api/auth/signup/` `{username,password}`, `POST /api/auth/logout/`, `POST /api/auth/demo/`, `GET/PATCH /api/auth/me/`, `POST /api/auth/password/` `{old_password,new_password}`. `me` payload: `{"id", "username", "display_name", "diet", "intolerances", "onboarded", "is_demo"}`.
- The demo login view calls `accounts.demo.ensure_demo_user() -> User` which Task 8 fills with data; in this task it only creates the user and profile.

- [ ] **Step 1: Write the failing tests**

`backend/accounts/tests.py`:

```python
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import DEMO_USERNAME, Profile


def csrf_client():
    c = APIClient(enforce_csrf_checks=True)
    token = c.get("/api/csrf/").json()["csrfToken"]
    c.credentials(HTTP_X_CSRFTOKEN=token)
    return c


class CsrfTests(TestCase):
    def test_csrf_endpoint_sets_cookie(self):
        r = APIClient().get("/api/csrf/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("csrftoken", r.cookies)

    def test_login_without_csrf_token_is_rejected(self):
        User.objects.create_user("ann", password="Str0ngPass!23")
        c = APIClient(enforce_csrf_checks=True)
        r = c.post("/api/auth/login/", {"username": "ann", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(r.status_code, 403)


class SignupLoginTests(TestCase):
    def test_signup_creates_user_profile_and_session(self):              # AUTH-001
        c = csrf_client()
        r = c.post("/api/auth/signup/", {"username": "newuser", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["username"], "newuser")
        self.assertFalse(r.json()["onboarded"])
        self.assertTrue(Profile.objects.filter(user__username="newuser").exists())
        self.assertEqual(c.get("/api/auth/me/").status_code, 200)

    def test_signup_duplicate_username_is_field_error(self):            # AUTH-002
        User.objects.create_user("taken", password="Str0ngPass!23")
        r = csrf_client().post("/api/auth/signup/", {"username": "taken", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.json()["error"]["fields"])

    def test_signup_weak_password_is_field_error(self):                 # AUTH-003
        r = csrf_client().post("/api/auth/signup/", {"username": "x1", "password": "123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("password", r.json()["error"]["fields"])

    def test_login_ok_and_wrong_password(self):                         # AUTH-004/005
        User.objects.create_user("ann", password="Str0ngPass!23")
        c = csrf_client()
        bad = c.post("/api/auth/login/", {"username": "ann", "password": "nope"}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(bad.json()["error"]["code"], "invalid_credentials")
        ok = c.post("/api/auth/login/", {"username": "ann", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["username"], "ann")

    def test_logout_ends_session(self):                                 # AUTH-006
        User.objects.create_user("ann", password="Str0ngPass!23")
        c = csrf_client()
        c.post("/api/auth/login/", {"username": "ann", "password": "Str0ngPass!23"}, format="json")
        self.assertEqual(c.post("/api/auth/logout/").status_code, 204)
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

    def test_me_requires_login(self):                                   # SEC-001
        r = APIClient().get("/api/auth/me/")
        self.assertIn(r.status_code, (401, 403))
        self.assertIn("error", r.json())


class ProfileTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="Str0ngPass!23")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_patch_preferences(self):
        r = self.c.patch("/api/auth/me/", {"display_name": "Ann", "diet": "vegetarian",
                                            "intolerances": ["gluten", "peanut"], "onboarded": True}, format="json")
        self.assertEqual(r.status_code, 200)
        p = Profile.objects.get(user=self.user)
        self.assertEqual((p.display_name, p.diet, p.intolerances, p.onboarded),
                         ("Ann", "vegetarian", ["gluten", "peanut"], True))

    def test_unknown_diet_and_intolerance_rejected(self):
        r = self.c.patch("/api/auth/me/", {"diet": "carnivore", "intolerances": ["kryptonite"]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("diet", r.json()["error"]["fields"])
        self.assertIn("intolerances", r.json()["error"]["fields"])

    def test_is_demo_cannot_be_patched(self):
        self.c.patch("/api/auth/me/", {"is_demo": True}, format="json")
        self.assertFalse(Profile.objects.get(user=self.user).is_demo)

    def test_display_name_trimmed_and_limited(self):
        r = self.c.patch("/api/auth/me/", {"display_name": "x" * 61}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_change_password(self):
        r = self.c.post("/api/auth/password/", {"old_password": "Str0ngPass!23",
                                                 "new_password": "An0therStr0ng!"}, format="json")
        self.assertEqual(r.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("An0therStr0ng!"))

    def test_change_password_wrong_old(self):
        r = self.c.post("/api/auth/password/", {"old_password": "bad", "new_password": "An0therStr0ng!"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("old_password", r.json()["error"]["fields"])


class DemoTests(TestCase):
    def test_demo_login_creates_and_logs_in_demo_user(self):
        c = csrf_client()
        r = c.post("/api/auth/demo/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["username"], DEMO_USERNAME)
        self.assertTrue(r.json()["is_demo"])
        self.assertEqual(c.get("/api/auth/me/").json()["username"], DEMO_USERNAME)

    def test_demo_user_cannot_change_password(self):                    # Review Focus 5
        c = csrf_client()
        c.post("/api/auth/demo/")
        r = c.post("/api/auth/password/", {"old_password": "x", "new_password": "An0therStr0ng!"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["error"]["code"], "demo_read_only")

    def test_demo_user_cannot_log_in_with_password(self):
        csrf_client().post("/api/auth/demo/")
        self.assertFalse(User.objects.get(username=DEMO_USERNAME).has_usable_password())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python manage.py test accounts`
Expected: FAIL (`No module named accounts`).

- [ ] **Step 3: Models, signal, app config**

`backend/accounts/apps.py`:

```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        from . import signals  # noqa: F401
```

`backend/accounts/models.py`:

```python
from django.contrib.auth.models import User
from django.db import models

DEMO_USERNAME = "demo"

# Values accepted by Spoonacular's `diet` and `intolerances` parameters
DIETS = ["", "vegetarian", "vegan", "pescetarian", "gluten free", "ketogenic", "paleo"]
INTOLERANCES = ["dairy", "egg", "gluten", "grain", "peanut", "seafood", "sesame",
                "shellfish", "soy", "sulfite", "tree nut", "wheat"]


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=60, blank=True)
    diet = models.CharField(max_length=20, blank=True, choices=[(d, d or "none") for d in DIETS])
    intolerances = models.JSONField(default=list, blank=True)
    onboarded = models.BooleanField(default=False)
    is_demo = models.BooleanField(default=False)

    def __str__(self):
        return f"Profile for {self.user.username}"
```

`backend/accounts/signals.py`:

```python
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
```

`backend/accounts/admin.py`:

```python
from django.contrib import admin

from .models import Profile

admin.site.register(Profile)
```

Add `"accounts"` to `INSTALLED_APPS` in `base.py` (before `"core"`). Run `python manage.py makemigrations accounts`.

- [ ] **Step 4: Serializers**

`backend/accounts/serializers.py`:

```python
from django.contrib.auth import password_validation
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import DIETS, INTOLERANCES


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(max_length=60, allow_blank=True, required=False, trim_whitespace=True)
    diet = serializers.ChoiceField(choices=DIETS, required=False, allow_blank=True)
    intolerances = serializers.ListField(child=serializers.ChoiceField(choices=INTOLERANCES), required=False)
    onboarded = serializers.BooleanField(required=False)
    is_demo = serializers.BooleanField(read_only=True)

    def to_representation(self, user):
        p = user.profile
        return {"id": user.id, "username": user.username, "display_name": p.display_name,
                "diet": p.diet, "intolerances": p.intolerances, "onboarded": p.onboarded,
                "is_demo": p.is_demo}

    def update(self, user, validated):
        p = user.profile
        for field in ("display_name", "diet", "intolerances", "onboarded"):
            if field in validated:
                setattr(p, field, validated[field])
        p.save()
        return user


class SignupSerializer(serializers.Serializer):
    username = serializers.RegexField(r"^[\w.@+-]{3,150}$")
    password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is taken. Try another.")
        return value

    def validate(self, attrs):
        try:
            password_validation.validate_password(attrs["password"], User(username=attrs["username"]))
        except Exception as e:  # django ValidationError
            raise serializers.ValidationError({"password": list(getattr(e, "messages", [str(e)]))})
        return attrs

    def create(self, validated):
        return User.objects.create_user(validated["username"], password=validated["password"])


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class PasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": ["That isn't your current password."]})
        try:
            password_validation.validate_password(attrs["new_password"], user)
        except Exception as e:
            raise serializers.ValidationError({"new_password": list(getattr(e, "messages", [str(e)]))})
        return attrs
```

- [ ] **Step 5: Demo helper and views**

`backend/accounts/demo.py`:

```python
from django.contrib.auth.models import User

from .models import DEMO_USERNAME


def ensure_demo_user() -> User:
    user, created = User.objects.get_or_create(username=DEMO_USERNAME)
    if created or user.has_usable_password():
        user.set_unusable_password()
        user.save()
    profile = user.profile
    if not profile.is_demo:
        profile.is_demo = True
        profile.display_name = profile.display_name or "Guest chef"
        profile.onboarded = True
        profile.save()
    return user
```

`backend/accounts/views.py`:

```python
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from meal_hacker.api_errors import api_error

from .demo import ensure_demo_user
from .serializers import LoginSerializer, MeSerializer, PasswordSerializer, SignupSerializer

BACKEND = "django.contrib.auth.backends.ModelBackend"


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    return Response({"csrfToken": get_token(request)})


# DRF skips CSRF for anonymous users, so the views that create a session enforce it explicitly.
@csrf_protect
@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    s = SignupSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    user = s.save()
    login(request, user, backend=BACKEND)
    return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


@csrf_protect
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    s = LoginSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    user = authenticate(request, username=s.validated_data["username"], password=s.validated_data["password"])
    if user is None:
        return api_error("invalid_credentials", "That username and password don't match.", 400)
    login(request, user)
    return Response(MeSerializer(user).data)


@csrf_protect
@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@csrf_protect
@api_view(["POST"])
@permission_classes([AllowAny])
def demo_login(request):
    user = ensure_demo_user()
    login(request, user, backend=BACKEND)
    return Response(MeSerializer(user).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        s = MeSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
    return Response(MeSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    if request.user.profile.is_demo:
        return api_error("demo_read_only", "The demo kitchen's password can't be changed.", 403)
    s = PasswordSerializer(data=request.data, context={"request": request})
    s.is_valid(raise_exception=True)
    request.user.set_password(s.validated_data["new_password"])
    request.user.save()
    update_session_auth_hash(request, request.user)
    return Response(status=status.HTTP_204_NO_CONTENT)
```

`backend/accounts/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf, name="api-csrf"),
    path("auth/signup/", views.signup, name="api-signup"),
    path("auth/login/", views.login_view, name="api-login"),
    path("auth/logout/", views.logout_view, name="api-logout"),
    path("auth/demo/", views.demo_login, name="api-demo"),
    path("auth/me/", views.me, name="api-me"),
    path("auth/password/", views.change_password, name="api-password"),
]
```

In `meal_hacker/urls.py` add `path("", include("accounts.urls"))` to `api_patterns`.

- [ ] **Step 6: Run tests**

Run: `python manage.py test accounts meal_hacker`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A backend && git commit -m "feat(accounts): profile model and session auth API with demo login

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `kitchen` app — inventory, quick-add parsing, notes

**Files:**
- Create: `backend/kitchen/{__init__,apps,models,parsing,matching,serializers,views,urls,admin}.py`, `backend/kitchen/migrations/__init__.py`, `backend/kitchen/tests/{__init__,test_parsing,test_matching,test_api}.py`
- Modify: `base.py` INSTALLED_APPS (`"kitchen"`), `meal_hacker/urls.py` (include `kitchen.urls`)

**Interfaces:**
- Produces:
  - `kitchen.models.InventoryItem` (fields: `user`, `name` ≤100, `quantity` ≤50 blank, `unit` ≤20 blank, `category` choices `Fridge|Pantry|Freezer` default `Fridge`, `expiry_date` nullable, `date_added` auto, `updated_at` auto, `used_at` nullable datetime); method `expires_soon() -> bool` (expiry ≤ today+3, including past); method `days_left() -> Optional[int]`; manager-free queryset helper `InventoryItem.active_for(user)` returning items with `used_at IS NULL`.
  - `kitchen.models.Note` (`user` O2O, `note` text, `updated_at`).
  - `kitchen.parsing.parse_quick_add(text: str) -> tuple[str, str]` returning `(quantity, name)`.
  - `kitchen.matching.normalise(name: str) -> str` and `kitchen.matching.have_ingredient(inventory_names: set[str], ingredient_name: str) -> bool` (inventory_names must already be normalised).
  - Endpoints: `GET/POST /api/inventory/` (POST accepts `{"text"}` or `{"name","quantity","unit","category","expiry_date"}`), `GET/PATCH/DELETE /api/inventory/{id}/`, `POST /api/inventory/{id}/use/`, `GET/PUT /api/note/`. Item JSON: `{"id","name","quantity","unit","category","expiry_date","days_left","expires_soon","date_added"}`. `GET /api/inventory/?category=Fridge` filters; default order: expiry ascending with nulls last, then name.

- [ ] **Step 1: Write failing parsing and matching tests**

`backend/kitchen/tests/test_parsing.py`:

```python
from django.test import SimpleTestCase

from kitchen.parsing import parse_quick_add


class ParseQuickAddTests(SimpleTestCase):
    def test_number_then_name(self):
        self.assertEqual(parse_quick_add("2 red peppers"), ("2", "red peppers"))

    def test_number_with_unit(self):
        self.assertEqual(parse_quick_add("500g mince"), ("500g", "mince"))
        self.assertEqual(parse_quick_add("1.5 kg potatoes"), ("1.5 kg", "potatoes"))

    def test_unicode_fraction(self):                          # Review Focus 1
        self.assertEqual(parse_quick_add("½ lemon"), ("½", "lemon"))

    def test_name_only(self):
        self.assertEqual(parse_quick_add("  basil  "), ("", "basil"))

    def test_bare_number_becomes_name(self):                  # Review Focus 1
        self.assertEqual(parse_quick_add("7"), ("", "7"))

    def test_collapses_whitespace(self):
        self.assertEqual(parse_quick_add("3   spring   onions"), ("3", "spring onions"))
```

`backend/kitchen/tests/test_matching.py`:

```python
from django.test import SimpleTestCase

from kitchen.matching import have_ingredient, normalise


class MatchingTests(SimpleTestCase):
    def test_normalise_lowercases_and_singularises(self):
        self.assertEqual(normalise("  Tomatoes "), "tomato")
        self.assertEqual(normalise("Chicken Thighs"), "chicken thigh")
        self.assertEqual(normalise("berries"), "berry")
        self.assertEqual(normalise("Hummus"), "hummus")
        self.assertEqual(normalise(""), "")
        self.assertEqual(normalise(None), "")

    def test_have_ingredient_exact_and_partial(self):
        inv = {normalise(n) for n in ["Chicken thighs", "garlic", "Cheddar cheese"]}
        self.assertTrue(have_ingredient(inv, "chicken thigh"))
        self.assertTrue(have_ingredient(inv, "garlic cloves"))
        self.assertTrue(have_ingredient(inv, "cheddar"))
        self.assertFalse(have_ingredient(inv, "beef"))
        self.assertFalse(have_ingredient(inv, ""))

    def test_short_words_do_not_false_match(self):
        inv = {normalise("egg")}
        self.assertFalse(have_ingredient(inv, "eggplant"))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python manage.py test kitchen`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement parsing and matching**

`backend/kitchen/parsing.py`:

```python
import re
from typing import Tuple

_QTY = re.compile(
    r"^(?P<qty>(?:\d+(?:[.,]\d+)?|[¼½¾⅓⅔⅛])(?:\s?(?:g|kg|ml|l|oz|lb|tbsp|tsp|cups?|pcs?|x))?)\s+(?P<name>.+)$",
    re.IGNORECASE,
)


def parse_quick_add(text: str) -> Tuple[str, str]:
    cleaned = " ".join((text or "").split())
    m = _QTY.match(cleaned)
    if m:
        return m.group("qty"), m.group("name")
    return "", cleaned
```

`backend/kitchen/matching.py`:

```python
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
```

Run: `python manage.py test kitchen.tests.test_parsing kitchen.tests.test_matching`
Expected: PASS.

- [ ] **Step 4: Write failing API tests**

`backend/kitchen/tests/test_api.py`:

```python
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from kitchen.models import InventoryItem, Note


class InventoryModelTests(TestCase):
    def test_expires_soon_boundaries(self):                              # INV-exp-01..05
        today = timezone.localdate()
        self.assertFalse(InventoryItem(name="Flour").expires_soon())
        self.assertTrue(InventoryItem(name="a", expiry_date=today).expires_soon())
        self.assertTrue(InventoryItem(name="a", expiry_date=today + timedelta(days=3)).expires_soon())
        self.assertFalse(InventoryItem(name="a", expiry_date=today + timedelta(days=4)).expires_soon())
        self.assertTrue(InventoryItem(name="a", expiry_date=today - timedelta(days=2)).expires_soon())

    def test_days_left(self):
        today = timezone.localdate()
        self.assertIsNone(InventoryItem(name="a").days_left())
        self.assertEqual(InventoryItem(name="a", expiry_date=today + timedelta(days=2)).days_left(), 2)


class InventoryApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_requires_login(self):
        self.assertIn(APIClient().get("/api/inventory/").status_code, (401, 403))

    def test_create_from_fields(self):
        r = self.c.post("/api/inventory/", {"name": "Milk", "quantity": "1", "unit": "l",
                                             "category": "Fridge", "expiry_date": "2030-01-01"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["name"], "Milk")
        self.assertEqual(r.json()["category"], "Fridge")

    def test_create_from_quick_add_text(self):
        r = self.c.post("/api/inventory/", {"text": "2 red peppers", "category": "Fridge"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.json()["quantity"], r.json()["name"]), ("2", "red peppers"))

    def test_blank_name_rejected(self):                                  # MH-B shoppinglist/inventory blank
        r = self.c.post("/api/inventory/", {"text": "   "}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("name", r.json()["error"]["fields"])
        self.assertEqual(InventoryItem.objects.count(), 0)

    def test_invalid_date_rejected_not_500(self):                        # fix/inventory-invalid-date
        r = self.c.post("/api/inventory/", {"name": "Milk", "expiry_date": "31/12/2030"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("expiry_date", r.json()["error"]["fields"])

    def test_invalid_category_rejected(self):
        r = self.c.post("/api/inventory/", {"name": "Milk", "category": "Garage"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_list_only_own_active_sorted_by_expiry_nulls_last(self):
        today = timezone.localdate()
        InventoryItem.objects.create(user=self.user, name="NoDate")
        InventoryItem.objects.create(user=self.user, name="Later", expiry_date=today + timedelta(days=9))
        InventoryItem.objects.create(user=self.user, name="Soon", expiry_date=today + timedelta(days=1))
        InventoryItem.objects.create(user=self.user, name="Used", used_at=timezone.now())
        InventoryItem.objects.create(user=self.other, name="NotMine")
        names = [i["name"] for i in self.c.get("/api/inventory/").json()]
        self.assertEqual(names, ["Soon", "Later", "NoDate"])

    def test_filter_by_category(self):
        InventoryItem.objects.create(user=self.user, name="Peas", category="Freezer")
        InventoryItem.objects.create(user=self.user, name="Rice", category="Pantry")
        names = [i["name"] for i in self.c.get("/api/inventory/?category=Freezer").json()]
        self.assertEqual(names, ["Peas"])

    def test_patch_and_delete_own(self):
        item = InventoryItem.objects.create(user=self.user, name="Milk")
        r = self.c.patch(f"/api/inventory/{item.id}/", {"category": "Pantry", "quantity": "2"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["category"], "Pantry")
        self.assertEqual(self.c.delete(f"/api/inventory/{item.id}/").status_code, 204)
        self.assertFalse(InventoryItem.objects.filter(id=item.id).exists())

    def test_cannot_touch_other_users_item(self):                        # SEC IDOR
        item = InventoryItem.objects.create(user=self.other, name="Secret")
        self.assertEqual(self.c.patch(f"/api/inventory/{item.id}/", {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/inventory/{item.id}/").status_code, 404)
        self.assertEqual(self.c.post(f"/api/inventory/{item.id}/use/").status_code, 404)
        self.assertTrue(InventoryItem.objects.filter(id=item.id, name="Secret").exists())

    def test_get_cannot_delete(self):                                    # GET-delete CSRF fix
        item = InventoryItem.objects.create(user=self.user, name="Milk")
        self.c.get(f"/api/inventory/{item.id}/")
        self.assertTrue(InventoryItem.objects.filter(id=item.id).exists())

    def test_mark_used_hides_from_list(self):
        item = InventoryItem.objects.create(user=self.user, name="Milk")
        r = self.c.post(f"/api/inventory/{item.id}/use/")
        self.assertEqual(r.status_code, 200)
        item.refresh_from_db()
        self.assertIsNotNone(item.used_at)
        self.assertEqual(self.c.get("/api/inventory/").json(), [])


class NoteApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_get_creates_empty_note(self):
        r = self.c.get("/api/note/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["note"], "")
        self.assertTrue(Note.objects.filter(user=self.user).exists())

    def test_put_saves_note(self):                                       # SEC notes form
        r = self.c.put("/api/note/", {"note": "<script>x</script> buy eggs"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Note.objects.get(user=self.user).note, "<script>x</script> buy eggs")

    def test_note_length_limited(self):
        r = self.c.put("/api/note/", {"note": "x" * 5001}, format="json")
        self.assertEqual(r.status_code, 400)
```

- [ ] **Step 5: Run to verify failure**

Run: `python manage.py test kitchen.tests.test_api`
Expected: FAIL.

- [ ] **Step 6: Models**

`backend/kitchen/apps.py`:

```python
from django.apps import AppConfig


class KitchenConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "kitchen"
```

`backend/kitchen/models.py`:

```python
from datetime import timedelta
from typing import Optional

from django.contrib.auth.models import User
from django.db import models
from django.db.models import F
from django.utils import timezone


class InventoryItem(models.Model):
    CATEGORIES = [("Fridge", "Fridge"), ("Pantry", "Pantry"), ("Freezer", "Freezer")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="inventory")
    name = models.CharField(max_length=100)
    quantity = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=10, choices=CATEGORIES, default="Fridge")
    expiry_date = models.DateField(null=True, blank=True)
    date_added = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = [F("expiry_date").asc(nulls_last=True), "name"]

    @classmethod
    def active_for(cls, user):
        return cls.objects.filter(user=user, used_at__isnull=True)

    def expires_soon(self) -> bool:
        if self.expiry_date:
            return self.expiry_date <= timezone.localdate() + timedelta(days=3)
        return False

    def days_left(self) -> Optional[int]:
        if not self.expiry_date:
            return None
        return (self.expiry_date - timezone.localdate()).days

    def __str__(self):
        return self.name


class Note(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="note")
    note = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note for {self.user.username}"
```

`backend/kitchen/admin.py`:

```python
from django.contrib import admin

from .models import InventoryItem, Note

admin.site.register(InventoryItem)
admin.site.register(Note)
```

Add `"kitchen"` to INSTALLED_APPS. Run `python manage.py makemigrations kitchen`.

- [ ] **Step 7: Serializers, views, urls**

`backend/kitchen/serializers.py`:

```python
from rest_framework import serializers

from .models import InventoryItem, Note
from .parsing import parse_quick_add


class InventoryItemSerializer(serializers.ModelSerializer):
    text = serializers.CharField(write_only=True, required=False, allow_blank=True)
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    days_left = serializers.IntegerField(read_only=True)
    expires_soon = serializers.BooleanField(read_only=True)
    expiry_date = serializers.DateField(required=False, allow_null=True, input_formats=["%Y-%m-%d"])

    class Meta:
        model = InventoryItem
        fields = ["id", "text", "name", "quantity", "unit", "category", "expiry_date",
                  "days_left", "expires_soon", "date_added"]
        read_only_fields = ["id", "date_added"]

    def validate(self, attrs):
        text = attrs.pop("text", None)
        if text is not None and not attrs.get("name"):
            qty, name = parse_quick_add(text)
            attrs["name"] = name
            attrs.setdefault("quantity", qty)
        if "name" in attrs:
            attrs["name"] = " ".join(attrs["name"].split())
        creating = self.instance is None
        if (creating or "name" in attrs) and not attrs.get("name"):
            raise serializers.ValidationError({"name": ["Enter an ingredient name."]})
        return attrs


class NoteSerializer(serializers.ModelSerializer):
    note = serializers.CharField(max_length=5000, allow_blank=True, trim_whitespace=False)

    class Meta:
        model = Note
        fields = ["note", "updated_at"]
        read_only_fields = ["updated_at"]
```

`backend/kitchen/views.py`:

```python
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import InventoryItem, Note
from .serializers import InventoryItemSerializer, NoteSerializer


class InventoryList(generics.ListCreateAPIView):
    serializer_class = InventoryItemSerializer
    pagination_class = None

    def get_queryset(self):
        qs = InventoryItem.active_for(self.request.user)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class InventoryDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InventoryItemSerializer
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return InventoryItem.objects.filter(user=self.request.user)


@api_view(["POST"])
def use_item(request, pk):
    item = get_object_or_404(InventoryItem, pk=pk, user=request.user)
    item.used_at = timezone.now()
    item.save(update_fields=["used_at", "updated_at"])
    return Response(InventoryItemSerializer(item).data)


@api_view(["GET", "PUT"])
def note(request):
    obj, _ = Note.objects.get_or_create(user=request.user)
    if request.method == "PUT":
        s = NoteSerializer(obj, data=request.data)
        s.is_valid(raise_exception=True)
        s.save()
    return Response(NoteSerializer(obj).data)
```

`backend/kitchen/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("inventory/", views.InventoryList.as_view(), name="api-inventory"),
    path("inventory/<int:pk>/", views.InventoryDetail.as_view(), name="api-inventory-detail"),
    path("inventory/<int:pk>/use/", views.use_item, name="api-inventory-use"),
    path("note/", views.note, name="api-note"),
]
```

Add `path("", include("kitchen.urls"))` to `api_patterns`.

- [ ] **Step 8: Run tests**

Run: `python manage.py test kitchen accounts meal_hacker`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A backend && git commit -m "feat(kitchen): inventory and notes API with quick-add parsing and ingredient matching

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `recipes` — RecipeCache, Spoonacular client, normalisation, offline sample data

**Files:**
- Create: `backend/recipes/{__init__,apps,models,normalise,spoonacular,admin}.py`, `backend/recipes/sample_recipes.json`, `backend/recipes/migrations/__init__.py`, `backend/recipes/tests/{__init__,test_normalise,test_client}.py`
- Modify: INSTALLED_APPS (`"recipes"`)

**Interfaces:**
- Consumes: `kitchen.matching.normalise`, `have_ingredient`.
- Produces:
  - `recipes.models.RecipeCache` (`key` unique char 64, `endpoint` char 100, `payload` JSON, `fetched_at`, `expires_at`).
  - `recipes.normalise.describe(summary_html: Optional[str], limit: int = 160) -> str`.
  - `recipes.normalise.summary_from_api(raw: dict, inventory: set[str]) -> dict` → RecipeSummary `{"id": int, "title": str, "image": str, "description": str, "ready_in_minutes": Optional[int], "servings": Optional[int], "diets": list[str], "used": list[str], "missing": list[{"name": str, "aisle": str}]}`.
  - `recipes.normalise.detail_from_api(raw: dict, inventory: set[str]) -> dict` → RecipeSummary plus `"ingredients": list[{"name","amount","unit","original","aisle","have": bool}]`, `"steps": list[str]`, `"source_url": str`, `"cuisines": list[str]`.
  - `recipes.spoonacular.Result` dataclass `(data: Any, stale: bool)`.
  - `recipes.spoonacular.SpoonacularUnavailable(Exception)`.
  - `recipes.spoonacular.search(params: dict) -> Result` (complexSearch with `addRecipeInformation`, `fillIngredients`; `data` = list of raw results).
  - `recipes.spoonacular.information(recipe_id: int) -> Result` (`data` = raw recipe dict).
  - `recipes.spoonacular.is_offline() -> bool` (True when `settings.SPOONACULAR_API_KEY` is empty).
  - TTLs: `SEARCH_TTL = timedelta(hours=24)`, `DETAIL_TTL = timedelta(days=7)`.

- [ ] **Step 1: Write failing normalisation tests**

`backend/recipes/tests/test_normalise.py`:

```python
from django.test import SimpleTestCase

from kitchen.matching import normalise
from recipes.normalise import describe, detail_from_api, summary_from_api

RAW = {
    "id": 716429,
    "title": "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs",
    "image": "https://img.spoonacular.com/recipes/716429-556x370.jpg",
    "summary": "<b>Pasta with Garlic</b> is a <a href='x'>main course</a> that serves 2. "
               "One serving contains 584 calories &amp; it's loved by many cooks who want something quick.",
    "readyInMinutes": 45,
    "servings": 2,
    "diets": ["dairy free"],
    "cuisines": ["Italian"],
    "sourceUrl": "https://example.com/pasta",
    "extendedIngredients": [
        {"name": "garlic", "amount": 2, "unit": "cloves", "original": "2 cloves garlic", "aisle": "Produce"},
        {"name": "cauliflower florets", "amount": 2, "unit": "cups", "original": "2 cups cauliflower", "aisle": "Produce"},
        {"amount": 1, "unit": "", "original": "mystery"},
    ],
    "analyzedInstructions": [{"steps": [{"number": 1, "step": "Boil pasta."}, {"number": 2, "step": "Toss."}]}],
}


class DescribeTests(SimpleTestCase):
    def test_strips_html_and_entities(self):
        d = describe(RAW["summary"])
        self.assertNotIn("<", d)
        self.assertIn("&", d)
        self.assertTrue(d.startswith("Pasta with Garlic is a main course"))

    def test_truncates_at_word_boundary(self):
        d = describe(RAW["summary"], limit=40)
        self.assertLessEqual(len(d), 41)
        self.assertTrue(d.endswith("…"))
        self.assertFalse(d[:-1].endswith(" "))

    def test_none_and_empty(self):                                # Review Focus 3
        self.assertEqual(describe(None), "")
        self.assertEqual(describe(""), "")


class SummaryTests(SimpleTestCase):
    def test_summary_from_complex_search_result(self):
        raw = dict(RAW, usedIngredients=[{"name": "garlic"}],
                   missedIngredients=[{"name": "scallions", "aisle": "Produce"}, {"aisle": "?"}])
        s = summary_from_api(raw, {normalise("Garlic")})
        self.assertEqual(s["id"], 716429)
        self.assertEqual(s["ready_in_minutes"], 45)
        self.assertEqual(s["used"], ["garlic"])
        self.assertEqual(s["missing"], [{"name": "scallions", "aisle": "Produce"}])
        self.assertTrue(s["description"])

    def test_summary_without_used_lists_falls_back_to_matching(self):
        s = summary_from_api(RAW, {normalise("garlic")})
        self.assertEqual(s["used"], ["garlic"])
        self.assertEqual([m["name"] for m in s["missing"]], ["cauliflower florets"])

    def test_missing_fields_do_not_raise(self):                   # Review Focus 3
        s = summary_from_api({"id": 1}, set())
        self.assertEqual(s["title"], "Untitled recipe")
        self.assertEqual(s["description"], "")
        self.assertEqual(s["used"], [])


class DetailTests(SimpleTestCase):
    def test_detail(self):
        d = detail_from_api(RAW, {normalise("garlic")})
        self.assertEqual(d["steps"], ["Boil pasta.", "Toss."])
        self.assertEqual(d["cuisines"], ["Italian"])
        names = [(i["name"], i["have"]) for i in d["ingredients"]]
        self.assertEqual(names, [("garlic", True), ("cauliflower florets", False), ("mystery", False)])
        self.assertEqual(d["source_url"], "https://example.com/pasta")
```

- [ ] **Step 2: Run to verify failure**

Run: `python manage.py test recipes`
Expected: FAIL.

- [ ] **Step 3: Implement normalisation**

`backend/recipes/apps.py`:

```python
from django.apps import AppConfig


class RecipesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "recipes"
```

`backend/recipes/normalise.py`:

```python
import html
from typing import Any, Dict, List, Optional, Set

from django.utils.html import strip_tags

from kitchen.matching import have_ingredient


def describe(summary_html: Optional[str], limit: int = 160) -> str:
    if not summary_html:
        return ""
    text = " ".join(html.unescape(strip_tags(summary_html)).split())
    if len(text) <= limit:
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
            name = _ingredient_name(i)
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
        "ingredients": ingredients,
        "steps": _steps(raw),
        "source_url": raw.get("sourceUrl") or "",
        "cuisines": list(raw.get("cuisines") or []),
    })
    return base
```

Run: `python manage.py test recipes.tests.test_normalise`
Expected: PASS.

- [ ] **Step 4: Write failing client tests**

`backend/recipes/tests/test_client.py`:

```python
from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from recipes import spoonacular
from recipes.models import RecipeCache


def fake_response(payload, status=200):
    m = mock.Mock()
    m.status_code = status
    m.json.return_value = payload
    if status >= 400:
        import requests
        m.raise_for_status.side_effect = requests.HTTPError(f"{status}")
    else:
        m.raise_for_status.return_value = None
    return m


@override_settings(SPOONACULAR_API_KEY="test-key")
class LiveClientTests(TestCase):
    def test_search_calls_api_once_then_uses_cache(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": [{"id": 1}]})) as g:
            r1 = spoonacular.search({"query": "pasta"})
            r2 = spoonacular.search({"query": "pasta"})
        self.assertEqual(g.call_count, 1)
        self.assertEqual(r1.data, [{"id": 1}])
        self.assertEqual(r2.data, [{"id": 1}])
        self.assertFalse(r2.stale)
        params = g.call_args.kwargs["params"]
        self.assertEqual(params["apiKey"], "test-key")
        self.assertTrue(params["addRecipeInformation"])

    def test_cache_key_ignores_param_order_and_api_key(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": []})) as g:
            spoonacular.search({"query": "a", "diet": "vegan"})
            spoonacular.search({"diet": "vegan", "query": "a"})
        self.assertEqual(g.call_count, 1)
        self.assertNotIn("test-key", RecipeCache.objects.get().key)

    def test_expired_cache_refetches(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": [{"id": 1}]})) as g:
            spoonacular.search({"query": "x"})
            RecipeCache.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
            spoonacular.search({"query": "x"})
        self.assertEqual(g.call_count, 2)

    def test_quota_error_serves_stale_cache(self):                    # Review Focus 2
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"results": [{"id": 7}]})):
            spoonacular.search({"query": "y"})
        RecipeCache.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        with mock.patch("recipes.spoonacular.requests.get", return_value=fake_response({}, status=402)):
            r = spoonacular.search({"query": "y"})
        self.assertTrue(r.stale)
        self.assertEqual(r.data, [{"id": 7}])

    def test_failure_without_cache_raises_unavailable(self):          # Review Focus 2
        import requests
        with mock.patch("recipes.spoonacular.requests.get", side_effect=requests.ConnectionError()):
            with self.assertRaises(spoonacular.SpoonacularUnavailable):
                spoonacular.information(42)

    def test_information_uses_detail_ttl(self):
        with mock.patch("recipes.spoonacular.requests.get",
                        return_value=fake_response({"id": 42, "title": "T"})):
            r = spoonacular.information(42)
        self.assertEqual(r.data["id"], 42)
        entry = RecipeCache.objects.get()
        self.assertGreater(entry.expires_at - entry.fetched_at, timedelta(days=6))


@override_settings(SPOONACULAR_API_KEY="")
class OfflineClientTests(TestCase):
    def test_offline_never_calls_network(self):
        with mock.patch("recipes.spoonacular.requests.get") as g:
            r = spoonacular.search({"query": ""})
            self.assertTrue(spoonacular.is_offline())
        g.assert_not_called()
        self.assertGreaterEqual(len(r.data), 8)
        self.assertTrue(all(x.get("summary") for x in r.data))

    def test_offline_search_filters_by_query_and_ingredients(self):
        r = spoonacular.search({"query": "soup"})
        self.assertTrue(all("soup" in x["title"].lower() for x in r.data))
        r2 = spoonacular.search({"includeIngredients": "garlic", "sort": "max-used-ingredients"})
        self.assertTrue(all(any(i["name"] == "garlic" for i in x["usedIngredients"]) for x in r2.data))

    def test_offline_information_by_id_and_unknown(self):
        first = spoonacular.search({}).data[0]
        self.assertEqual(spoonacular.information(first["id"]).data["id"], first["id"])
        with self.assertRaises(spoonacular.SpoonacularUnavailable):
            spoonacular.information(999999999)
```

- [ ] **Step 5: Run to verify failure**

Run: `python manage.py test recipes.tests.test_client`
Expected: FAIL.

- [ ] **Step 6: Model**

`backend/recipes/models.py`:

```python
from django.db import models


class RecipeCache(models.Model):
    key = models.CharField(max_length=64, unique=True)
    endpoint = models.CharField(max_length=100)
    payload = models.JSONField()
    fetched_at = models.DateTimeField()
    expires_at = models.DateTimeField(db_index=True)

    def __str__(self):
        return f"{self.endpoint} ({self.key[:8]})"
```

`backend/recipes/admin.py`:

```python
from django.contrib import admin

from .models import RecipeCache

admin.site.register(RecipeCache)
```

Add `"recipes"` to INSTALLED_APPS; `python manage.py makemigrations recipes`. (FavouriteRecipe is added in Task 5 with its own migration.)

- [ ] **Step 7: Client**

`backend/recipes/spoonacular.py`:

```python
"""The only module that talks to Spoonacular.

Every response is cached in RecipeCache. When the API fails, a stale cache
entry is served instead. When no API key is configured, hand-written sample
recipes are served so the demo works without credits.
"""
import hashlib
import json
from dataclasses import dataclass
from datetime import timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import requests
from django.conf import settings
from django.utils import timezone

from kitchen.matching import have_ingredient, normalise

from .models import RecipeCache

BASE_URL = "https://api.spoonacular.com"
SEARCH_TTL = timedelta(hours=24)
DETAIL_TTL = timedelta(days=7)
TIMEOUT = 10


class SpoonacularUnavailable(Exception):
    pass


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
        resp.raise_for_status()
        payload = resp.json()
    except (requests.RequestException, ValueError) as exc:
        if entry:
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
    for raw in _samples():
        if query and query not in raw["title"].lower():
            continue
        if diet and diet not in [d.lower() for d in raw.get("diets", [])]:
            continue
        if dish_type and dish_type not in [t.lower() for t in raw.get("dishTypes", [])]:
            continue
        if cuisine and cuisine not in [c.lower() for c in raw.get("cuisines", [])]:
            continue
        item = dict(raw)
        if wanted:
            used, missed = [], []
            for ing in raw.get("extendedIngredients", []):
                (used if have_ingredient(wanted, ing["name"]) else missed).append(
                    {"name": ing["name"], "aisle": ing.get("aisle", "")})
            if not used:
                continue
            item["usedIngredients"], item["missedIngredients"] = used, missed
            item["usedIngredientCount"], item["missedIngredientCount"] = len(used), len(missed)
        results.append(item)
    if wanted:
        results.sort(key=lambda r: (-r["usedIngredientCount"], r["missedIngredientCount"]))
    return results[: int(params.get("number") or 20)]


def search(params: Dict[str, Any]) -> Result:
    params = {k: v for k, v in params.items() if v not in ("", None)}
    if is_offline():
        return Result(_offline_search(params))
    full = {"addRecipeInformation": True, "fillIngredients": True, "number": 20, **params}
    result = _fetch("/recipes/complexSearch", full, SEARCH_TTL)
    data = result.data.get("results", []) if isinstance(result.data, dict) else []
    return Result(data, result.stale)


def information(recipe_id: int) -> Result:
    if is_offline():
        for raw in _samples():
            if raw["id"] == recipe_id:
                return Result(raw)
        raise SpoonacularUnavailable(f"No sample recipe {recipe_id}")
    return _fetch(f"/recipes/{recipe_id}/information", {"includeNutrition": False}, DETAIL_TTL)
```

- [ ] **Step 8: Sample recipes**

Create `backend/recipes/sample_recipes.json`: a JSON array of **at least 10** recipes. Each object uses the Spoonacular `information` shape with these keys: `id` (int), `title`, `image` (`https://img.spoonacular.com/recipes/<id>-556x370.jpg`), `summary` (2–3 sentences of plain-English HTML, written by you, appetising, no copied text), `readyInMinutes`, `servings`, `diets` (list), `cuisines` (list), `dishTypes` (list, from `main course`, `breakfast`, `soup`, `salad`, `side dish`, `dessert`), `sourceUrl` (`""`), `extendedIngredients` (5–9 items, each `{"name","amount","unit","original","aisle"}`, aisles from `Produce`, `Meat`, `Dairy`, `Pasta and Rice`, `Canned and Jarred`, `Spices and Seasonings`, `Bakery/Bread`, `Frozen`, `Baking`, `Oil, Vinegar, Salad Dressing`), `analyzedInstructions` (`[{"steps": [{"number": n, "step": "..."}]}]`, 4–7 steps). Use these ids and titles (real Spoonacular ids so the images resolve):

| id | title | dishTypes | diets |
|---|---|---|---|
| 716429 | Pasta with Garlic, Scallions, Cauliflower and Breadcrumbs | main course | dairy free |
| 715538 | Bruschetta Style Pork and Pasta | main course | |
| 782585 | Cannellini Bean and Asparagus Salad with Mushrooms | salad | vegan, gluten free |
| 716426 | Cauliflower, Brown Rice and Vegetable Fried Rice | main course | vegan, gluten free |
| 715497 | Berry Banana Breakfast Smoothie | breakfast | vegetarian, gluten free |
| 715415 | Red Lentil Soup with Chicken and Turnips | soup | gluten free, dairy free |
| 716406 | Asparagus and Pea Soup | soup | vegan, gluten free |
| 644387 | Garlicky Kale | side dish | vegan, gluten free |
| 715594 | Homemade Garlic and Basil French Fries | side dish | vegan |
| 716381 | Nigerian Snail Stew | main course | gluten free |
| 782601 | Red Kidney Bean Jambalaya | main course | vegan |
| 795751 | Chicken Fajita Stuffed Bell Pepper | main course | gluten free |

Ingredient names must be lowercase and simple (`garlic`, `spinach`, `chicken breast`, `red pepper`, `lemon`, `greek yogurt`, `cheddar`, `onion`, `tomato`, `rice`, `pasta`, `olive oil`) so they overlap with the demo inventory in Task 8 (spinach, greek yogurt, chicken thighs, cheddar, lemons, garlic, onions, rice, pasta, tomatoes, frozen peas, red peppers).

Validate: `python -c "import json;d=json.load(open('recipes/sample_recipes.json'));assert len(d)>=10;assert all(r['summary'] and r['extendedIngredients'] and r['analyzedInstructions'] for r in d);print(len(d))"`
Expected: prints `12`.

- [ ] **Step 9: Run tests**

Run: `python manage.py test recipes`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add -A backend && git commit -m "feat(recipes): cached Spoonacular client with stale fallback, offline sample recipes and normalisation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Recipe endpoints — suggestions, search, detail, favourites

**Files:**
- Modify: `backend/recipes/models.py` (add `FavouriteRecipe`), `backend/recipes/admin.py`
- Create: `backend/recipes/{services,serializers,views,urls}.py`, `backend/recipes/tests/test_api.py`
- Modify: `meal_hacker/urls.py` (include `recipes.urls`)

**Interfaces:**
- Consumes: `spoonacular.search/information/Result/SpoonacularUnavailable`, `normalise.summary_from_api/detail_from_api`, `kitchen.models.InventoryItem.active_for`, `kitchen.matching.normalise`, `accounts` Profile (`diet`, `intolerances`), `api_error`.
- Produces:
  - `recipes.services.inventory_names(user) -> set[str]` (normalised active inventory names).
  - `recipes.services.suggestions(user, limit: int = 8) -> tuple[list[dict], bool, Optional[str]]` → `(results, stale, reason)`; each result is a RecipeSummary plus `"uses_expiring": list[str]` and `"is_favourite": bool`; `reason` is `None` or `"need_more_ingredients"`.
  - `recipes.services.search(user, q, cuisine, dish_type, diet, matches_kitchen) -> tuple[list[dict], bool]`.
  - `recipes.services.recipe_detail(user, recipe_id: int) -> tuple[dict, bool]`.
  - `recipes.models.FavouriteRecipe` (`user`, `recipe_id` positive int, `title`, `image`, `description`, `created_at`; unique `(user, recipe_id)`).
  - Endpoints: `GET /api/recipes/suggestions/` → `{"results": [RecipeSummary+uses_expiring+is_favourite], "reason": Optional[str]}`; `GET /api/recipes/search/?q=&cuisine=&type=&diet=&matches_kitchen=1` → `{"results": [RecipeSummary+is_favourite]}`; `GET /api/recipes/{id}/` → RecipeDetail + `is_favourite`; `GET /api/favourites/` → list `{"recipe_id","title","image","description","created_at"}`; `POST /api/favourites/` `{"recipe_id"}`; `DELETE /api/favourites/{recipe_id}/`. Responses built from stale cache carry header `X-Stale: true`. Unavailable → 503 envelope code `recipes_unavailable`.
  - `suggestions` reason values: `"need_more_ingredients"` when the user has fewer than 3 active items (results empty).

- [ ] **Step 1: Write failing API tests**

`backend/recipes/tests/test_api.py`:

```python
from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from kitchen.models import InventoryItem
from recipes import spoonacular
from recipes.models import FavouriteRecipe


def add(user, *names, expiry_days=None):
    for n in names:
        InventoryItem.objects.create(
            user=user, name=n,
            expiry_date=(timezone.localdate() + timedelta(days=expiry_days)) if expiry_days is not None else None)


@override_settings(SPOONACULAR_API_KEY="")
class SuggestionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_requires_three_items(self):                                  # MEAL-001
        add(self.user, "garlic", "onion")
        r = self.c.get("/api/recipes/suggestions/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"results": [], "reason": "need_more_ingredients"})

    def test_results_have_description_and_counts(self):
        add(self.user, "garlic", "onion", "tomato", "rice")
        body = self.c.get("/api/recipes/suggestions/").json()
        self.assertIsNone(body["reason"])
        self.assertGreater(len(body["results"]), 0)
        first = body["results"][0]
        for key in ("id", "title", "image", "description", "ready_in_minutes", "used", "missing",
                    "uses_expiring", "is_favourite"):
            self.assertIn(key, first)
        self.assertTrue(first["description"])
        self.assertTrue(all(len(r["used"]) >= 2 for r in body["results"]))   # MEAL-filter >=2 used

    def test_pantry_staples_ignored(self):                                # MEAL ignore water/salt/pepper
        add(self.user, "water", "salt", "pepper")
        self.assertEqual(self.c.get("/api/recipes/suggestions/").json()["reason"], "need_more_ingredients")

    def test_expiring_ingredients_rank_first(self):                       # "use it up"
        add(self.user, "rice", "onion", "tomato")
        add(self.user, "spinach", "garlic", expiry_days=1)
        results = self.c.get("/api/recipes/suggestions/").json()["results"]
        self.assertTrue(results[0]["uses_expiring"])
        flags = [bool(r["uses_expiring"]) for r in results]
        self.assertEqual(flags, sorted(flags, reverse=True))

    def test_profile_diet_and_intolerances_sent_to_search(self):
        p = self.user.profile
        p.diet, p.intolerances = "vegan", ["gluten", "soy"]
        p.save()
        add(self.user, "garlic", "onion", "tomato")
        with mock.patch("recipes.services.spoonacular.search",
                        return_value=spoonacular.Result([])) as s:
            self.c.get("/api/recipes/suggestions/")
        params = s.call_args.args[0]
        self.assertEqual(params["diet"], "vegan")
        self.assertEqual(params["intolerances"], "gluten,soy")
        self.assertEqual(params["sort"], "max-used-ingredients")

    def test_unavailable_returns_503_envelope(self):                      # MEAL error path
        add(self.user, "garlic", "onion", "tomato")
        with mock.patch("recipes.services.spoonacular.search",
                        side_effect=spoonacular.SpoonacularUnavailable("down")):
            r = self.c.get("/api/recipes/suggestions/")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["error"]["code"], "recipes_unavailable")

    def test_stale_header(self):
        add(self.user, "garlic", "onion", "tomato")
        with mock.patch("recipes.services.spoonacular.search",
                        return_value=spoonacular.Result([], stale=True)):
            r = self.c.get("/api/recipes/suggestions/")
        self.assertEqual(r["X-Stale"], "true")


@override_settings(SPOONACULAR_API_KEY="")
class SearchAndDetailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_search_query_filter(self):
        r = self.c.get("/api/recipes/search/?q=soup")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["results"])
        self.assertTrue(all("soup" in x["title"].lower() for x in r.json()["results"]))

    def test_search_matches_kitchen_uses_inventory(self):
        add(self.user, "garlic")
        with mock.patch("recipes.services.spoonacular.search", return_value=spoonacular.Result([])) as s:
            self.c.get("/api/recipes/search/?matches_kitchen=1")
        self.assertIn("garlic", s.call_args.args[0]["includeIngredients"])

    def test_detail_have_missing(self):                                   # RD-*
        add(self.user, "garlic")
        r = self.c.get("/api/recipes/716429/")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertTrue(body["steps"])
        self.assertTrue(any(i["have"] for i in body["ingredients"]))
        self.assertFalse(body["is_favourite"])

    def test_detail_unknown_is_503_envelope(self):                        # fix/recipe-link-guard
        r = self.c.get("/api/recipes/123456789/")
        self.assertEqual(r.status_code, 503)
        self.assertIn("error", r.json())

    def test_detail_zero_id_is_404(self):
        self.assertEqual(self.c.get("/api/recipes/0/").status_code, 404)


@override_settings(SPOONACULAR_API_KEY="")
class FavouriteTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_add_list_remove(self):
        r = self.c.post("/api/favourites/", {"recipe_id": 716429}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["title"].startswith("Pasta with Garlic"))
        self.assertTrue(r.json()["description"])
        self.assertEqual(len(self.c.get("/api/favourites/").json()), 1)
        self.assertTrue(self.c.get("/api/recipes/716429/").json()["is_favourite"])
        self.assertEqual(self.c.delete("/api/favourites/716429/").status_code, 204)
        self.assertEqual(self.c.get("/api/favourites/").json(), [])

    def test_add_twice_is_idempotent(self):
        self.c.post("/api/favourites/", {"recipe_id": 716429}, format="json")
        r = self.c.post("/api/favourites/", {"recipe_id": 716429}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(FavouriteRecipe.objects.filter(user=self.user).count(), 1)

    def test_invalid_recipe_id(self):
        r = self.c.post("/api/favourites/", {"recipe_id": -5}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_cannot_see_or_delete_others(self):
        FavouriteRecipe.objects.create(user=self.other, recipe_id=716429, title="t")
        self.assertEqual(self.c.get("/api/favourites/").json(), [])
        self.assertEqual(self.c.delete("/api/favourites/716429/").status_code, 404)
        self.assertEqual(FavouriteRecipe.objects.count(), 1)
```

- [ ] **Step 2: Run to verify failure**

Run: `python manage.py test recipes.tests.test_api`
Expected: FAIL.

- [ ] **Step 3: FavouriteRecipe model**

Append to `backend/recipes/models.py`:

```python
from django.contrib.auth.models import User  # noqa: E402  (keep imports at top in the real file)


class FavouriteRecipe(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favourites")
    recipe_id = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    image = models.URLField(blank=True)
    description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "recipe_id"], name="unique_favourite")]

    def __str__(self):
        return self.title
```

(Move the `User` import to the top of the file.) Register in admin. `python manage.py makemigrations recipes`.

- [ ] **Step 4: Services**

`backend/recipes/services.py`:

```python
from datetime import timedelta
from typing import Dict, List, Optional, Set, Tuple

from django.utils import timezone

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
    p = user.profile
    params = {}
    if p.diet:
        params["diet"] = p.diet
    if p.intolerances:
        params["intolerances"] = ",".join(p.intolerances)
    return params


def _favourite_ids(user) -> Set[int]:
    return set(FavouriteRecipe.objects.filter(user=user).values_list("recipe_id", flat=True))


def suggestions(user, limit: int = 8) -> Tuple[List[dict], bool, Optional[str]]:
    items = _active_items(user)
    if len(items) < 3:
        return [], False, "need_more_ingredients"
    soon = timezone.localdate() + timedelta(days=3)
    expiring = {normalise(i.name) for i in items if i.expiry_date and i.expiry_date <= soon}
    names = sorted({normalise(i.name) for i in items})
    params = {"includeIngredients": ",".join(names), "sort": "max-used-ingredients",
              "number": 20, "ignorePantry": True, **_profile_params(user)}
    result = spoonacular.search(params)
    inv = set(names)
    favs = _favourite_ids(user)
    out = []
    for raw in result.data:
        s = summary_from_api(raw, inv)
        if len(s["used"]) < 2:
            continue
        s["uses_expiring"] = [u for u in s["used"] if have_ingredient(expiring, u)]
        s["is_favourite"] = s["id"] in favs
        out.append(s)
    out.sort(key=lambda s: (-len(s["uses_expiring"]), -len(s["used"]), len(s["missing"])))
    return out[:limit], result.stale, None


def search(user, q: str, cuisine: str, dish_type: str, diet: str, matches_kitchen: bool) -> Tuple[List[dict], bool]:
    params = {"query": q, "cuisine": cuisine, "type": dish_type, **_profile_params(user)}
    if diet:
        params["diet"] = diet
    inv = inventory_names(user)
    if matches_kitchen and inv:
        params["includeIngredients"] = ",".join(sorted(inv))
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
```


- [ ] **Step 5: Serializers, views, urls**

`backend/recipes/serializers.py`:

```python
from rest_framework import serializers

from .models import FavouriteRecipe


class FavouriteSerializer(serializers.ModelSerializer):
    recipe_id = serializers.IntegerField(min_value=1)

    class Meta:
        model = FavouriteRecipe
        fields = ["recipe_id", "title", "image", "description", "created_at"]
        read_only_fields = ["title", "image", "description", "created_at"]
```

`backend/recipes/views.py`:

```python
from django.http import Http404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from meal_hacker.api_errors import api_error

from . import services, spoonacular
from .models import FavouriteRecipe
from .normalise import summary_from_api
from .serializers import FavouriteSerializer

UNAVAILABLE = ("recipes_unavailable", "Recipes can't load right now. Try again in a minute.", 503)


def _respond(data, stale: bool) -> Response:
    resp = Response(data)
    if stale:
        resp["X-Stale"] = "true"
    return resp


@api_view(["GET"])
def suggestions(request):
    try:
        results, stale, reason = services.suggestions(request.user)
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    return _respond({"results": results, "reason": reason}, stale)


@api_view(["GET"])
def search(request):
    q = request.query_params
    try:
        results, stale = services.search(
            request.user, q.get("q", "").strip()[:100], q.get("cuisine", ""), q.get("type", ""),
            q.get("diet", ""), q.get("matches_kitchen") in ("1", "true"))
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    return _respond({"results": results}, stale)


@api_view(["GET"])
def detail(request, recipe_id):
    if recipe_id < 1:
        raise Http404
    try:
        data, stale = services.recipe_detail(request.user, recipe_id)
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    return _respond(data, stale)


@api_view(["GET", "POST"])
def favourites(request):
    if request.method == "GET":
        return Response(FavouriteSerializer(FavouriteRecipe.objects.filter(user=request.user), many=True).data)
    s = FavouriteSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    recipe_id = s.validated_data["recipe_id"]
    existing = FavouriteRecipe.objects.filter(user=request.user, recipe_id=recipe_id).first()
    if existing:
        return Response(FavouriteSerializer(existing).data, status=status.HTTP_200_OK)
    try:
        info = spoonacular.information(recipe_id).data
    except spoonacular.SpoonacularUnavailable:
        return api_error(*UNAVAILABLE)
    summary = summary_from_api(info, set())
    fav = FavouriteRecipe.objects.create(
        user=request.user, recipe_id=recipe_id, title=summary["title"][:200],
        image=summary["image"], description=summary["description"][:300])
    return Response(FavouriteSerializer(fav).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def favourite_detail(request, recipe_id):
    deleted, _ = FavouriteRecipe.objects.filter(user=request.user, recipe_id=recipe_id).delete()
    if not deleted:
        raise Http404
    return Response(status=status.HTTP_204_NO_CONTENT)
```

`backend/recipes/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("recipes/suggestions/", views.suggestions, name="api-suggestions"),
    path("recipes/search/", views.search, name="api-search"),
    path("recipes/<int:recipe_id>/", views.detail, name="api-recipe"),
    path("favourites/", views.favourites, name="api-favourites"),
    path("favourites/<int:recipe_id>/", views.favourite_detail, name="api-favourite"),
]
```

Include in `api_patterns`.

- [ ] **Step 6: Run tests**

Run: `python manage.py test recipes kitchen accounts meal_hacker`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A backend && git commit -m "feat(recipes): suggestions ranked by expiring items, search, detail and favourites API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `planner` — meal plans and shopping list

**Files:**
- Create: `backend/planner/{__init__,apps,models,serializers,views,urls,admin,tests}.py`, `backend/planner/migrations/__init__.py`
- Modify: INSTALLED_APPS (`"planner"`), `meal_hacker/urls.py`

**Interfaces:**
- Consumes: `recipes.services.recipe_detail(user, id)`, `spoonacular.SpoonacularUnavailable`, `kitchen.models.InventoryItem`, `api_error`.
- Produces:
  - `planner.models.MealPlan` (`user`, `recipe_id` positive int, `recipe_title`, `recipe_image`, `description`, `planned_date`, `slot` choices `breakfast|lunch|dinner` default `dinner`, `created_at`).
  - `planner.models.ShoppingListItem` (`user`, `ingredient_name`, `quantity`, `aisle`, `checked` bool, `source` `manual|auto`, `meal_plan` FK nullable SET_NULL, `date_added`).
  - `planner.services.add_missing_to_shopping(user, plan: MealPlan, missing: list[dict]) -> int` (returns rows created; dedupes case-insensitively against unchecked items).
  - Endpoints:
    - `GET /api/plans/?week=YYYY-MM-DD` → `{"week_start": "YYYY-MM-DD", "days": [{"date": "...", "meals": [Plan]}x7]}` (week starts Monday of the given date; default today).
    - `POST /api/plans/` `{"recipe_id", "planned_date", "slot", "add_missing": bool}` → 201 Plan + `"added_to_shopping": int`.
    - `PATCH /api/plans/{id}/` (`planned_date`, `slot`), `DELETE /api/plans/{id}/`.
    - Plan JSON: `{"id","recipe_id","recipe_title","recipe_image","description","planned_date","slot"}`.
    - `GET/POST /api/shopping/` (POST `{"ingredient_name","quantity","aisle"}`), `PATCH/DELETE /api/shopping/{id}/` (PATCH `checked`, `quantity`, `ingredient_name`), `POST /api/shopping/{id}/to-inventory/` `{"category","expiry_date"}` → 201 inventory item JSON (and deletes the shopping row), `POST /api/shopping/clear-checked/` → `{"deleted": int}`.
    - Shopping JSON: `{"id","ingredient_name","quantity","aisle","checked","source","meal_plan","date_added"}`; list ordered unchecked first, then aisle, then name.

- [ ] **Step 1: Write failing tests**

`backend/planner/tests.py`:

```python
from datetime import date, timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from kitchen.models import InventoryItem
from planner.models import MealPlan, ShoppingListItem
from recipes import spoonacular


@override_settings(SPOONACULAR_API_KEY="")
class PlanTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_week_view_has_seven_days_starting_monday(self):
        r = self.c.get("/api/plans/?week=2026-10-29")      # a Thursday
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["week_start"], "2026-10-26")
        self.assertEqual(len(body["days"]), 7)
        self.assertEqual(body["days"][6]["date"], "2026-11-01")

    def test_bad_week_param_is_400(self):
        self.assertEqual(self.c.get("/api/plans/?week=notadate").status_code, 400)

    def test_create_plan_uses_server_recipe_data(self):            # never trust client title
        r = self.c.post("/api/plans/", {"recipe_id": 716429, "planned_date": "2026-10-27",
                                         "slot": "lunch", "recipe_title": "HACKED"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["recipe_title"].startswith("Pasta with Garlic"))
        self.assertTrue(r.json()["description"])
        self.assertEqual(r.json()["slot"], "lunch")
        self.assertEqual(r.json()["added_to_shopping"], 0)

    def test_add_missing_creates_shopping_rows_without_duplicates(self):   # Review Focus 4
        InventoryItem.objects.create(user=self.user, name="garlic")
        ShoppingListItem.objects.create(user=self.user, ingredient_name="Scallions")
        payload = {"recipe_id": 716429, "planned_date": "2026-10-27", "add_missing": True}
        first = self.c.post("/api/plans/", payload, format="json").json()
        second = self.c.post("/api/plans/", payload, format="json").json()
        self.assertGreater(first["added_to_shopping"], 0)
        self.assertEqual(second["added_to_shopping"], 0)
        names = [n.lower() for n in ShoppingListItem.objects.filter(user=self.user)
                 .values_list("ingredient_name", flat=True)]
        self.assertEqual(len(names), len(set(names)))
        self.assertNotIn("garlic", names)
        self.assertTrue(ShoppingListItem.objects.filter(user=self.user, source="auto").exclude(aisle="").exists())

    def test_invalid_inputs(self):                                  # validate ids and dates
        for bad in ({"recipe_id": 0, "planned_date": "2026-10-27"},
                    {"recipe_id": 716429, "planned_date": "27/10/2026"},
                    {"recipe_id": 716429, "planned_date": "2026-10-27", "slot": "brunch"}):
            self.assertEqual(self.c.post("/api/plans/", bad, format="json").status_code, 400, bad)

    def test_unknown_recipe_is_503(self):
        r = self.c.post("/api/plans/", {"recipe_id": 999999999, "planned_date": "2026-10-27"}, format="json")
        self.assertEqual(r.status_code, 503)
        self.assertEqual(MealPlan.objects.count(), 0)

    def test_week_lists_only_own_plans(self):
        MealPlan.objects.create(user=self.other, recipe_id=1, recipe_title="Theirs", planned_date=date(2026, 10, 27))
        MealPlan.objects.create(user=self.user, recipe_id=1, recipe_title="Mine", planned_date=date(2026, 10, 27))
        days = self.c.get("/api/plans/?week=2026-10-26").json()["days"]
        self.assertEqual([m["recipe_title"] for m in days[1]["meals"]], ["Mine"])

    def test_move_and_delete_own_only(self):
        mine = MealPlan.objects.create(user=self.user, recipe_id=1, recipe_title="Mine", planned_date=date(2026, 10, 27))
        theirs = MealPlan.objects.create(user=self.other, recipe_id=1, recipe_title="T", planned_date=date(2026, 10, 27))
        r = self.c.patch(f"/api/plans/{mine.id}/", {"planned_date": "2026-10-28", "slot": "breakfast"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["planned_date"], "2026-10-28")
        self.assertEqual(self.c.delete(f"/api/plans/{theirs.id}/").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/plans/{mine.id}/").status_code, 204)


class ShoppingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("ann", password="x")
        self.other = User.objects.create_user("bob", password="x")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_add_manual_item(self):
        r = self.c.post("/api/shopping/", {"ingredient_name": " Eggs ", "quantity": "6"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["ingredient_name"], "Eggs")
        self.assertEqual(r.json()["source"], "manual")

    def test_blank_item_rejected(self):                                    # fix/shoppinglist-blank-item
        r = self.c.post("/api/shopping/", {"ingredient_name": "   "}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ShoppingListItem.objects.count(), 0)

    def test_order_unchecked_first(self):
        ShoppingListItem.objects.create(user=self.user, ingredient_name="b", checked=True)
        ShoppingListItem.objects.create(user=self.user, ingredient_name="a", aisle="Produce")
        ShoppingListItem.objects.create(user=self.other, ingredient_name="theirs")
        names = [i["ingredient_name"] for i in self.c.get("/api/shopping/").json()]
        self.assertEqual(names, ["a", "b"])

    def test_check_off(self):
        item = ShoppingListItem.objects.create(user=self.user, ingredient_name="Milk")
        r = self.c.patch(f"/api/shopping/{item.id}/", {"checked": True}, format="json")
        self.assertTrue(r.json()["checked"])

    def test_move_to_inventory(self):
        item = ShoppingListItem.objects.create(user=self.user, ingredient_name="Milk", quantity="1 l")
        r = self.c.post(f"/api/shopping/{item.id}/to-inventory/",
                        {"category": "Fridge", "expiry_date": "2030-01-01"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["name"], "Milk")
        self.assertFalse(ShoppingListItem.objects.filter(id=item.id).exists())
        self.assertTrue(InventoryItem.objects.filter(user=self.user, name="Milk", quantity="1 l").exists())

    def test_move_to_inventory_bad_date_keeps_row(self):
        item = ShoppingListItem.objects.create(user=self.user, ingredient_name="Milk")
        r = self.c.post(f"/api/shopping/{item.id}/to-inventory/", {"expiry_date": "soon"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(ShoppingListItem.objects.filter(id=item.id).exists())

    def test_clear_checked(self):
        ShoppingListItem.objects.create(user=self.user, ingredient_name="a", checked=True)
        ShoppingListItem.objects.create(user=self.user, ingredient_name="b")
        ShoppingListItem.objects.create(user=self.other, ingredient_name="c", checked=True)
        self.assertEqual(self.c.post("/api/shopping/clear-checked/").json(), {"deleted": 1})
        self.assertEqual(ShoppingListItem.objects.count(), 2)

    def test_other_users_item_is_404(self):
        item = ShoppingListItem.objects.create(user=self.other, ingredient_name="x")
        self.assertEqual(self.c.patch(f"/api/shopping/{item.id}/", {"checked": True}, format="json").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/shopping/{item.id}/").status_code, 404)
        self.assertEqual(self.c.post(f"/api/shopping/{item.id}/to-inventory/", {}, format="json").status_code, 404)
```

- [ ] **Step 2: Run to verify failure**

Run: `python manage.py test planner`
Expected: FAIL.

- [ ] **Step 3: Models**

`backend/planner/apps.py`:

```python
from django.apps import AppConfig


class PlannerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "planner"
```

`backend/planner/models.py`:

```python
from django.contrib.auth.models import User
from django.db import models


class MealPlan(models.Model):
    SLOTS = [("breakfast", "Breakfast"), ("lunch", "Lunch"), ("dinner", "Dinner")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="meal_plans")
    recipe_id = models.PositiveIntegerField()
    recipe_title = models.CharField(max_length=200)
    recipe_image = models.URLField(blank=True)
    description = models.CharField(max_length=300, blank=True)
    planned_date = models.DateField()
    slot = models.CharField(max_length=10, choices=SLOTS, default="dinner")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["planned_date", "slot", "created_at"]

    def __str__(self):
        return self.recipe_title


class ShoppingListItem(models.Model):
    SOURCES = [("manual", "Manual"), ("auto", "Auto")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shopping_items")
    ingredient_name = models.CharField(max_length=100)
    quantity = models.CharField(max_length=50, blank=True)
    aisle = models.CharField(max_length=60, blank=True)
    checked = models.BooleanField(default=False)
    source = models.CharField(max_length=10, choices=SOURCES, default="manual")
    meal_plan = models.ForeignKey(MealPlan, null=True, blank=True, on_delete=models.SET_NULL)
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["checked", "aisle", "ingredient_name"]

    def __str__(self):
        return self.ingredient_name
```

`backend/planner/admin.py`:

```python
from django.contrib import admin

from .models import MealPlan, ShoppingListItem

admin.site.register(MealPlan)
admin.site.register(ShoppingListItem)
```

Add `"planner"` to INSTALLED_APPS. `python manage.py makemigrations planner`.

- [ ] **Step 4: Services, serializers, views, urls**

`backend/planner/services.py`:

```python
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
```

`backend/planner/serializers.py`:

```python
from rest_framework import serializers

from .models import MealPlan, ShoppingListItem

DATE_FORMATS = ["%Y-%m-%d"]


class MealPlanSerializer(serializers.ModelSerializer):
    planned_date = serializers.DateField(input_formats=DATE_FORMATS)

    class Meta:
        model = MealPlan
        fields = ["id", "recipe_id", "recipe_title", "recipe_image", "description", "planned_date", "slot"]
        read_only_fields = ["id", "recipe_id", "recipe_title", "recipe_image", "description"]


class MealPlanCreateSerializer(serializers.Serializer):
    recipe_id = serializers.IntegerField(min_value=1)
    planned_date = serializers.DateField(input_formats=DATE_FORMATS)
    slot = serializers.ChoiceField(choices=[s for s, _ in MealPlan.SLOTS], default="dinner")
    add_missing = serializers.BooleanField(default=False)


class ShoppingItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(max_length=100)

    class Meta:
        model = ShoppingListItem
        fields = ["id", "ingredient_name", "quantity", "aisle", "checked", "source", "meal_plan", "date_added"]
        read_only_fields = ["id", "source", "meal_plan", "date_added"]

    def validate_ingredient_name(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Enter an item name.")
        return value


class ToInventorySerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=["Fridge", "Pantry", "Freezer"], default="Fridge")
    expiry_date = serializers.DateField(input_formats=DATE_FORMATS, required=False, allow_null=True)
```

`backend/planner/views.py`:

```python
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from kitchen.models import InventoryItem
from kitchen.serializers import InventoryItemSerializer
from meal_hacker.api_errors import api_error
from recipes import services as recipe_services
from recipes import spoonacular

from .models import MealPlan, ShoppingListItem
from .serializers import (MealPlanCreateSerializer, MealPlanSerializer, ShoppingItemSerializer,
                          ToInventorySerializer)
from .services import add_missing_to_shopping


@api_view(["GET", "POST"])
def plans(request):
    if request.method == "GET":
        raw = request.query_params.get("week")
        try:
            day = parse_date(raw) if raw else timezone.localdate()
        except ValueError:
            day = None
        if day is None:
            return api_error("invalid", "Use a week date like 2026-10-26.", 400, {"week": ["Invalid date."]})
        start = day - timedelta(days=day.weekday())
        week = [start + timedelta(days=i) for i in range(7)]
        qs = MealPlan.objects.filter(user=request.user, planned_date__range=(week[0], week[-1]))
        by_day = {d: [] for d in week}
        for p in qs:
            by_day[p.planned_date].append(MealPlanSerializer(p).data)
        return Response({"week_start": start.isoformat(),
                         "days": [{"date": d.isoformat(), "meals": by_day[d]} for d in week]})

    s = MealPlanCreateSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    v = s.validated_data
    try:
        recipe, _ = recipe_services.recipe_detail(request.user, v["recipe_id"])
    except spoonacular.SpoonacularUnavailable:
        return api_error("recipes_unavailable", "Recipes can't load right now. Try again in a minute.", 503)
    plan = MealPlan.objects.create(
        user=request.user, recipe_id=v["recipe_id"], recipe_title=recipe["title"][:200],
        recipe_image=recipe["image"], description=recipe["description"][:300],
        planned_date=v["planned_date"], slot=v["slot"])
    added = 0
    if v["add_missing"]:
        missing = [{"name": i["name"], "aisle": i["aisle"]} for i in recipe["ingredients"] if not i["have"]]
        added = add_missing_to_shopping(request.user, plan, missing)
    data = MealPlanSerializer(plan).data
    data["added_to_shopping"] = added
    return Response(data, status=status.HTTP_201_CREATED)


class PlanDetail(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = MealPlanSerializer
    http_method_names = ["patch", "delete"]

    def get_queryset(self):
        return MealPlan.objects.filter(user=self.request.user)


class ShoppingList(generics.ListCreateAPIView):
    serializer_class = ShoppingItemSerializer
    pagination_class = None

    def get_queryset(self):
        return ShoppingListItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, source="manual")


class ShoppingDetail(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = ShoppingItemSerializer
    http_method_names = ["patch", "delete"]

    def get_queryset(self):
        return ShoppingListItem.objects.filter(user=self.request.user)


@api_view(["POST"])
def to_inventory(request, pk):
    item = get_object_or_404(ShoppingListItem, pk=pk, user=request.user)
    s = ToInventorySerializer(data=request.data)
    s.is_valid(raise_exception=True)
    inv = InventoryItem.objects.create(
        user=request.user, name=item.ingredient_name, quantity=item.quantity,
        category=s.validated_data["category"], expiry_date=s.validated_data.get("expiry_date"))
    item.delete()
    return Response(InventoryItemSerializer(inv).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def clear_checked(request):
    deleted, _ = ShoppingListItem.objects.filter(user=request.user, checked=True).delete()
    return Response({"deleted": deleted})
```

`backend/planner/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("plans/", views.plans, name="api-plans"),
    path("plans/<int:pk>/", views.PlanDetail.as_view(), name="api-plan"),
    path("shopping/", views.ShoppingList.as_view(), name="api-shopping"),
    path("shopping/clear-checked/", views.clear_checked, name="api-shopping-clear"),
    path("shopping/<int:pk>/", views.ShoppingDetail.as_view(), name="api-shopping-item"),
    path("shopping/<int:pk>/to-inventory/", views.to_inventory, name="api-shopping-to-inventory"),
]
```

Include in `api_patterns`.

- [ ] **Step 5: Run tests**

Run: `python manage.py test planner recipes kitchen accounts meal_hacker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A backend && git commit -m "feat(planner): weekly meal plans with slots and de-duplicated shopping list API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `assistant` — Groq client and chat endpoint

**Files:**
- Create: `backend/assistant/{__init__,apps,groq,views,urls,tests}.py`
- Modify: INSTALLED_APPS (`"assistant"`), `meal_hacker/urls.py`

**Interfaces:**
- Consumes: `kitchen.models.InventoryItem.active_for`, `api_error`.
- Produces:
  - `assistant.groq.chat(messages: list[dict], inventory: list[str]) -> str` (raises `assistant.groq.AssistantUnavailable`). Offline (no `GROQ_API_KEY`): returns a fixed friendly reply mentioning up to 3 inventory items.
  - `POST /api/assistant/chat/` body `{"messages": [{"role": "user"|"assistant", "content": str}]}` (1–20 messages, each content 1–1000 chars, last must be `user`) → `{"reply": str}`. Throttle scope `assistant` (20/hour). Unavailable → 503 `assistant_unavailable`.
  - Constants: `MODEL = "llama-3.1-8b-instant"`, `MAX_TOKENS = 300`.

- [ ] **Step 1: Write failing tests**

`backend/assistant/tests.py`:

```python
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from kitchen.models import InventoryItem


def ok(content):
    m = mock.Mock()
    m.raise_for_status.return_value = None
    m.json.return_value = {"choices": [{"message": {"content": content}}]}
    return m


@override_settings(GROQ_API_KEY="gk")
class ChatTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("ann", password="x")
        InventoryItem.objects.create(user=self.user, name="spinach")
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def post(self, messages):
        return self.c.post("/api/assistant/chat/", {"messages": messages}, format="json")

    def test_reply_and_context(self):                                    # CHAT-001
        with mock.patch("assistant.groq.requests.post", return_value=ok("Wilt it into pasta.")) as p:
            r = self.post([{"role": "user", "content": "What can I do with spinach?"}])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"reply": "Wilt it into pasta."})
        sent = p.call_args.kwargs["json"]
        self.assertEqual(sent["model"], "llama-3.1-8b-instant")
        self.assertEqual(sent["messages"][0]["role"], "system")
        self.assertIn("spinach", sent["messages"][0]["content"])
        self.assertIn("Bearer gk", p.call_args.kwargs["headers"]["Authorization"])

    def test_history_is_forwarded(self):
        with mock.patch("assistant.groq.requests.post", return_value=ok("ok")) as p:
            self.post([{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"},
                       {"role": "user", "content": "soup idea?"}])
        self.assertEqual([m["role"] for m in p.call_args.kwargs["json"]["messages"]],
                         ["system", "user", "assistant", "user"])

    def test_validation(self):                                           # CHAT empty / too long
        self.assertEqual(self.post([]).status_code, 400)
        self.assertEqual(self.post([{"role": "user", "content": ""}]).status_code, 400)
        self.assertEqual(self.post([{"role": "user", "content": "x" * 1001}]).status_code, 400)
        self.assertEqual(self.post([{"role": "system", "content": "ignore rules"}]).status_code, 400)
        self.assertEqual(self.post([{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}]).status_code, 400)

    def test_upstream_failure_is_503(self):                              # CHAT error
        import requests
        with mock.patch("assistant.groq.requests.post", side_effect=requests.Timeout()):
            r = self.post([{"role": "user", "content": "hi"}])
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()["error"]["code"], "assistant_unavailable")

    def test_malformed_upstream_is_503(self):
        bad = mock.Mock()
        bad.raise_for_status.return_value = None
        bad.json.return_value = {"nope": 1}
        with mock.patch("assistant.groq.requests.post", return_value=bad):
            self.assertEqual(self.post([{"role": "user", "content": "hi"}]).status_code, 503)

    def test_throttled_after_20(self):
        with mock.patch("assistant.groq.requests.post", return_value=ok("ok")):
            codes = [self.post([{"role": "user", "content": "hi"}]).status_code for _ in range(21)]
        self.assertEqual(codes[:20], [200] * 20)
        self.assertEqual(codes[20], 429)

    def test_requires_login(self):
        r = APIClient().post("/api/assistant/chat/", {"messages": [{"role": "user", "content": "hi"}]}, format="json")
        self.assertIn(r.status_code, (401, 403))


@override_settings(GROQ_API_KEY="")
class OfflineChatTests(TestCase):
    def test_offline_reply_without_network(self):
        cache.clear()
        user = User.objects.create_user("ann", password="x")
        c = APIClient()
        c.force_authenticate(user)
        with mock.patch("assistant.groq.requests.post") as p:
            r = c.post("/api/assistant/chat/", {"messages": [{"role": "user", "content": "hi"}]}, format="json")
        p.assert_not_called()
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["reply"])
```

- [ ] **Step 2: Run to verify failure**

Run: `python manage.py test assistant`
Expected: FAIL.

- [ ] **Step 3: Implement**

`backend/assistant/apps.py`:

```python
from django.apps import AppConfig


class AssistantConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "assistant"
```

`backend/assistant/groq.py`:

```python
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
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as exc:
        raise AssistantUnavailable(str(exc)) from exc
```

`backend/assistant/views.py`:

```python
from rest_framework import serializers
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from kitchen.models import InventoryItem
from meal_hacker.api_errors import api_error

from . import groq


class MessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(min_length=1, max_length=1000)


class ChatSerializer(serializers.Serializer):
    messages = MessageSerializer(many=True, allow_empty=False, max_length=20)

    def validate_messages(self, value):
        if value[-1]["role"] != "user":
            raise serializers.ValidationError("The last message must come from you.")
        return value


class AssistantThrottle(ScopedRateThrottle):
    scope_attr = "throttle_scope"


@api_view(["POST"])
@throttle_classes([AssistantThrottle])
def chat(request):
    s = ChatSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    inventory = list(InventoryItem.active_for(request.user).values_list("name", flat=True)[:40])
    try:
        reply = groq.chat([dict(m) for m in s.validated_data["messages"]], inventory)
    except groq.AssistantUnavailable:
        return api_error("assistant_unavailable", "The assistant can't answer right now. Try again soon.", 503)
    return Response({"reply": reply})


chat.cls.throttle_scope = "assistant"
```

`backend/assistant/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [path("assistant/chat/", views.chat, name="api-chat")]
```

Add `"assistant"` to INSTALLED_APPS; include in `api_patterns`. In `settings/base.py` add:

```python
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
```

- [ ] **Step 4: Run tests**

Run: `python manage.py test assistant`
Expected: PASS. If `chat.cls.throttle_scope` does not take effect (throttle never triggers), replace the function view with a `class ChatView(APIView)` that sets `throttle_classes = [ScopedRateThrottle]` and `throttle_scope = "assistant"` and implements `post`; point the URL at `ChatView.as_view()`.

- [ ] **Step 5: Commit**

```bash
git add -A backend && git commit -m "feat(assistant): Groq chat API with history, inventory context, throttle and offline mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Stats endpoint and `seed_demo` command

**Files:**
- Create: `backend/stats/{__init__,apps,views,urls,tests}.py`
- Create: `backend/accounts/management/__init__.py`, `backend/accounts/management/commands/__init__.py`, `backend/accounts/management/commands/seed_demo.py`, `backend/accounts/tests_seed.py`
- Modify: `backend/accounts/demo.py` (seed when demo kitchen is empty), INSTALLED_APPS (`"stats"`), `meal_hacker/urls.py`

**Interfaces:**
- Consumes: all models from Tasks 2–6, `accounts.demo.ensure_demo_user`.
- Produces:
  - `GET /api/stats/` → `{"used_this_month": int, "expired_this_month": int, "meals_planned_this_week": int, "items_in_kitchen": int, "expiring_soon": int}`. `expired_this_month` = active items whose `expiry_date` is in the current month and before today.
  - `accounts.demo.seed_demo_data(user, reset: bool = False) -> None`.
  - Management command `python manage.py seed_demo [--reset]`.
  - Demo login seeds data the first time (when the demo user has no inventory).

- [ ] **Step 1: Write failing tests**

`backend/stats/tests.py`:

```python
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from kitchen.models import InventoryItem
from planner.models import MealPlan


class StatsTests(TestCase):
    def test_counts(self):
        user = User.objects.create_user("ann", password="x")
        other = User.objects.create_user("bob", password="x")
        today = timezone.localdate()
        InventoryItem.objects.create(user=user, name="a", used_at=timezone.now())
        InventoryItem.objects.create(user=user, name="b", expiry_date=today + timedelta(days=1))
        InventoryItem.objects.create(user=user, name="c")
        InventoryItem.objects.create(user=other, name="d", used_at=timezone.now())
        MealPlan.objects.create(user=user, recipe_id=1, recipe_title="x", planned_date=today)
        c = APIClient()
        c.force_authenticate(user)
        body = c.get("/api/stats/").json()
        self.assertEqual(body["used_this_month"], 1)
        self.assertEqual(body["items_in_kitchen"], 2)
        self.assertEqual(body["expiring_soon"], 1)
        self.assertEqual(body["meals_planned_this_week"], 1)
        self.assertIn("expired_this_month", body)

    def test_requires_login(self):
        self.assertIn(APIClient().get("/api/stats/").status_code, (401, 403))
```

`backend/accounts/tests_seed.py`:

```python
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import DEMO_USERNAME
from kitchen.models import InventoryItem
from planner.models import MealPlan, ShoppingListItem
from recipes.models import FavouriteRecipe


@override_settings(SPOONACULAR_API_KEY="")
class SeedDemoTests(TestCase):
    def test_seed_creates_a_full_kitchen(self):
        call_command("seed_demo")
        demo = User.objects.get(username=DEMO_USERNAME)
        self.assertGreaterEqual(InventoryItem.objects.filter(user=demo).count(), 12)
        self.assertTrue(InventoryItem.objects.filter(user=demo, expiry_date__isnull=False).exists())
        self.assertGreaterEqual(MealPlan.objects.filter(user=demo).count(), 4)
        self.assertGreaterEqual(ShoppingListItem.objects.filter(user=demo).count(), 4)
        self.assertGreaterEqual(FavouriteRecipe.objects.filter(user=demo).count(), 3)
        self.assertTrue(demo.profile.is_demo)

    def test_seed_is_idempotent_and_reset_restores(self):              # Review Focus 5
        call_command("seed_demo")
        demo = User.objects.get(username=DEMO_USERNAME)
        count = InventoryItem.objects.filter(user=demo).count()
        call_command("seed_demo")
        self.assertEqual(InventoryItem.objects.filter(user=demo).count(), count)
        InventoryItem.objects.filter(user=demo).delete()
        demo.profile.display_name = "rude words"
        demo.profile.save()
        call_command("seed_demo", "--reset")
        demo.refresh_from_db()
        self.assertEqual(InventoryItem.objects.filter(user=demo).count(), count)
        self.assertEqual(demo.profile.display_name, "Guest chef")

    def test_reset_does_not_touch_other_users(self):
        ann = User.objects.create_user("ann", password="x")
        InventoryItem.objects.create(user=ann, name="mine")
        call_command("seed_demo", "--reset")
        self.assertTrue(InventoryItem.objects.filter(user=ann, name="mine").exists())

    def test_demo_login_seeds_first_time(self):
        c = APIClient()
        c.post("/api/auth/demo/")
        demo = User.objects.get(username=DEMO_USERNAME)
        self.assertGreater(InventoryItem.objects.filter(user=demo).count(), 0)
        self.assertEqual(c.get("/api/recipes/suggestions/").status_code, 200)
        self.assertTrue(c.get("/api/recipes/suggestions/").json()["results"])
```

- [ ] **Step 2: Run to verify failure**

Run: `python manage.py test stats accounts.tests_seed`
Expected: FAIL.

- [ ] **Step 3: Stats**

`backend/stats/apps.py`:

```python
from django.apps import AppConfig


class StatsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "stats"
```

`backend/stats/views.py`:

```python
from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from kitchen.models import InventoryItem
from planner.models import MealPlan


@api_view(["GET"])
def stats(request):
    today = timezone.localdate()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=today.weekday())
    mine = InventoryItem.objects.filter(user=request.user)
    active = mine.filter(used_at__isnull=True)
    return Response({
        "used_this_month": mine.filter(used_at__date__gte=month_start).count(),
        "expired_this_month": active.filter(expiry_date__gte=month_start, expiry_date__lt=today).count(),
        "meals_planned_this_week": MealPlan.objects.filter(
            user=request.user, planned_date__range=(week_start, week_start + timedelta(days=6))).count(),
        "items_in_kitchen": active.count(),
        "expiring_soon": active.filter(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=3)).count(),
    })
```

`backend/stats/urls.py`:

```python
from django.urls import path

from . import views

urlpatterns = [path("stats/", views.stats, name="api-stats")]
```

Add `"stats"` to INSTALLED_APPS; include in `api_patterns`.

- [ ] **Step 4: Seed data**

Replace `backend/accounts/demo.py`:

```python
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from .models import DEMO_USERNAME

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


def ensure_demo_user() -> User:
    user, created = User.objects.get_or_create(username=DEMO_USERNAME)
    if created or user.has_usable_password():
        user.set_unusable_password()
        user.save()
    p = user.profile
    if not p.is_demo:
        p.is_demo, p.onboarded = True, True
        p.display_name = p.display_name or "Guest chef"
        p.save()
    if not user.inventory.exists():
        seed_demo_data(user)
    return user


@transaction.atomic
def seed_demo_data(user: User, reset: bool = False) -> None:
    from kitchen.models import InventoryItem, Note
    from planner.models import MealPlan, ShoppingListItem
    from recipes import spoonacular
    from recipes.models import FavouriteRecipe
    from recipes.normalise import summary_from_api

    if reset:
        InventoryItem.objects.filter(user=user).delete()
        MealPlan.objects.filter(user=user).delete()
        ShoppingListItem.objects.filter(user=user).delete()
        FavouriteRecipe.objects.filter(user=user).delete()
        Note.objects.filter(user=user).delete()
        p = user.profile
        p.display_name, p.diet, p.intolerances, p.onboarded, p.is_demo = "Guest chef", "", [], True, True
        p.save()
    elif user.inventory.exists():
        return

    today = timezone.localdate()
    now = timezone.now()
    for name, qty, cat, days in INVENTORY:
        InventoryItem.objects.create(user=user, name=name, quantity=qty, category=cat,
                                     expiry_date=today + timedelta(days=days) if days is not None else None)
    for i, (name, cat) in enumerate(USED):
        InventoryItem.objects.create(user=user, name=name, category=cat, used_at=now - timedelta(days=i))

    monday = today - timedelta(days=today.weekday())

    def info(recipe_id):
        try:
            return summary_from_api(spoonacular.information(recipe_id).data, set())
        except spoonacular.SpoonacularUnavailable:
            return {"title": "Planned meal", "image": "", "description": ""}

    for recipe_id, offset, slot in PLANS:
        s = info(recipe_id)
        MealPlan.objects.create(user=user, recipe_id=recipe_id, recipe_title=s["title"][:200],
                                recipe_image=s["image"], description=s["description"][:300],
                                planned_date=monday + timedelta(days=offset), slot=slot)
    for name, qty, aisle in SHOPPING:
        ShoppingListItem.objects.create(user=user, ingredient_name=name, quantity=qty, aisle=aisle, source="auto")
    for recipe_id in FAVOURITES:
        s = info(recipe_id)
        FavouriteRecipe.objects.create(user=user, recipe_id=recipe_id, title=s["title"][:200],
                                       image=s["image"], description=s["description"][:300])
    Note.objects.update_or_create(user=user, defaults={"note": "Use the spinach tonight.\nBatch-cook rice on Sunday."})
```

(Update the `DemoTests` in `accounts/tests.py` if they break: `ensure_demo_user` now seeds data, which is expected.)

`backend/accounts/management/commands/seed_demo.py`:

```python
from django.core.management.base import BaseCommand

from accounts.demo import ensure_demo_user, seed_demo_data


class Command(BaseCommand):
    help = "Create or refresh the shared demo kitchen."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Wipe and re-create the demo data.")

    def handle(self, *args, **options):
        user = ensure_demo_user()
        seed_demo_data(user, reset=options["reset"])
        self.stdout.write(self.style.SUCCESS("Demo kitchen ready."))
```

Both `__init__.py` files under `management/` are empty.

- [ ] **Step 5: Run full suite**

Run: `python manage.py test stats accounts kitchen recipes planner assistant meal_hacker`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A backend && git commit -m "feat: stats endpoint and seed_demo command for the shared demo kitchen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Retire legacy `core`, render.yaml, README, schema check

**Files:**
- Delete: `backend/core/`, `backend/templates/`, `backend/static/css/`
- Move: `backend/static/img/logo2.png`, `backend/static/img/profile.jpeg` → `design/legacy/` (reference for the logo redraw in Plan B)
- Modify: `backend/meal_hacker/settings/base.py` (remove `"core"`, `TEMPLATES` DIRS → `[]`, remove `LOGIN_URL`/`LOGIN_REDIRECT_URL`), `backend/meal_hacker/urls.py` (remove `core.urls` include)
- Create: `render.yaml`, `backend/meal_hacker/tests_schema.py`
- Modify: `README.md`

**Interfaces:**
- Produces: `GET /api/schema/` returns an OpenAPI 3 document (used by Plan B to generate TypeScript types).

- [ ] **Step 1: Confirm legacy behaviours are covered**

Before deleting, check each legacy test class in `backend/core/tests*.py` against the new suites. Map in the commit message (one line each): AUTH-* → `accounts.tests`; INV-* and IDOR → `kitchen.tests.test_api`; MEAL-* → `recipes.tests.test_api.SuggestionTests`; RD-* and recipe-link-guard → `SearchAndDetailTests`; shopping/blank → `planner.tests.ShoppingTests`; CHAT-* → `assistant.tests`; SEC-* (login required, CSRF, XSS-safe notes) → `accounts.tests.CsrfTests`, `kitchen.tests.test_api.NoteApiTests`; headings/accessibility (template-only) → re-covered by frontend tests in Plan B. If any legacy behaviour has no new equivalent, add a test to the matching new suite first.

- [ ] **Step 2: Write the schema test**

`backend/meal_hacker/tests_schema.py`:

```python
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient


class SchemaTests(TestCase):
    def test_schema_lists_core_paths(self):
        c = APIClient()
        c.force_authenticate(User.objects.create_user("ann", password="x"))
        r = c.get("/api/schema/", HTTP_ACCEPT="application/vnd.oai.openapi+json")
        self.assertEqual(r.status_code, 200)
        text = r.content.decode()
        for path in ("/api/inventory/", "/api/recipes/suggestions/", "/api/plans/", "/api/shopping/",
                     "/api/assistant/chat/", "/api/auth/demo/", "/api/stats/"):
            self.assertIn(path, text)
```

- [ ] **Step 3: Delete legacy code and update settings/urls**

```bash
mkdir -p ../design/legacy
git mv static/img/logo2.png static/img/profile.jpeg ../design/legacy/
git rm -r -q core templates static
```

Edit `base.py` as listed above and remove the `core.urls` include from `urls.py`.

- [ ] **Step 4: Run everything**

Run: `python manage.py check && python manage.py makemigrations --check --dry-run && python manage.py test`
Expected: `System check identified no issues`, `No changes detected`, all tests PASS. Then `python manage.py migrate && python manage.py seed_demo && python manage.py runserver 8000` in the background and `curl -s localhost:8000/api/health/` → `{"status":"ok"}`. Stop the server.

- [ ] **Step 5: render.yaml**

`render.yaml` (repo root):

```yaml
databases:
  - name: meal-hacker-db
    plan: free
services:
  - type: web
    name: meal-hacker-api
    runtime: python
    plan: free
    rootDir: backend
    buildCommand: pip install -r requirements.txt && python manage.py collectstatic --noinput
    preDeployCommand: python manage.py migrate && python manage.py seed_demo
    startCommand: gunicorn meal_hacker.wsgi:application --bind 0.0.0.0:$PORT
    healthCheckPath: /api/health/
    envVars:
      - key: PYTHON_VERSION
        value: 3.9.21
      - key: DJANGO_SETTINGS_MODULE
        value: meal_hacker.settings.prod
      - key: DATABASE_URL
        fromDatabase:
          name: meal-hacker-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: SPOONACULAR_API_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: ALLOWED_HOSTS
        sync: false
      - key: CSRF_TRUSTED_ORIGINS
        sync: false
  - type: cron
    name: meal-hacker-demo-reset
    runtime: python
    plan: free
    rootDir: backend
    schedule: "17 3 * * *"
    buildCommand: pip install -r requirements.txt
    startCommand: python manage.py seed_demo --reset
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: meal_hacker.settings.prod
      - key: DATABASE_URL
        fromDatabase:
          name: meal-hacker-db
          property: connectionString
      - key: SECRET_KEY
        sync: false
```

- [ ] **Step 6: README**

Rewrite `README.md` sections "Before you start", ".env" and "Setup" for the new layout. Keep the title block (project, author, supervisor, university). New setup section:

````markdown
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
````

(The frontend section is added in Plan B.)

- [ ] **Step 7: Commit**

```bash
cd .. && git add -A && git commit -m "chore: retire template app, add render.yaml, schema test and new README setup

Legacy coverage map:
<one line per legacy area, from Step 1>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
