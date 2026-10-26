# Meal Hacker Plan B: Frontend Foundation and Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js frontend foundation (design system, API client, auth, app shell) and the studio-quality landing page in `frontend/`, talking to the Plan A Django API through a same-origin `/api` rewrite.

**Architecture:** Next.js 15 App Router with TypeScript and Tailwind CSS v4 (CSS-first `@theme` tokens). Route groups: `app/(marketing)` (landing, static), `app/(auth)` (login, signup), `app/(app)` (signed-in shell; pages filled in Plan C). All API calls go through `lib/api.ts`, which handles CSRF, the error envelope and the trailing-slash contract. TanStack Query manages server state. Radix primitives give accessible dialogs, tabs, menus and toasts. Motion handles animation, and every animation respects `prefers-reduced-motion`.

**Tech Stack:** next 15.5.x, react 19, typescript 5, tailwindcss 4.3 + @tailwindcss/postcss, motion 14, @tanstack/react-query 5, @radix-ui/react-{dialog,tabs,dropdown-menu,toast} , clsx, lucide-react, vitest 5 + @testing-library/react 16 + jsdom + @vitejs/plugin-react, eslint (next config).

**Spec:** `docs/superpowers/specs/2026-10-26-meal-hacker-redesign-design.md` (sections 3, 4.1, 4.2, 5, 9).

## Global Constraints

- All work in `frontend/`. Node 24, npm. Pin exact versions in `package.json` (no `^`).
- Demo button copy is exactly **"Open the kitchen"** (hero/CTA variant: **"Open the kitchen →"**). The words "Try the demo" must not appear anywhere.
- Colour tokens (contrast-checked; use only these):
  - `cream #FBF6EE` page bg · `paper #F3EBDD` alt sections/cards · `card #FFFDF8` raised cards
  - `sage #8FA98B` wave sections/chips · `sage-deep #34503F` headings/sidebar/footer · `sage-ink #1F3328` text on sage
  - `sage-tint #DFE8DC` "have" chips (text sage-deep)
  - `coral #E8836B` primary buttons (text ink) · `coral-deep #A3472F` coral text on cream/paper/card, script accents · `coral-tint #F7DDD5` "missing"/warning chips (text `#8A3B29`)
  - `blush #F4C9C0` avatars/accents · `butter #F2D08A` stars, "soon" bars · `butter-ink #7A5A10` "soon" text
  - `ink #2A2A26` body · `muted #5C5C55` secondary text (on cream, paper, card) · `line #E6DCCB` hairlines
  - Never put cream/white text on `sage` (fails contrast). On `sage` use `sage-ink`.
- Fonts via `next/font/google`: Fraunces (display; weights 400/500/600, italic), DM Sans (body/UI; 400/500/700), Caveat (accents; 500). CSS variables `--font-display`, `--font-body`, `--font-script`. Caveat used at most once per section.
- Banned: default blue links, plain grey boxes, purple gradients, emoji as icons, generic template layouts. Icons: lucide-react.
- Every animation is disabled under `prefers-reduced-motion: reduce` (use Motion's `useReducedMotion`).
- API contract: every request path ends with `/` (e.g. `/api/inventory/`). Unsafe methods send `X-CSRFToken` read from the `csrftoken` cookie (fetched from `GET /api/csrf/` when missing). Errors arrive as `{"error": {"code","message","fields"}}`. `X-Stale: true` header means cached data.
- Accessibility: WCAG AA contrast, visible focus rings (2px coral-deep outline, 2px offset), every control keyboard reachable, form fields with labels and `aria-describedby` errors, one `<h1>` per page.
- Mobile first: works at 375px with a 16px side gutter and no horizontal scroll.
- Tests: Vitest + Testing Library; no network (mock `fetch`). `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` must all pass at the end of every task.
- Commit after every task; message ends with a `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer.
- Images: remote only (no downloaded files). Unsplash (`images.unsplash.com`, append `?auto=format&fit=crop&w=<px>&q=80`) for marketing photos; Spoonacular (`img.spoonacular.com`) for recipes. Footer credits "Photos: Unsplash".

## Review Focus

1. Trailing slash: Next.js by default redirects `/api/x/` → `/api/x`, and the Django catch-all then 404s. `next.config.ts` must set `skipTrailingSlashRedirect: true` and rewrite both `/api/:path*/` and `/api/:path*` to the backend **with** a trailing slash. (Task 1)
2. CSRF token rotation: Django rotates the CSRF token on login, so the client must re-read the cookie on every unsafe request, never cache the token value in memory. (Task 4)
3. Error envelope not JSON (502 from a cold Render backend returns HTML): the client must turn non-JSON error bodies into `ApiError{code:"network", message:"The kitchen is waking up. Try again in a few seconds."}` instead of throwing a parse error. (Task 4)
4. "Open the kitchen" double-click or slow backend: the button shows a pending state, ignores repeat clicks, and shows an inline error if the request fails, instead of hanging. (Task 6)
5. Signed-out visitor opening `/dashboard` directly: the server-side shell check redirects to `/login?next=/dashboard`; a signed-in visitor opening `/login` goes to `/dashboard`. (Tasks 7 and 8)

## Rulings carried from planning

- Next.js 15.5 (the spec says 15), not 16.
- Types for API payloads are hand-written in `lib/types.ts` (the drf-spectacular schema cannot infer function-view serializers, so generated types would be incomplete).
- Illustrations are a hand-drawn SVG component set (no downloaded or generated image files overnight).
- Landing feature rows use live "mini UI" previews built from the real components instead of screenshots (the app pages are built in Plan C; screenshots can replace them later).
- UI composition tasks (5, 6, 8, 9) specify exact structure, copy, tokens, behaviour and tests, and leave the JSX/CSS craft to the implementer, because visual quality is iterated against screenshots in Task 10.

---

## File structure

```
frontend/
  package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs,
  vitest.config.ts, vitest.setup.ts, .env.example
  app/
    layout.tsx                 fonts, <Providers>, metadata
    globals.css                Tailwind v4 @theme tokens, base styles, focus ring, grain
    providers.tsx              QueryClientProvider + Toaster
    (marketing)/page.tsx       landing
    (marketing)/layout.tsx     marketing header/footer
    (auth)/login/page.tsx, (auth)/signup/page.tsx, (auth)/layout.tsx
    (app)/layout.tsx           server session check + AppShell
    (app)/dashboard/page.tsx … placeholders (Plan C)
    styleguide/page.tsx
    not-found.tsx
  components/
    ui/        Button, Chip, Badge, Card, Field (Input/Select/Textarea), Skeleton, EmptyState,
               Tabs, Dialog, Sheet, Menu, Toaster/useToast, VisuallyHidden
    brand/     Logo, WaveDivider, ArchImage, Blob, Doodle, PaperGrain, Reveal, ScriptNote
    marketing/ SiteHeader, Hero, ProblemBand, HowItWorks, FeatureRow, MiniPreviews, Bento,
               AboutProject, CtaBand, SiteFooter, OpenKitchenButton
    auth/      LoginForm, SignupForm
    shell/     AppShell, Sidebar, BottomTabs, AppHeader, NavItems
  lib/
    api.ts       fetch wrapper, ApiError, csrf, endpoints
    types.ts     API payload types
    session.ts   server-side getSession()
    queries.ts   query keys + useMe / auth mutations
    cn.ts        clsx helper
    greeting.ts  time-of-day greeting
  test/        component + lib tests (*.test.ts[x])
```

---

### Task 1: Scaffold Next.js app, rewrites, tooling, CI job

**Files:**
- Create: `frontend/` (scaffold), `frontend/next.config.ts`, `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`, `frontend/.env.example`, `frontend/test/next-config.test.ts`
- Modify: `.github/workflows/ci.yml` (add `frontend` job), `.gitignore` (already ignores node_modules/.next)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`); env var `BACKEND_URL` (default `http://127.0.0.1:8000`); exported `rewrites()` from next config.

- [ ] **Step 1: Scaffold**

```bash
cd /Users/marianealidio/Mealhacker
npx --yes create-next-app@15.5.28 frontend --ts --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-turbopack --skip-install
cd frontend
npm install --save-exact
npm install --save-exact motion@14.6.0 @tanstack/react-query@5.104.5 @radix-ui/react-dialog@1.3.1 @radix-ui/react-tabs@1.2.1 @radix-ui/react-dropdown-menu@2.2.1 @radix-ui/react-toast@1.3.1 clsx@2.1.1 lucide-react@1.61.0
npm install --save-exact -D vitest@5.0.5 @vitejs/plugin-react@6.1.2 jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/jest-dom @testing-library/user-event
```

If the scaffold's Tailwind is not v4.3, upgrade `tailwindcss` and `@tailwindcss/postcss` to `4.3.3`. Remove all `^`/`~` from `package.json` versions (pin what was installed). Delete the scaffold's demo content in `app/page.tsx` (it is replaced in Task 6; for now render `<main><h1>Meal Hacker</h1></main>`), and delete `public/*.svg` scaffold assets.

Add scripts to `package.json`: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`.

- [ ] **Step 2: Write the failing config test**

`frontend/test/next-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import config from "../next.config";

describe("next.config", () => {
  it("does not redirect trailing slashes (Django needs them)", () => {
    expect(config.skipTrailingSlashRedirect).toBe(true);
  });

  it("rewrites /api paths to the backend with a trailing slash", async () => {
    const rules = await config.rewrites!();
    const list = Array.isArray(rules) ? rules : [...(rules.beforeFiles ?? []), ...(rules.afterFiles ?? []), ...(rules.fallback ?? [])];
    const withSlash = list.find((r) => r.source === "/api/:path*/");
    const withoutSlash = list.find((r) => r.source === "/api/:path*");
    expect(withSlash?.destination).toMatch(/\/api\/:path\*\/$/);
    expect(withoutSlash?.destination).toMatch(/\/api\/:path\*\/$/);
    expect(list.indexOf(withSlash!)).toBeLessThan(list.indexOf(withoutSlash!));
  });

  it("allows remote images from Unsplash and Spoonacular only", () => {
    const hosts = (config.images?.remotePatterns ?? []).map((p) => (typeof p === "object" && "hostname" in p ? p.hostname : ""));
    expect(hosts.sort()).toEqual(["images.unsplash.com", "img.spoonacular.com"]);
  });
});
```

`frontend/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    css: false,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

`frontend/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom lacks matchMedia; Motion and our reduced-motion checks read it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {},
       addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }) as MediaQueryList;
}
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL (`skipTrailingSlashRedirect` undefined / rewrites missing).

- [ ] **Step 4: next.config.ts**

```ts
import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const config: NextConfig = {
  // Django routes end in "/"; Next would otherwise strip it and Django's catch-all would 404.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*/` },
      { source: "/admin/:path*", destination: `${BACKEND_URL}/admin/:path*` },
      { source: "/static/:path*", destination: `${BACKEND_URL}/static/:path*` },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.spoonacular.com" },
    ],
  },
};

export default config;
```

`frontend/.env.example`:

```
# Where the Django API runs. Locally: http://127.0.0.1:8000 ; on Vercel: the Render URL.
BACKEND_URL=http://127.0.0.1:8000
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: all pass.

Then a live rewrite check: start the backend (`cd ../backend && source .venv/bin/activate && python manage.py migrate && python manage.py runserver 8000` in background) and the frontend (`npm run dev` in background, port 3000), then:

```bash
curl -s http://localhost:3000/api/health/   # {"status":"ok"}
curl -s http://localhost:3000/api/health    # {"status":"ok"}
```

Stop both servers.

- [ ] **Step 6: CI job**

Append to `.github/workflows/ci.yml` under `jobs:`:

```yaml
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 7: Commit**

```bash
cd .. && git add frontend .github && git commit -m "chore(frontend): scaffold Next.js 15 app with API rewrites, Vitest and CI job

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 2: Design tokens, fonts, base styles

**Files:**
- Create/replace: `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/lib/cn.ts`, `frontend/test/tokens.test.ts`

**Interfaces:**
- Produces: Tailwind utilities from `@theme`: colours `bg-cream text-ink bg-paper bg-card bg-sage bg-sage-deep text-sage-ink bg-sage-tint bg-coral text-coral-deep bg-coral-tint text-coral-tint-ink bg-blush bg-butter text-butter-ink text-muted border-line`; fonts `font-display font-body font-script`; radii `rounded-card` (20px), `rounded-pill` (999px), `rounded-arch` (`999px 999px 24px 24px`); shadows `shadow-soft`, `shadow-lift`; fluid type utilities `text-display-xl`, `text-display-lg`, `text-display-md`, `text-title`; `cn(...classes)` helper.

- [ ] **Step 1: Write the failing test**

`frontend/test/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

const css = readFileSync(path.join(__dirname, "../app/globals.css"), "utf8");

const TOKENS: Record<string, string> = {
  "--color-cream": "#FBF6EE", "--color-paper": "#F3EBDD", "--color-card": "#FFFDF8",
  "--color-sage": "#8FA98B", "--color-sage-deep": "#34503F", "--color-sage-ink": "#1F3328",
  "--color-sage-tint": "#DFE8DC", "--color-coral": "#E8836B", "--color-coral-deep": "#A3472F",
  "--color-coral-tint": "#F7DDD5", "--color-coral-tint-ink": "#8A3B29", "--color-blush": "#F4C9C0",
  "--color-butter": "#F2D08A", "--color-butter-ink": "#7A5A10", "--color-ink": "#2A2A26",
  "--color-muted": "#5C5C55", "--color-line": "#E6DCCB",
};

describe("design tokens", () => {
  it.each(Object.entries(TOKENS))("%s is %s", (name, hex) => {
    expect(css.toUpperCase()).toContain(`${name.toUpperCase()}: ${hex.toUpperCase()}`);
  });

  it("disables animation for reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it("has a visible focus ring", () => {
    expect(css).toMatch(/:focus-visible/);
  });

  it("cn joins and drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tokens`
Expected: FAIL.

- [ ] **Step 3: Implement**

`frontend/lib/cn.ts`:

```ts
import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
```

`frontend/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-cream: #FBF6EE;
  --color-paper: #F3EBDD;
  --color-card: #FFFDF8;
  --color-sage: #8FA98B;
  --color-sage-deep: #34503F;
  --color-sage-ink: #1F3328;
  --color-sage-tint: #DFE8DC;
  --color-coral: #E8836B;
  --color-coral-deep: #A3472F;
  --color-coral-tint: #F7DDD5;
  --color-coral-tint-ink: #8A3B29;
  --color-blush: #F4C9C0;
  --color-butter: #F2D08A;
  --color-butter-ink: #7A5A10;
  --color-ink: #2A2A26;
  --color-muted: #5C5C55;
  --color-line: #E6DCCB;

  --font-display: var(--font-fraunces), Georgia, serif;
  --font-body: var(--font-dm-sans), system-ui, sans-serif;
  --font-script: var(--font-caveat), cursive;

  --radius-card: 20px;
  --radius-pill: 999px;

  --shadow-soft: 0 1px 2px rgb(42 42 38 / 0.04), 0 8px 24px -12px rgb(52 80 63 / 0.18);
  --shadow-lift: 0 2px 4px rgb(42 42 38 / 0.06), 0 18px 40px -16px rgb(52 80 63 / 0.28);

  --text-display-xl: clamp(2.6rem, 1.6rem + 4.2vw, 5rem);
  --text-display-xl--line-height: 1.02;
  --text-display-lg: clamp(2rem, 1.4rem + 2.6vw, 3.4rem);
  --text-display-lg--line-height: 1.08;
  --text-display-md: clamp(1.5rem, 1.2rem + 1.2vw, 2.1rem);
  --text-display-md--line-height: 1.15;
  --text-title: clamp(1.15rem, 1.05rem + 0.4vw, 1.35rem);
  --text-title--line-height: 1.25;
}

@utility rounded-arch {
  border-radius: 999px 999px 24px 24px;
}

@layer base {
  html { background: var(--color-cream); color: var(--color-ink); }
  body { font-family: var(--font-body); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  h1, h2, h3 { font-family: var(--font-display); font-weight: 500; letter-spacing: -0.02em; color: var(--color-sage-deep); }
  a { color: inherit; text-decoration-color: var(--color-coral); text-underline-offset: 3px; }
  ::selection { background: var(--color-blush); color: var(--color-ink); }
  :focus-visible { outline: 2px solid var(--color-coral-deep); outline-offset: 2px; border-radius: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

`frontend/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Caveat, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["400", "500", "700"], display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Meal Hacker — cook what you have", template: "%s · Meal Hacker" },
  description: "Turn the ingredients already in your kitchen into recipes, a week plan and a shopping list, before anything goes off.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${dmSans.variable} ${caveat.variable}`}>
      <body className="min-h-dvh bg-cream font-body text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Create a temporary `frontend/app/providers.tsx` (Task 4 replaces it):

```tsx
"use client";
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run typecheck && npm run build` all pass.

- [ ] **Step 5: Commit** — `feat(frontend): design tokens, fonts and base styles`.

---

### Task 3: UI primitives and brand components

**Files:**
- Create: `frontend/components/ui/{Button,Chip,Badge,Card,Field,Skeleton,EmptyState,Tabs,Dialog,Menu,Toaster}.tsx`, `frontend/components/brand/{Logo,WaveDivider,ArchImage,Blob,Doodle,PaperGrain,Reveal,ScriptNote}.tsx`, `frontend/test/ui.test.tsx`, `frontend/test/brand.test.tsx`

**Interfaces (produce exactly these props):**
- `Button({ variant?: "primary"|"secondary"|"ghost"|"dark", size?: "sm"|"md"|"lg", pending?: boolean, asChild?: false, ...ButtonHTMLAttributes })` — primary = `bg-coral text-ink`, secondary = 1.5px `border-sage-deep text-sage-deep` transparent, ghost = text-only `text-sage-deep` hover `bg-paper`, dark = `bg-sage-deep text-cream`. All `rounded-pill`, font-medium, min height 44px (md). `pending` sets `aria-busy="true"`, disables, shows a small spinner before children. Also export `ButtonLink` (same styles, renders `next/link`, props `href` + variant/size).
- `Chip({ tone?: "neutral"|"have"|"missing"|"soon", icon?: ReactNode, children })` — neutral `bg-paper text-sage-deep`, have `bg-sage-tint text-sage-deep`, missing `bg-coral-tint text-coral-tint-ink`, soon `bg-butter/40 text-butter-ink`; 12px, pill.
- `Badge` = small uppercase-free label (sentence case), `bg-card border border-line text-muted`.
- `Card({ as?, tone?: "card"|"paper", className, children })` — `rounded-card`, `shadow-soft`, `bg-card` (or paper), hairline `border-line`.
- `Field` exports `TextField({ label, name, error?, hint?, ...InputHTMLAttributes })`, `SelectField({ label, name, error?, options: {value,label}[] })`, `TextAreaField(...)`. Each renders `<label for>`; error text has `id={name+"-error"}`, the control gets `aria-invalid` and `aria-describedby`. Inputs: `bg-card border-line rounded-xl h-11 px-4` with focus ring coral-deep.
- `Skeleton({ className })` — `animate-pulse bg-paper rounded-xl`, `aria-hidden`.
- `EmptyState({ illustration: ReactNode, title, body, action?: ReactNode })`.
- `Tabs` — thin wrappers over Radix Tabs: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`; active trigger has 2px coral underline and `text-sage-deep font-medium`.
- `Dialog` — wrappers over Radix Dialog: `Dialog`, `DialogTrigger`, `DialogContent({ title, description?, children })` (overlay `bg-sage-ink/40`, panel `bg-card rounded-card`, close button with `aria-label="Close"`), and `Sheet` (side panel variant: `side?: "right"|"bottom"`).
- `Menu` — Radix DropdownMenu wrappers: `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem({ onSelect, tone?: "danger" })`.
- `Toaster` + `useToast()` returning `toast({ title, description?, action?: { label, onClick } })`; Radix Toast, bottom-centre on mobile, bottom-right desktop, `bg-sage-deep text-cream`.
- `Logo({ className, withWordmark?: boolean })` — inline SVG mark (a round sage-deep badge with a cream leaf + fork tine motif) + "Meal Hacker" wordmark in Fraunces; `role="img" aria-label="Meal Hacker"`.
- `WaveDivider({ variant: 1|2|3|4, from: string /* tailwind fill class for the colour above */, to: string /* bg class below */, flip?: boolean })` — full-width SVG torn-paper wave, `aria-hidden`, height 28–48px responsive, `preserveAspectRatio="none"`. Four distinct hand-tuned path shapes.
- `ArchImage({ src, alt, sizes, priority?, className, shape?: "arch"|"soft" })` — `next/image` with `fill` inside a relative wrapper clipped to `rounded-arch` (or 28px radius for "soft"); a blob or ring decoration slot via `children`.
- `Blob({ className, tone: "sage"|"blush"|"butter"|"coral" })` — organic SVG blob, `aria-hidden`.
- `Doodle({ name: "leaf"|"sprig"|"sparkle"|"whisk"|"lemon"|"heart"|"arrow"|"dashed-path", className })` — hand-drawn style line SVGs (stroke 2–2.5, round caps, no fill except accents), `aria-hidden`. Draw them as real, recognisable little drawings.
- `PaperGrain()` — fixed, pointer-events-none overlay using an inline SVG `feTurbulence` noise at ≤4% opacity, `aria-hidden`.
- `Reveal({ children, delay?: number, y?: number, as? })` — Motion `whileInView` fade-up once (`viewport: { once: true, margin: "-10% 0px" }`); renders children with no motion props when `useReducedMotion()` is true.
- `ScriptNote({ children, className, arrow?: "down-right"|"down-left"|"none" })` — Caveat text in `text-coral-deep` with an optional hand-drawn arrow doodle.

- [ ] **Step 1: Write failing tests**

`frontend/test/ui.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/Field";
import { DialogContent, Dialog, DialogTrigger } from "@/components/ui/Dialog";

describe("Button", () => {
  it("primary uses coral with ink text", () => {
    render(<Button>Go</Button>);
    const b = screen.getByRole("button", { name: "Go" });
    expect(b.className).toContain("bg-coral");
    expect(b.className).toContain("text-ink");
  });

  it("pending is busy, disabled and ignores clicks", async () => {
    const onClick = vi.fn();
    render(<Button pending onClick={onClick}>Save</Button>);
    const b = screen.getByRole("button", { name: /save/i });
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b).toBeDisabled();
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Chip", () => {
  it("missing tone uses coral tint", () => {
    render(<Chip tone="missing">missing 2</Chip>);
    expect(screen.getByText("missing 2").closest("span")!.className).toContain("bg-coral-tint");
  });
});

describe("TextField", () => {
  it("links label and error accessibly", () => {
    render(<TextField label="Username" name="username" error="That username is taken." />);
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "username-error");
    expect(screen.getByText("That username is taken.")).toHaveAttribute("id", "username-error");
  });
});

describe("Dialog", () => {
  it("opens with a title and a labelled close button", async () => {
    render(
      <Dialog>
        <DialogTrigger asChild><button>Open</button></DialogTrigger>
        <DialogContent title="Add to plan">body</DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog", { name: "Add to plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
```

`frontend/test/brand.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Logo } from "@/components/brand/Logo";
import { WaveDivider } from "@/components/brand/WaveDivider";
import { Doodle } from "@/components/brand/Doodle";

vi.mock("motion/react", async (orig) => {
  const mod = await orig<typeof import("motion/react")>();
  return { ...mod, useReducedMotion: () => true };
});

describe("brand", () => {
  it("logo is a labelled image", () => {
    render(<Logo withWordmark />);
    expect(screen.getByRole("img", { name: "Meal Hacker" })).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4] as const)("wave %i is decorative", (v) => {
    const { container } = render(<WaveDivider variant={v} from="fill-cream" to="bg-sage" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("wave variants have distinct shapes", () => {
    const paths = ([1, 2, 3, 4] as const).map((v) => {
      const { container } = render(<WaveDivider variant={v} from="fill-cream" to="bg-sage" />);
      return container.querySelector("path")!.getAttribute("d");
    });
    expect(new Set(paths).size).toBe(4);
  });

  it("doodles are decorative", () => {
    const { container } = render(<Doodle name="sprig" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("Reveal renders children without motion when reduced motion is on", async () => {
    const { Reveal } = await import("@/components/brand/Reveal");
    render(<Reveal><p>hello</p></Reveal>);
    expect(screen.getByText("hello")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` FAILS (modules missing).

- [ ] **Step 3: Implement** every component listed under Interfaces, client components only where needed (`"use client"` for Dialog, Menu, Tabs, Toaster, Reveal, Button if it uses state). Keep each file focused. Use `cn` for classes.

- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run typecheck && npm run build`.

- [ ] **Step 5: Commit** — `feat(frontend): UI primitives and brand components (waves, arches, doodles, reveal)`.

---

### Task 4: API client, types, query provider, session helper

**Files:**
- Create: `frontend/lib/{api,types,queries,session,greeting}.ts`, replace `frontend/app/providers.tsx`, `frontend/test/api.test.ts`, `frontend/test/greeting.test.ts`

**Interfaces:**
- `lib/types.ts` exports (mirror the Plan A API exactly):

```ts
export type Me = { id: number; username: string; display_name: string; diet: string; intolerances: string[]; onboarded: boolean; is_demo: boolean };
export type Category = "Fridge" | "Pantry" | "Freezer";
export type InventoryItem = { id: number; name: string; quantity: string; unit: string; category: Category; expiry_date: string | null; days_left: number | null; expires_soon: boolean; date_added: string };
export type Note = { note: string; updated_at: string };
export type MissingIngredient = { name: string; aisle: string };
export type RecipeSummary = { id: number; title: string; image: string; description: string; ready_in_minutes: number | null; servings: number | null; diets: string[]; used: string[]; missing: MissingIngredient[]; is_favourite: boolean; uses_expiring?: string[] };
export type RecipeIngredient = { name: string; amount: number | null; unit: string; original: string; aisle: string; have: boolean };
export type RecipeDetail = RecipeSummary & { ingredients: RecipeIngredient[]; steps: string[]; source_url: string; cuisines: string[] };
export type Suggestions = { results: RecipeSummary[]; reason: "need_more_ingredients" | null };
export type Favourite = { recipe_id: number; title: string; image: string; description: string; created_at: string };
export type Slot = "breakfast" | "lunch" | "dinner";
export type MealPlan = { id: number; recipe_id: number; recipe_title: string; recipe_image: string; description: string; planned_date: string; slot: Slot };
export type Week = { week_start: string; days: { date: string; meals: MealPlan[] }[] };
export type ShoppingItem = { id: number; ingredient_name: string; quantity: string; aisle: string; checked: boolean; source: "manual" | "auto"; meal_plan: number | null; date_added: string };
export type Stats = { used_this_month: number; expired_this_month: number; meals_planned_this_week: number; items_in_kitchen: number; expiring_soon: number };
export type ChatMessage = { role: "user" | "assistant"; content: string };
```

- `lib/api.ts` exports:
  - `class ApiError extends Error { status: number; code: string; fields: Record<string, string[]> }`
  - `async function apiFetch<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<{ data: T; stale: boolean }>` — path must start with `/api/` and end with `/` before any `?` (throw `Error("API paths must end with /")` otherwise); `credentials: "same-origin"`; JSON body; for POST/PUT/PATCH/DELETE ensures a CSRF cookie (calls `GET /api/csrf/` if `csrftoken` cookie absent) and sends `X-CSRFToken` **read fresh from `document.cookie` on each call**; 204 → `data` undefined; non-2xx with JSON envelope → `ApiError(status, code, message, fields)`; non-JSON error body or network failure → `ApiError(status || 0, "network", "The kitchen is waking up. Try again in a few seconds.", {})`; `stale = res.headers.get("X-Stale") === "true"`.
  - Endpoint helpers (thin, typed): `api.me()`, `api.login(username, password)`, `api.signup(username, password)`, `api.logout()`, `api.demo()`, `api.updateMe(patch)`, `api.changePassword(old, next)`, `api.inventory(category?)`, `api.addInventory(input)`, `api.updateInventory(id, patch)`, `api.deleteInventory(id)`, `api.useInventory(id)`, `api.note()`, `api.saveNote(note)`, `api.suggestions()`, `api.search(params)`, `api.recipe(id)`, `api.favourites()`, `api.addFavourite(recipeId)`, `api.removeFavourite(recipeId)`, `api.week(date?)`, `api.addPlan(input)`, `api.updatePlan(id, patch)`, `api.deletePlan(id)`, `api.shopping()`, `api.addShopping(input)`, `api.updateShopping(id, patch)`, `api.deleteShopping(id)`, `api.shoppingToInventory(id, input)`, `api.clearChecked()`, `api.stats()`, `api.chat(messages)`. Each returns `apiFetch` result data (`Promise<T>`), except list endpoints that may be stale return `{ data, stale }` (`suggestions`, `search`, `recipe`).
- `lib/queries.ts`: `queryKeys` object (`me`, `inventory(category?)`, `note`, `suggestions`, `search(params)`, `recipe(id)`, `favourites`, `week(date)`, `shopping`, `stats`), `useMe()` query (retry false), `useLogin()`, `useSignup()`, `useDemoLogin()`, `useLogout()` mutations that set/clear `queryKeys.me`.
- `lib/session.ts` (server only, `import "server-only"` is NOT required; use `next/headers`): `async function getSession(): Promise<Me | null>` — calls `${process.env.BACKEND_URL}/api/auth/me/` forwarding the incoming `cookie` header, `cache: "no-store"`; returns `Me` on 200, `null` on 401/403, `null` on network error.
- `lib/greeting.ts`: `greeting(date: Date, name: string): string` → "Good morning, X" (05:00–11:59), "Good afternoon, X" (12:00–17:59), "Good evening, X" otherwise; name falls back to "chef" when blank.
- `app/providers.tsx`: `QueryClientProvider` (staleTime 30s, refetchOnWindowFocus false) + `<Toaster />`.

- [ ] **Step 1: Write failing tests**

`frontend/test/api.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiFetch } from "@/lib/api";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

beforeEach(() => {
  document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

describe("apiFetch", () => {
  it("rejects paths without a trailing slash", async () => {
    await expect(apiFetch("/api/inventory")).rejects.toThrow("API paths must end with /");
  });

  it("allows query strings after the slash", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json([]));
    await apiFetch("/api/inventory/?category=Fridge");
    expect(f.mock.calls[0][0]).toBe("/api/inventory/?category=Fridge");
  });

  it("fetches a CSRF cookie before the first unsafe request and sends it", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url) === "/api/csrf/") {
        document.cookie = "csrftoken=abc123; path=/";
        return json({ csrfToken: "abc123" });
      }
      return json({ id: 1 }, 201);
    });
    await apiFetch("/api/inventory/", { method: "POST", body: { name: "milk" } });
    expect(f.mock.calls[0][0]).toBe("/api/csrf/");
    const init = f.mock.calls[1][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-CSRFToken"]).toBe("abc123");
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBe(JSON.stringify({ name: "milk" }));
  });

  it("re-reads the CSRF cookie on every request (Django rotates it on login)", async () => {
    document.cookie = "csrftoken=first; path=/";
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}, 200));
    await apiFetch("/api/auth/login/", { method: "POST", body: {} });
    document.cookie = "csrftoken=second; path=/";
    await apiFetch("/api/auth/logout/", { method: "POST" });
    const tokens = f.mock.calls.map((c) => ((c[1] as RequestInit).headers as Record<string, string>)["X-CSRFToken"]);
    expect(tokens).toEqual(["first", "second"]);
  });

  it("parses the error envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { name: ["Enter an ingredient name."] } } }, 400));
    const err = await apiFetch("/api/inventory/").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: "invalid", fields: { name: ["Enter an ingredient name."] } });
  });

  it("turns HTML error pages into a friendly network error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>502</html>", { status: 502, headers: { "Content-Type": "text/html" } }));
    const err = await apiFetch("/api/stats/").catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: "network" });
    expect(err.message).toMatch(/waking up/);
  });

  it("turns a rejected fetch into a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/stats/")).rejects.toMatchObject({ status: 0, code: "network" });
  });

  it("reports stale data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ results: [], reason: null }, 200, { "X-Stale": "true" }));
    const r = await apiFetch("/api/recipes/suggestions/");
    expect(r.stale).toBe(true);
  });

  it("handles 204", async () => {
    document.cookie = "csrftoken=t; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteInventory(3)).resolves.toBeUndefined();
  });

  it("endpoint helpers use trailing-slash paths", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}));
    document.cookie = "csrftoken=t; path=/";
    await api.week("2026-10-26");
    await api.recipe(716429);
    await api.shoppingToInventory(5, { category: "Fridge", expiry_date: null });
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      "/api/plans/?week=2026-10-26", "/api/recipes/716429/", "/api/shopping/5/to-inventory/",
    ]);
  });
});
```

`frontend/test/greeting.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { greeting } from "@/lib/greeting";

describe("greeting", () => {
  it.each([
    [7, "Good morning, Ann"], [11, "Good morning, Ann"], [12, "Good afternoon, Ann"],
    [17, "Good afternoon, Ann"], [18, "Good evening, Ann"], [2, "Good evening, Ann"],
  ])("%i:00 → %s", (h, expected) => {
    expect(greeting(new Date(2026, 9, 26, h, 0), "Ann")).toBe(expected);
  });

  it("falls back to chef", () => {
    expect(greeting(new Date(2026, 9, 26, 9), "  ")).toBe("Good morning, chef");
  });
});
```

- [ ] **Step 2: Run to verify failure** — FAIL.

- [ ] **Step 3: Implement** `lib/types.ts` (exactly as above), `lib/api.ts`, `lib/queries.ts`, `lib/session.ts`, `lib/greeting.ts`, `app/providers.tsx`.

Core of `lib/api.ts` (complete the endpoint helpers following this pattern):

```ts
import type * as T from "./types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const NETWORK_MESSAGE = "The kitchen is waking up. Try again in a few seconds.";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  const value = match ? decodeURIComponent(match.slice(name.length + 1)) : "";
  return value || null;
}

async function ensureCsrf(): Promise<string> {
  let token = readCookie("csrftoken");
  if (!token) {
    await fetch("/api/csrf/", { credentials: "same-origin" });
    token = readCookie("csrftoken");
  }
  return token ?? "";
}

export async function apiFetch<R>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<{ data: R; stale: boolean }> {
  const [pathname] = path.split("?");
  if (!pathname.startsWith("/api/") || !pathname.endsWith("/")) throw new Error("API paths must end with /");
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (UNSAFE.has(method)) headers["X-CSRFToken"] = await ensureCsrf();

  let res: Response;
  try {
    res = await fetch(path, {
      method, headers, credentials: "same-origin", signal: init.signal,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network", NETWORK_MESSAGE);
  }
  const stale = res.headers.get("X-Stale") === "true";
  if (res.status === 204) return { data: undefined as R, stale };
  const isJson = (res.headers.get("Content-Type") ?? "").includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const e = body?.error;
    if (e && typeof e.code === "string") throw new ApiError(res.status, e.code, e.message ?? "Something went wrong.", e.fields ?? {});
    throw new ApiError(res.status, "network", NETWORK_MESSAGE);
  }
  return { data: body as R, stale };
}

const get = <R>(p: string) => apiFetch<R>(p).then((r) => r.data);
const send = <R>(method: string, p: string, body?: unknown) => apiFetch<R>(p, { method, body }).then((r) => r.data);

export const api = {
  me: () => get<T.Me>("/api/auth/me/"),
  login: (username: string, password: string) => send<T.Me>("POST", "/api/auth/login/", { username, password }),
  // …every helper listed in Interfaces, same pattern…
  week: (date?: string) => get<T.Week>(`/api/plans/${date ? `?week=${encodeURIComponent(date)}` : ""}`),
  recipe: (id: number) => apiFetch<T.RecipeDetail>(`/api/recipes/${id}/`),
};
```

- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run typecheck && npm run build`.

- [ ] **Step 5: Commit** — `feat(frontend): typed API client with CSRF, envelope errors, query provider and session helper`.

---

### Task 5: Marketing chrome — header and footer

**Files:**
- Create: `frontend/app/(marketing)/layout.tsx`, `frontend/components/marketing/{SiteHeader,SiteFooter,OpenKitchenButton}.tsx`, `frontend/test/marketing-chrome.test.tsx`
- Delete: `frontend/app/page.tsx` (the landing moves to `app/(marketing)/page.tsx` in Task 6; create that file now with `<h1>` placeholder so the build passes)

**Interfaces:**
- `OpenKitchenButton({ variant?: "primary"|"dark", size?, arrow?: boolean, className })` — client component. Label "Open the kitchen" (+ " →" when `arrow`). On click: `useDemoLogin().mutate()`; while pending shows `pending` state and ignores further clicks; on success `router.push("/dashboard")`; on error shows the error message in a polite live region next to the button (`role="status"`).
- `SiteHeader` — sticky top; transparent over cream at scroll 0, then `bg-cream/80 backdrop-blur border-b border-line` after 12px scroll (client, scroll listener with passive option). Left: `Logo withWordmark` linking `/`. Centre (≥md): links Features (`#features`), How it works (`#how-it-works`), About (`#about`). Right: "Log in" ghost link to `/login`, `OpenKitchenButton size="sm"`. Mobile (<md): logo + menu button (`aria-label="Open menu"`, `aria-expanded`) that opens a `Sheet` with the same links, "Log in" and a full-width `OpenKitchenButton`.
- `SiteFooter` — `bg-sage-deep text-cream`, top `WaveDivider variant={4}` from the section above. Columns: logo + one-line mission ("Less waste, better dinners."); Product links (Features, How it works, Log in, Sign up); Project links (About, GitHub → `https://github.com/marianealidio/meal-hacker`); small print: "© 2026 Mariane Alidio · BSc Computer Science, University of Westminster · Photos: Unsplash · Recipe data: Spoonacular".

- [ ] **Step 1: Write failing tests**

`frontend/test/marketing-chrome.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/" }));

import { OpenKitchenButton } from "@/components/marketing/OpenKitchenButton";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

function wrap(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe("OpenKitchenButton", () => {
  it("says Open the kitchen", () => {
    wrap(<OpenKitchenButton arrow />);
    expect(screen.getByRole("button", { name: "Open the kitchen →" })).toBeInTheDocument();
  });

  it("logs into the demo once and goes to the dashboard", async () => {
    document.cookie = "csrftoken=t; path=/";
    let resolve!: (r: Response) => void;
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((r) => { resolve = r; }));
    wrap(<OpenKitchenButton />);
    const btn = screen.getByRole("button", { name: "Open the kitchen" });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe("/api/auth/demo/");
    resolve(new Response(JSON.stringify({ id: 1, username: "demo", is_demo: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the error when the backend is asleep", async () => {
    document.cookie = "csrftoken=t; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html/>", { status: 502, headers: { "Content-Type": "text/html" } }));
    wrap(<OpenKitchenButton />);
    await userEvent.click(screen.getByRole("button", { name: "Open the kitchen" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/waking up/);
  });
});

describe("SiteHeader", () => {
  it("has nav links, log in and the kitchen button", () => {
    wrap(<SiteHeader />);
    expect(screen.getAllByRole("link", { name: "How it works" })[0]).toHaveAttribute("href", "#how-it-works");
    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("button", { name: "Open the kitchen" }).length).toBeGreaterThan(0);
  });

  it("mobile menu button toggles aria-expanded", async () => {
    wrap(<SiteHeader />);
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SiteFooter", () => {
  it("credits the author, Unsplash and Spoonacular", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Mariane Alidio/)).toBeInTheDocument();
    expect(screen.getByText(/Unsplash/)).toBeInTheDocument();
    expect(screen.getByText(/Spoonacular/)).toBeInTheDocument();
  });

  it("never says Try the demo", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).not.toMatch(/try the demo/i);
  });
});
```

- [ ] **Step 2: Run to verify failure** — FAIL.
- [ ] **Step 3: Implement** to the Interfaces spec and the art direction (spec §3).
- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 5: Commit** — `feat(frontend): marketing header, footer and Open the kitchen button`.

---

### Task 6: Landing page

**Files:**
- Create: `frontend/app/(marketing)/page.tsx`, `frontend/components/marketing/{Hero,ProblemBand,HowItWorks,FeatureRow,MiniPreviews,Bento,AboutProject,CtaBand}.tsx`, `frontend/test/landing.test.tsx`

**Interfaces / content (copy is final; use it verbatim):**

Page order, each section full-bleed with a 16px gutter on mobile and a `max-w-6xl` inner container:

1. **Hero** (`bg-cream`, `<h1>`): ScriptNote "fresh from your fridge" with a down-right arrow. Headline: "Cook what you have." then on its own line an italic coral-deep span "Waste nothing." (`text-display-xl`). Sub: "Meal Hacker turns the ingredients already in your kitchen into recipes, a week plan and a shopping list, before anything goes off." Buttons: `OpenKitchenButton arrow size="lg"` and `ButtonLink variant="secondary" href="/signup"` "Sign up free". Small trust line under buttons (muted, 14px): "No sign-up needed for the demo kitchen." Right column: `ArchImage` (Unsplash `photo-1512621776951-a57141f2eefd`, alt "A colourful bowl of roasted vegetables, grains and greens", `priority`) on a sage `Blob`, with two floating mini cards (Card, shadow-lift, gentle float animation): "3 items expiring" (Clock icon, coral-deep) and "Pasta primavera · uses 5 of yours" (sage-tint chip "uses 5"). Floating doodles: sprig and sparkle. Mobile: image stacks below copy at ~80vw.
2. **WaveDivider** variant 1 cream→sage.
3. **ProblemBand** (`bg-sage`, text `sage-ink`): big number "4.5 million tonnes" (Fraunces display-lg) + "of edible food is thrown away by UK households every year." + source line "Source: WRAP, Courtauld Commitment 2025 report" (small, sage-ink, underlined link to `https://www.wrap.ngo`). One-line pivot: "Most of it is food we forgot we had. Meal Hacker remembers for you."
4. **WaveDivider** variant 2 sage→paper.
5. **HowItWorks** (`id="how-it-works"`, `bg-paper`): ScriptNote "three little steps", `<h2>` "How it works". Three cards connected by a dashed hand-drawn path `Doodle name="dashed-path"` (hidden on mobile, cards stack): 1 "Stock your kitchen" — "Add what's in your fridge, pantry and freezer. Type “2 red peppers” and we do the rest." (illustration: hand-drawn fridge SVG), 2 "Get matched recipes" — "Recipes ranked by what you already own, with whatever expires first at the top." (chef-hat/pan SVG), 3 "Plan and shop" — "Drop meals into your week. Anything missing lands on your shopping list." (basket SVG). Number badges in coral circles.
6. **WaveDivider** variant 3 paper→cream.
7. **Features** (`id="features"`, `bg-cream`): `<h2>` "Everything your kitchen needs", then five alternating `FeatureRow`s (image/preview left on odd, right on even), each: ScriptNote kicker, `<h3>` title, 2-sentence body, 3 bullet ticks (Check icon in sage-deep), and a visual:
   - "Your kitchen, at a glance" — kicker "know what you've got" — body "Fridge, pantry and freezer in one place, sorted by what expires first. Colour-coded countdowns tell you what to use tonight." bullets: "Quick-add in plain English", "Expiry countdowns", "Mark items as used" — visual `MiniKitchenPreview` (three item cards with coral/butter/sage expiry bars, mirroring the kitchen mockup in the spec).
   - "Recipes that fit your fridge" — kicker "no more 'what's for dinner?'" — body "Every suggestion shows what you already have and what's missing, with a short description and cook time." bullets: "Ranked by expiring items", "Diet and allergy aware", "Save favourites" — visual `MiniMealCardPreview` (arch image Spoonacular `716429-556x370.jpg`, title "Pasta with garlic, scallions and cauliflower", description, chips "30 min", "uses 5", "missing 2").
   - "A week that plans itself" — kicker "breakfast, lunch and dinner" — body "Drag meals into your week and move them around. Missing ingredients go straight onto your list." — visual `MiniPlannerPreview` (7 day columns, 3 slots, a few meal pills).
   - "A shopping list that shops back" — kicker "tick, done, stored" — body "Tick items off as you shop, then move them into your kitchen with one tap." — visual `MiniShoppingPreview` (aisle groups, one item ticked with a drawn check).
   - "A kitchen assistant on call" — kicker "ask me anything" — body "Ask what to do with half a lemon or how long rice keeps. It knows what's in your kitchen." — visual `MiniAssistantPreview` (two chat bubbles).
   Each visual sits in an `ArchImage`-style frame or soft card on a `Blob`; previews are static (no API calls), `aria-hidden` on purely decorative parts with an `aria-label` summary on the frame.
8. **Bento** (`bg-cream`): `<h2>` "And a few small luxuries" — 5 tiles in a responsive bento grid (2 cols mobile, 4 cols desktop, varied spans): "Favourites" (Heart), "Diet and allergies" (Leaf), "Use it up" (Sparkles), "Waste stats — 12 items saved this month" (big number), "Works on your phone" (Smartphone). Tiles alternate card/paper/sage-tint/blush backgrounds; text contrast per tokens.
9. **WaveDivider** variant 2 cream→paper.
10. **AboutProject** (`id="about"`, `bg-paper`): two columns. Left: ScriptNote "the story", `<h2>` "Built as a final-year project", body: "Meal Hacker started as my BSc Computer Science final-year project at the University of Westminster in 2026: a small app to stop good food going in the bin. This version is a full rebuild, with a Django REST API, a Next.js front end and a design system made from scratch." Signature line in Caveat: "— Mariane". Right: "Built with" tech chips (Django, Django REST Framework, Next.js, TypeScript, Tailwind CSS, TanStack Query, PostgreSQL, Spoonacular API, Groq) and a small `ArchImage` (Unsplash `photo-1760445529235-00eaa84b81ca`, alt "Hands arranging cherry tomatoes on a wooden board", shape "soft").
11. **WaveDivider** variant 3 paper→sage-deep.
12. **CtaBand** (`bg-sage-deep text-cream`): doodles (leaf, sparkle) in sage at low opacity, `<h2>` (cream) "Your kitchen is already full of dinners.", sub "Open the demo kitchen and see what it can make tonight.", `OpenKitchenButton arrow size="lg"` (primary coral on dark).
13. `SiteFooter` (from the marketing layout).

Motion: hero copy and image fade-up on load (staggered 80ms); sections use `Reveal`; hero mini-cards float (y ±6px, 6s, ease-in-out, infinite) and doodles drift slowly; feature visuals have a subtle parallax (Motion `useScroll`/`useTransform`, ≤24px). All disabled by reduced motion.

Page metadata: title "Cook what you have, waste nothing", description = hero sub, Open Graph title/description.

- [ ] **Step 1: Write failing tests**

`frontend/test/landing.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));
vi.mock("motion/react", async (orig) => ({ ...(await orig<typeof import("motion/react")>()), useReducedMotion: () => true }));

import LandingPage from "@/app/(marketing)/page";

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient()}><LandingPage /></QueryClientProvider>);
}

describe("landing page", () => {
  it("has exactly one h1 with the headline", () => {
    renderPage();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Cook what you have.");
    expect(h1s[0]).toHaveTextContent("Waste nothing.");
  });

  it("has the main sections with anchors", () => {
    const { container } = renderPage();
    for (const id of ["how-it-works", "features", "about"]) expect(container.querySelector(`#${id}`)).not.toBeNull();
    for (const name of ["How it works", "Everything your kitchen needs", "Built as a final-year project", "Your kitchen is already full of dinners."]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  it("cites the food waste source", () => {
    renderPage();
    expect(screen.getByText(/4.5 million tonnes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WRAP/ })).toHaveAttribute("href", "https://www.wrap.ngo");
  });

  it("offers Open the kitchen and never Try the demo", () => {
    const { container } = renderPage();
    expect(screen.getAllByRole("button", { name: /Open the kitchen/ }).length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toMatch(/try the demo/i);
  });

  it("has five feature rows", () => {
    renderPage();
    const features = screen.getByRole("heading", { name: "Everything your kitchen needs" }).closest("section")!;
    expect(within(features).getAllByRole("heading", { level: 3 })).toHaveLength(5);
  });

  it("every image has alt text", () => {
    const { container } = renderPage();
    container.querySelectorAll("img").forEach((img) => expect(img.getAttribute("alt")).toBeTruthy());
  });
});
```

(The landing page must not be an async server component that fetches data, so it renders in the test. Client islands inside it are fine.)

- [ ] **Step 2: Run to verify failure** — FAIL.
- [ ] **Step 3: Implement** to the content spec and art direction. Studio quality is the bar: generous whitespace, strong type hierarchy, layered shapes, no generic template feel.
- [ ] **Step 4: Verify** — `npm test && npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 5: Commit** — `feat(frontend): landing page with hero, how it works, features, bento, story and CTA`.

---

### Task 7: Auth pages

**Files:**
- Create: `frontend/app/(auth)/layout.tsx`, `frontend/app/(auth)/login/page.tsx`, `frontend/app/(auth)/signup/page.tsx`, `frontend/components/auth/{LoginForm,SignupForm,AuthCard}.tsx`, `frontend/test/auth.test.tsx`

**Interfaces:**
- `(auth)/layout.tsx` (server): `getSession()`; if signed in → `redirect("/dashboard")`. Renders a split layout: left a sage-deep panel (hidden < md) with logo, Caveat note "welcome back to the kitchen", an `ArchImage` (Unsplash `photo-1626200419537-f07108a01aac`, alt "A bowl of green soup with fresh herbs"), and a quote; right the form card on cream.
- `LoginForm` (client): `TextField` "Username" (autocomplete username), `TextField` "Password" (type password, autocomplete current-password), primary `Button` "Log in" (pending while submitting). On `ApiError` code `invalid_credentials` show a form-level error (`role="alert"`) with the server message; field errors from `fields` map to the fields. On success → `router.push(next ?? "/dashboard")`, where `next` comes from `useSearchParams().get("next")` and is only honoured if it starts with "/" and not "//". Below: "New here? Create an account" link to `/signup`, divider "or", `OpenKitchenButton variant="dark"` with hint "Explore a ready-made demo kitchen".
- `SignupForm`: "Username" (hint "3–150 letters, numbers or . @ + - _"), "Password" (hint "At least 8 characters, not too common"), `Button` "Create account". Field errors from envelope. On success → `/dashboard`. Link "Already have an account? Log in".
- Page `<h1>`s: "Log in" and "Create your account". Metadata titles "Log in", "Sign up".

- [ ] **Step 1: Write failing tests**

`frontend/test/auth.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => search, usePathname: () => "/login" }));

import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

beforeEach(() => { push.mockReset(); search = new URLSearchParams(); document.cookie = "csrftoken=t; path=/"; });

describe("LoginForm", () => {
  it("logs in and goes to next when it is a local path", async () => {
    search = new URLSearchParams("next=/planner");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 1, username: "ann" }));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/planner"));
    expect(f.mock.calls.at(-1)![0]).toBe("/api/auth/login/");
  });

  it("ignores an external next", async () => {
    search = new URLSearchParams("next=//evil.example");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ id: 1, username: "ann" }));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows wrong-password errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid_credentials", message: "That username and password don't match.", fields: {} } }, 400));
    wrap(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ann");
    await userEvent.type(screen.getByLabelText("Password"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That username and password don't match.");
  });

  it("offers the demo kitchen", () => {
    wrap(<LoginForm />);
    expect(screen.getByRole("button", { name: "Open the kitchen" })).toBeInTheDocument();
  });
});

describe("SignupForm", () => {
  it("maps field errors to fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "invalid", message: "Some fields need fixing.", fields: { username: ["That username is taken. Try another."] } } }, 400));
    wrap(<SignupForm />);
    await userEvent.type(screen.getByLabelText("Username"), "taken");
    await userEvent.type(screen.getByLabelText("Password"), "Str0ngPass!23");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("That username is taken. Try another.")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
  });
});
```

- [ ] **Step 2–5:** fail → implement → verify (`npm test && npm run lint && npm run typecheck && npm run build`) → commit `feat(frontend): login and signup pages with demo entry`.

---

### Task 8: App shell with server session guard

**Files:**
- Create: `frontend/app/(app)/layout.tsx`, `frontend/components/shell/{AppShell,Sidebar,BottomTabs,AppHeader,NavItems}.tsx`, placeholder pages `frontend/app/(app)/{dashboard,kitchen,recipes,favourites,planner,shopping,profile}/page.tsx`, `frontend/test/shell.test.tsx`, `frontend/lib/nav.ts`

**Interfaces:**
- `lib/nav.ts`: `export const NAV = [{ href: "/dashboard", label: "Dashboard", icon: "Home" }, { href: "/kitchen", label: "Kitchen", icon: "Refrigerator" }, { href: "/recipes", label: "Recipes", icon: "BookOpen" }, { href: "/favourites", label: "Favourites", icon: "Heart" }, { href: "/planner", label: "Planner", icon: "CalendarDays" }, { href: "/shopping", label: "Shopping", icon: "ShoppingBasket" }] as const;` (icon names are lucide component names; map them in NavItems).
- `(app)/layout.tsx` (server): `const me = await getSession(); if (!me) redirect("/login?next=" + encodeURIComponent(currentPath))` — get the current path from the `x-pathname` request header if present, else default `/dashboard`. (Add `frontend/middleware.ts` that sets `x-pathname` on the request headers via `NextResponse.next({ request: { headers } })` for matcher `["/dashboard", "/kitchen", "/recipes/:path*", "/favourites", "/planner", "/shopping", "/profile"]`.) Renders `<AppShell me={me}>{children}</AppShell>`.
- `AppShell({ me, children })` (client): desktop (≥lg) fixed left `Sidebar` 248px `bg-sage-deep`; content area `bg-cream` with `AppHeader` and `<main id="main">`; mobile: `AppHeader` top, `BottomTabs` fixed bottom (5 items: Dashboard, Kitchen, Recipes, Planner, Shopping; Favourites reachable from Recipes and sidebar). A "Skip to content" link first in the DOM.
- `Sidebar`: logo (cream variant), `NavItems` (active item: `bg-cream text-sage-deep font-medium rounded-xl`; inactive `text-[#E6EEE3] hover:bg-white/10`), a stats card slot at the bottom (`bg-sage text-sage-ink`, label "This month", big "— items", "used before expiry"; real data wired in Plan C — render the card with a `stat` prop that defaults to `null` showing "—"), and the account row (avatar initials on blush, display name, "Profile" link, "Log out" ghost button calling `useLogout` then `router.push("/")`).
- `AppHeader({ me })`: greeting from `greeting(new Date(), me.display_name || me.username)` in Fraunces; right: assistant button (`aria-label="Open kitchen assistant"`, MessageCircle icon, opens nothing yet — Plan C wires the panel; it calls an `onAssistant` prop defaulting to no-op) and avatar link to `/profile`. Demo users see a small chip "Demo kitchen · resets daily".
- `aria-current="page"` on the active nav link (from `usePathname()`; `/recipes/123` activates Recipes).
- Placeholder pages each render `<h1>` with the page name (Dashboard, Your kitchen, Recipes, Favourites, Planner, Shopping list, Profile) and an `EmptyState` "Coming together" — Plan C replaces them.

- [ ] **Step 1: Write failing tests**

`frontend/test/shell.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let pathname = "/recipes/716429";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => pathname }));

import { AppShell } from "@/components/shell/AppShell";
import type { Me } from "@/lib/types";

const me: Me = { id: 1, username: "demo", display_name: "Guest chef", diet: "", intolerances: [], onboarded: true, is_demo: true };
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("AppShell", () => {
  it("marks the matching section as current", () => {
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    const current = screen.getAllByRole("link", { current: "page" });
    expect(current.length).toBeGreaterThan(0);
    current.forEach((l) => expect(l).toHaveTextContent("Recipes"));
  });

  it("greets the user by display name and flags the demo", () => {
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    expect(screen.getByText(/, Guest chef$/)).toBeInTheDocument();
    expect(screen.getByText(/Demo kitchen/)).toBeInTheDocument();
  });

  it("has a skip link and the assistant button", () => {
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("button", { name: "Open kitchen assistant" })).toBeInTheDocument();
  });

  it("lists every section", () => {
    pathname = "/dashboard";
    wrap(<AppShell me={me}><p>content</p></AppShell>);
    for (const label of ["Dashboard", "Kitchen", "Recipes", "Favourites", "Planner", "Shopping"]) {
      expect(screen.getAllByRole("link", { name: new RegExp(label) }).length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2–5:** fail → implement → verify (lint, typecheck, test, build) → commit `feat(frontend): signed-in app shell with sidebar, bottom tabs and session guard`.

---

### Task 9: Styleguide page and 404

**Files:**
- Create: `frontend/app/styleguide/page.tsx`, `frontend/app/not-found.tsx`, `frontend/test/styleguide.test.tsx`

**Interfaces:**
- `/styleguide` (public, `robots: { index: false }`): `<h1>` "Meal Hacker design system". Sections: Colours (a swatch for every token with name, hex and the text colour it pairs with), Type scale (display-xl/lg/md, title, body, small, script), Buttons (all variants, sizes, pending), Chips and badges, Fields (normal, hint, error), Cards, Tabs, a Dialog demo, Empty state, Skeletons, Brand (logo, the four waves, arch image, blobs, every doodle).
- `not-found.tsx`: cream page, `<h1>` "This shelf is empty", body "We couldn't find that page. It may have been eaten.", buttons "Back to home" (`/`) and `OpenKitchenButton`, whisk doodle.

- [ ] **Step 1: Write failing test**

`frontend/test/styleguide.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/styleguide" }));
vi.mock("motion/react", async (orig) => ({ ...(await orig<typeof import("motion/react")>()), useReducedMotion: () => true }));

import Styleguide from "@/app/styleguide/page";
import NotFound from "@/app/not-found";

const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("styleguide", () => {
  it("shows every colour token", () => {
    wrap(<Styleguide />);
    for (const hex of ["#FBF6EE", "#F3EBDD", "#FFFDF8", "#8FA98B", "#34503F", "#1F3328", "#DFE8DC", "#E8836B", "#A3472F", "#F7DDD5", "#F4C9C0", "#F2D08A", "#2A2A26", "#5C5C55", "#E6DCCB"]) {
      expect(screen.getAllByText(hex, { exact: false }).length).toBeGreaterThan(0);
    }
  });
});

describe("not found", () => {
  it("has a friendly heading and a way home", () => {
    wrap(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "This shelf is empty" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 2–5:** fail → implement → verify → commit `feat(frontend): styleguide and 404 page`.

---

### Task 10: Visual review pass (controller-run)

This task is run by the controller, not a code implementer. Its fixes are dispatched to an implementer as a findings list.

- [ ] **Step 1:** Start backend (`python manage.py migrate && python manage.py seed_demo && python manage.py runserver 8000`) and frontend (`npm run build && npm run start` on port 3000) in the background.
- [ ] **Step 2:** In the built-in browser, screenshot `/`, `/login`, `/signup`, `/styleguide`, `/does-not-exist` and (after clicking "Open the kitchen") `/dashboard` at 375×812, 768×1024, 1280×800 and 1440×900. Scroll the landing page fully at each width.
- [ ] **Step 3:** Check against spec §3/§4.1 and the Global Constraints: no horizontal scroll at 375px; hierarchy and spacing; images load and crop well inside arches; waves join seamlessly (no hairline gaps); contrast (use the contrast tool on any doubtful pair); focus rings visible when tabbing; reduced motion (emulate) shows static page; nothing looks templated. Load the antislop UI and layout skills and apply their checklists.
- [ ] **Step 4:** Write findings (file, what's wrong, what it should look like) and dispatch ONE implementer to fix them; re-screenshot the affected views. Repeat at most 3 rounds.
- [ ] **Step 5:** Commit fixes `style(frontend): visual review fixes for landing, auth and shell`.
