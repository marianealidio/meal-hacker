import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const FRONTEND = path.resolve(__dirname, "..");
const BACKEND = path.resolve(FRONTEND, "../backend");
// CI installs into the system Python; locally the backend lives in its own venv.
const venv = path.join(BACKEND, ".venv/bin/python");
const python = process.env.PYTHON || (existsSync(venv) ? venv : "python");

const WEB = "http://127.0.0.1:3010";
const API = "http://127.0.0.1:8010";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: path.join(FRONTEND, "test-results"),
  reporter: [["list"], ["html", { outputFolder: path.join(FRONTEND, "playwright-report"), open: "never" }]],
  // Every spec signs into the same shared demo kitchen, so run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { baseURL: WEB, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: `"${python}" manage.py migrate --noinput && "${python}" manage.py seed_demo && "${python}" manage.py runserver 127.0.0.1:8010 --noreload`,
      cwd: BACKEND,
      url: `${API}/api/health/`,
      reuseExistingServer: false,
      stdout: process.env.CI ? "pipe" : "ignore",
      timeout: 120_000,
      env: {
        SPOONACULAR_API_KEY: "",
        GROQ_API_KEY: "",
        DJANGO_SETTINGS_MODULE: "meal_hacker.settings.dev",
        E2E_DB: "1",
      },
    },
    {
      command: "npm run build && npm run start -- -p 3010",
      cwd: FRONTEND,
      url: WEB,
      reuseExistingServer: false,
      stdout: process.env.CI ? "pipe" : "ignore",
      timeout: 300_000,
      env: { BACKEND_URL: API, NEXT_DIST_DIR: ".next-e2e" },
    },
  ],
});
