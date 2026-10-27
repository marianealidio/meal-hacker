import os
import sys

from .base import *  # noqa: F401,F403
from .base import CSRF_TRUSTED_ORIGINS as _ENV_CSRF_ORIGINS
from .base import SECRET_KEY as _SECRET_KEY

DEBUG = True
SECRET_KEY = _SECRET_KEY or "dev-only-insecure-key-change-me"
# The frontend dev server may land on any nearby port when 3000 is busy.
CSRF_TRUSTED_ORIGINS = [
    f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in range(3000, 3006)
] + list(_ENV_CSRF_ORIGINS)
# The Playwright e2e run serves the app on 3010.
CSRF_TRUSTED_ORIGINS += [f"http://{host}:3010" for host in ("localhost", "127.0.0.1")]

if os.environ.get("E2E_DB") == "1":
    # End-to-end runs get their own database so they never touch local dev data.
    DATABASES["default"]["NAME"] = BASE_DIR / "db-e2e.sqlite3"  # noqa: F405

if len(sys.argv) > 1 and sys.argv[1] == "test":
    # Tests must never hit live APIs, whatever the local .env holds.
    SPOONACULAR_API_KEY = ""
    GROQ_API_KEY = ""
