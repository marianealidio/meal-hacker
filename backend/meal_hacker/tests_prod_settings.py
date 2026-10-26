import json
import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase

BACKEND = Path(__file__).resolve().parent.parent


def prod_allowed_hosts(**env) -> list:
    """Import the prod settings in a clean interpreter and return ALLOWED_HOSTS."""
    full = {k: v for k, v in os.environ.items() if k != "RENDER_EXTERNAL_HOSTNAME"}
    full.update({"SECRET_KEY": "x" * 50, "DATABASE_URL": "sqlite:///tmp.sqlite3",
                 "ALLOWED_HOSTS": "api.example.com", **env})
    out = subprocess.run(
        [sys.executable, "-c", "import json, meal_hacker.settings.prod as p; print(json.dumps(p.ALLOWED_HOSTS))"],
        cwd=BACKEND, env=full, capture_output=True, text=True, check=True)
    return json.loads(out.stdout.strip().splitlines()[-1])


class ProdSettingsTests(SimpleTestCase):                                 # M3
    def test_render_hostname_is_allowed_when_set(self):
        self.assertEqual(prod_allowed_hosts(RENDER_EXTERNAL_HOSTNAME="meal-hacker-api.onrender.com"),
                         ["api.example.com", "meal-hacker-api.onrender.com"])

    def test_hosts_unchanged_without_render_hostname(self):
        self.assertEqual(prod_allowed_hosts(), ["api.example.com"])
