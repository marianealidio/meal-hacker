import sys

from .base import *  # noqa: F401,F403
from .base import SECRET_KEY as _SECRET_KEY

DEBUG = True
SECRET_KEY = _SECRET_KEY or "dev-only-insecure-key-change-me"
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

if len(sys.argv) > 1 and sys.argv[1] == "test":
    # Tests must never hit live APIs, whatever the local .env holds.
    SPOONACULAR_API_KEY = ""
    GROQ_API_KEY = ""
