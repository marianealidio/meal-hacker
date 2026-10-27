#!/usr/bin/env bash
# Final sweep: runs every automated check for Meal Hacker and writes a report.
#
#   scripts/final-sweep.sh              full sweep (about 10–20 minutes)
#   scripts/final-sweep.sh --quick      skip end-to-end tests and Lighthouse
#   scripts/final-sweep.sh --no-lighthouse
#
# Safe to leave running overnight: it never pushes, deploys or deletes anything outside
# its own scratch folders, and it uses its own ports (8020/3020) and build folders,
# so it won't clash with servers you already have running.
#
# Output: sweep-reports/<timestamp>/REPORT.md plus one log per step.
# Exit code: 0 when nothing FAILED (warnings are allowed), 1 otherwise.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$ROOT/sweep-reports/$STAMP"
mkdir -p "$OUT"

QUICK=0
LIGHTHOUSE=1
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1; LIGHTHOUSE=0 ;;
    --no-lighthouse) LIGHTHOUSE=0 ;;
    *) echo "Unknown option: $arg"; exit 2 ;;
  esac
done

if [ -x "$ROOT/backend/.venv/bin/python" ]; then
  PY="$ROOT/backend/.venv/bin/python"
else
  PY="${PYTHON:-python3}"
fi

RESULTS=()   # "STATUS|step|detail"
FAILED=0
SERVER_PIDS=()

cleanup() {
  for pid in "${SERVER_PIDS[@]:-}"; do
    [ -n "$pid" ] && { kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null; }
  done
}
trap cleanup EXIT

record() { # status step detail
  RESULTS+=("$1|$2|$3")
  [ "$1" = "FAIL" ] && FAILED=1
  printf '%-5s %s — %s\n' "$1" "$2" "$3"
}

# run "name" "logfile" command... — PASS on exit 0, FAIL otherwise
run() {
  local name="$1" file="$2"; shift 2
  local start=$SECONDS
  if "$@" >"$OUT/$file" 2>&1; then
    record PASS "$name" "$((SECONDS - start))s · $file"
  else
    record FAIL "$name" "exit $? after $((SECONDS - start))s · see $file"
  fi
}

# warn "name" "logfile" command... — WARN instead of FAIL on non-zero exit
warn() {
  local name="$1" file="$2"; shift 2
  local start=$SECONDS
  if "$@" >"$OUT/$file" 2>&1; then
    record PASS "$name" "$((SECONDS - start))s · $file"
  else
    record WARN "$name" "needs a look · see $file"
  fi
}

echo "Meal Hacker final sweep — $STAMP"
echo "Report folder: $OUT"
echo

# ---------------------------------------------------------------------------
# 1. Repository hygiene
# ---------------------------------------------------------------------------
cd "$ROOT"

{
  echo "branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "commit: $(git rev-parse --short HEAD)"
  git status --short
} >"$OUT/01-git.log" 2>&1
if [ -z "$(git status --porcelain --untracked-files=no)" ]; then
  record PASS "Working tree clean" "$(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
else
  record WARN "Working tree clean" "uncommitted changes — the sweep tests what's on disk · 01-git.log"
fi

if git ls-files | grep -Eq '(^|/)\.env$'; then
  record FAIL ".env not tracked" "a .env file is committed — remove it with git rm --cached"
else
  record PASS ".env not tracked" "only .env.example files are committed"
fi

if command -v gitleaks >/dev/null 2>&1; then
  run "Secret scan (gitleaks, full history)" "02-gitleaks.log" \
    gitleaks detect --source "$ROOT" --no-banner --redact --log-opts="--all"
else
  # Fallback: look for key-shaped strings in tracked files (not history).
  if git grep -nIE '(sk-|gsk_|AKIA)[A-Za-z0-9]{16,}|SECRET_KEY\s*=\s*["'\'']?[A-Za-z0-9!@#$%^&*()_+=-]{20,}' -- . ':!*.example' ':!docs' >"$OUT/02-secret-grep.log" 2>&1; then
    record FAIL "Secret scan (grep)" "possible secrets in tracked files · 02-secret-grep.log"
  else
    record WARN "Secret scan (grep)" "no matches; install gitleaks (brew install gitleaks) to scan history too"
  fi
fi

# ---------------------------------------------------------------------------
# 2. Backend (Django)
# ---------------------------------------------------------------------------
cd "$ROOT/backend"

run "Django system check" "10-django-check.log" "$PY" manage.py check
run "No missing migrations" "11-migrations.log" "$PY" manage.py makemigrations --check --dry-run
run "Backend test suite" "12-backend-tests.log" "$PY" manage.py test

# Production settings, with throwaway values so the check can load them.
PROD_ENV=(
  DJANGO_SETTINGS_MODULE=meal_hacker.settings.prod
  SECRET_KEY="sweep-only-$(openssl rand -hex 32 2>/dev/null || echo not-a-real-key-but-long-enough-for-the-check)"
  DATABASE_URL="postgres://sweep:sweep@localhost:5432/sweep"
  ALLOWED_HOSTS="meal-hacker-api.onrender.com"
  CSRF_TRUSTED_ORIGINS="https://meal-hacker.vercel.app"
  SECURE_HSTS_SECONDS=31536000
)
warn "Django deploy check (prod settings)" "13-deploy-check.log" \
  env "${PROD_ENV[@]}" "$PY" manage.py check --deploy --fail-level WARNING
STATIC_TMP="$(mktemp -d)"
run "collectstatic (prod settings)" "14-collectstatic.log" \
  env "${PROD_ENV[@]}" STATIC_ROOT_OVERRIDE="$STATIC_TMP" "$PY" -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'meal_hacker.settings.prod')
django.setup()
from django.conf import settings
settings.STATIC_ROOT = os.environ['STATIC_ROOT_OVERRIDE']
from django.core.management import call_command
call_command('collectstatic', interactive=False, verbosity=1)
"
rm -rf "$STATIC_TMP"

run "Demo seed runs" "15-seed.log" env E2E_DB=1 bash -c "'$PY' manage.py migrate --noinput && '$PY' manage.py seed_demo --reset"

if "$PY" -m pip_audit --version >/dev/null 2>&1; then
  warn "Python dependency audit" "16-pip-audit.log" "$PY" -m pip_audit -r requirements.txt
else
  record SKIP "Python dependency audit" "pip-audit not installed (pip install pip-audit to enable)"
fi

# ---------------------------------------------------------------------------
# 3. Frontend (Next.js)
# ---------------------------------------------------------------------------
cd "$ROOT/frontend"

run "Frontend lint" "20-lint.log" npm run lint
run "Frontend typecheck" "21-typecheck.log" npm run typecheck
run "Frontend unit tests" "22-unit-tests.log" npm test
run "Production build" "23-build.log" env NEXT_DIST_DIR=.next-sweep npm run build
warn "npm audit (runtime deps, high+)" "24-npm-audit.log" npm audit --omit=dev --audit-level=high

# ---------------------------------------------------------------------------
# 4. End-to-end + accessibility (Playwright + axe)
# ---------------------------------------------------------------------------
if [ "$QUICK" = 1 ]; then
  record SKIP "End-to-end + axe" "--quick"
else
  run "End-to-end + axe (desktop + mobile)" "30-e2e.log" npm run e2e
fi

# ---------------------------------------------------------------------------
# 5. Lighthouse on a production build
# ---------------------------------------------------------------------------
lighthouse_page() { # path label
  local url="http://127.0.0.1:3020$1" json="$OUT/lighthouse-$2.json"
  CHROME_PATH="$CHROME" npx --yes lighthouse@13.5.0 "$url" \
    --quiet --output=json --output-path="$json" \
    --chrome-flags="--headless=new --no-sandbox" \
    --only-categories=performance,accessibility,best-practices,seo >>"$OUT/40-lighthouse.log" 2>&1 || return 1
  node -e '
    const r = require(process.argv[1]);
    const s = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const low = Object.entries(s).filter(([, v]) => v < 90);
    console.log(JSON.stringify(s));
    process.exit(low.length ? 3 : 0);
  ' "$json"
}

if [ "$LIGHTHOUSE" = 0 ]; then
  record SKIP "Lighthouse" "disabled by flag"
else
  CHROME="$(node -e "console.log(require('@playwright/test').chromium.executablePath())" 2>/dev/null)"
  if [ -z "$CHROME" ] || [ ! -e "$CHROME" ]; then
    record SKIP "Lighthouse" "no Chromium found (run: npx playwright install chromium)"
  else
    (cd "$ROOT/backend" && E2E_DB=1 SPOONACULAR_API_KEY= GROQ_API_KEY= \
      exec "$PY" manage.py runserver 127.0.0.1:8020 --noreload >"$OUT/41-backend-server.log" 2>&1) &
    SERVER_PIDS+=($!)
    (BACKEND_URL=http://127.0.0.1:8020 NEXT_DIST_DIR=.next-sweep exec ./node_modules/.bin/next start -p 3020 \
      >"$OUT/42-frontend-server.log" 2>&1) &
    SERVER_PIDS+=($!)
    for _ in $(seq 1 60); do
      curl -sf -o /dev/null http://127.0.0.1:3020/ && break
      sleep 1
    done
    for page in "/:landing" "/login:login"; do
      path="${page%%:*}"; label="${page##*:}"
      scores="$(lighthouse_page "$path" "$label")"; code=$?
      case $code in
        0) record PASS "Lighthouse $label" "$scores" ;;
        3) record WARN "Lighthouse $label" "below 90: $scores" ;;
        *) record WARN "Lighthouse $label" "could not run · see 40-lighthouse.log" ;;
      esac
    done
    cleanup; SERVER_PIDS=()
  fi
fi

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
cd "$ROOT"
{
  echo "# Meal Hacker final sweep — $STAMP"
  echo
  echo "Branch \`$(git rev-parse --abbrev-ref HEAD)\` at \`$(git rev-parse --short HEAD)\`."
  echo
  if [ "$FAILED" = 0 ]; then
    echo "**Result: no failures.** Check any WARN rows below, then work through docs/DEPLOYMENT.md."
  else
    echo "**Result: FAILED.** Fix the FAIL rows before deploying; logs are next to this file."
  fi
  echo
  echo "| Status | Check | Detail |"
  echo "|---|---|---|"
  for row in "${RESULTS[@]}"; do
    IFS='|' read -r status step detail <<<"$row"
    echo "| $status | $step | $detail |"
  done
} >"$OUT/REPORT.md"

echo
echo "Report: $OUT/REPORT.md"
exit "$FAILED"
