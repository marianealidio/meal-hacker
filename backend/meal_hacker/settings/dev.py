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

if len(sys.argv) > 1 and sys.argv[1] == "test":
    # Tests must never hit live APIs, whatever the local .env holds.
    SPOONACULAR_API_KEY = ""
    GROQ_API_KEY = ""
