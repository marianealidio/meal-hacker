from .base import *  # noqa: F401,F403
from .base import SECRET_KEY as _SECRET_KEY

DEBUG = True
SECRET_KEY = _SECRET_KEY or "dev-only-insecure-key-change-me"
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
