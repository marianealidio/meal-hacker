import os

import dj_database_url
from decouple import config

from .base import *  # noqa: F401,F403
from .base import ALLOWED_HOSTS, SECRET_KEY

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be set in production")

DEBUG = False

# Render sets this to the service's own hostname (xxx.onrender.com).
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS = [*ALLOWED_HOSTS, RENDER_EXTERNAL_HOSTNAME]

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
