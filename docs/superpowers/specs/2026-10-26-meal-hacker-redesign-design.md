# Meal Hacker redesign: design spec

Date: 2026-10-26
Branch: `redesign` (lands as one PR to `main`)

## 1. Intent

Meal Hacker is Mariane Alidio's BSc final-year project (University of Westminster, 2026): a Django app that reduces food waste by matching kitchen inventory to recipes, planning meals and generating a shopping list.

**Goal:** turn it into a portfolio piece that an employer can understand and enjoy in about 60 seconds.

**Success criteria**
- A public, deployed landing page that looks studio-made, in the style of the three references (bakery sage/cream/coral + Palm & Coast structure).
- One click ("Open the kitchen") puts a visitor into a pre-filled demo account. No sign-up and no ingredient entry needed.
- Every existing feature works in the new UI. Meal cards show image, description, cook time and have/missing ingredients.
- Clean, tested, well-structured code: Django REST API + Next.js frontend, CI green.
- Lighthouse 90+ (performance, accessibility, best practices) on the landing page; WCAG AA contrast; full keyboard use.

**Decisions made with the user**
- Purpose: portfolio.
- Showcase: live deployed site with one-click demo login.
- Visual direction: blend of reference 1 (palette, wave dividers) and reference 3 (structure, arch frames, icon rows).
- Stack: Django + DRF backend, Next.js (App Router) frontend on Vercel, `/api/*` proxied to Django on Render, session auth.
- Demo button label: "Open the kitchen" (never "Try the demo").

**Out of scope:** payments, social features, native mobile app, barcode scanning, multiple languages.

## 2. Feature scope and priority

Each tier must work (and be deployable) before the next starts.

### Tier 0: foundation and security
- Remove `.env` from git tracking; add `.gitignore` and `.env.example`. (The user must replace the leaked keys themselves.)
- All mutating endpoints accept non-GET methods only, with CSRF protection.
- Validate recipe IDs (positive int) and dates on input.
- Settings split into base/dev/prod; prod uses Postgres via `DATABASE_URL`, gunicorn, whitenoise, `CSRF_TRUSTED_ORIGINS` and secure cookies.
- GitHub Actions CI: Django tests; frontend lint, typecheck, unit tests and build.

### Tier 1: must ship
- DRF API covering every current feature (section 5).
- Next.js app with the design system (section 3).
- Landing page (section 4.1).
- Login, sign-up, and "Open the kitchen" demo login; `seed_demo` management command.
- Dashboard with meal cards (image, description, cook time, diet badges, have/missing chips), expiring items, notes and the assistant.
- Kitchen (inventory), recipe library with filters, recipe detail, planner (calendar) and shopping list, at least as capable as today.
- `RecipeCache` so the demo doesn't exhaust Spoonacular credits.
- Fully responsive: sidebar on desktop, bottom tab bar on mobile.

### Tier 2: beyond a student project
- Favourites.
- Shopping check-off, with "move to kitchen" (prompts for expiry).
- Planner: previous/next week, breakfast/lunch/dinner slots, adds missing ingredients to the shopping list without duplicates.
- "Use it up": suggestions ranked by soonest-expiring ingredients.
- Profile preferences (diet, intolerances) applied to every recipe query.
- Onboarding for new users: one-click starter ingredients.
- Assistant as a floating panel that keeps conversation history and knows the user's inventory.
- Loading skeletons, illustrated empty states, toast notifications.

### Tier 3: stretch
- Waste-saved stats.
- Servings scaler; cook mode (one step at a time, screen kept awake).
- Shopping list grouped by aisle, printable, shareable.
- PWA (installable); dark mode.
- Playwright end-to-end suite, Lighthouse and axe checks in CI.

## 3. Art direction and design system

**Feel:** a warm, hand-made kitchen notebook laid on a precise app structure. Organic shapes and paper texture outside; strict spacing and type inside.

### Colour tokens
| Token | Hex | Use |
|---|---|---|
| cream | `#FBF6EE` | page background |
| paper | `#F3EBDD` | cards, alternating sections |
| card | `#FFFDF8` | raised cards |
| sage | `#8FA98B` | wave sections, chips, "fine" expiry |
| sage-deep | `#34503F` | headings, sidebar, dark bands, footer |
| coral | `#E8836B` | primary buttons (ink text), "today" expiry |
| coral-deep | `#B9533C` | coral text on cream, script accents |
| blush | `#F4C9C0` | nod to the original pink brand, avatars |
| butter | `#F2D08A` | stars, "soon" expiry |
| ink | `#2A2A26` | body text |

Every text/background pair must pass WCAG AA; check with the antislop contrast tool.

### Typography (via `next/font`)
- **Fraunces** for display headings: weight 500, tight letter spacing, italic coral for emphasis.
- **DM Sans** for body and UI text.
- **Caveat** for handwritten accents. At most one per section, coral-deep.
- Fluid type scale using `clamp()`.

### Shapes, texture and imagery
- Torn-paper SVG wave dividers (4 variants), with colour continuing from one section into the next.
- Arch-framed hero and feature images; recipe cards with rounded tops.
- Soft blob shapes behind images; subtle paper-grain overlay.
- Sparse hand-drawn doodles (herbs, leaves, sparkles, whisk) drifting on scroll.
- Landing photos: Unsplash, colour-graded warm, stored in `frontend/public/`. In-app recipe images come from Spoonacular.
- A custom illustration set (generated, one consistent style) for the how-it-works steps, empty states and onboarding.
- Logo redrawn as SVG in the new palette.
- Real app screenshots on the landing page, inside browser frames.

### Motion (Motion library; disabled under `prefers-reduced-motion`)
Fade-up on scroll, staggered card entry, hero parallax, floating doodles, card lift on hover, heart pop on favourite, check-draw on shopping tick-off, page transitions, content-shaped loading skeletons.

### Components
Built on Radix primitives and styled with Tailwind using the tokens above: button (primary/secondary/ghost), chip, badge, card, tabs, dialog, sheet, dropdown, toast, input/select/date with error states, skeleton, empty state, `WaveDivider`, `ArchImage`, `Doodle`, `MealCard`.

**Banned:** default blue links, plain grey boxes, purple gradients, generic stock-template layouts.

A `/styleguide` route shows all tokens and components.

## 4. Pages

### 4.1 Landing (`/`, static)
1. Header: logo; Features, How it works, About; Log in; coral **"Open the kitchen"**. Becomes frosted on scroll.
2. Hero: Caveat note "fresh from your fridge"; Fraunces headline "Cook what you have. *Waste nothing.*"; subcopy; buttons **"Open the kitchen →"** and "Sign up free"; arch photo with two floating mini-cards ("3 items expiring", "Pasta primavera — uses 5 of yours").
3. Problem band on sage with wave edges: a household food-waste statistic with its source cited.
4. How it works: 3 illustrated steps joined by a dashed hand-drawn path.
5. Alternating feature rows with framed screenshots: kitchen, recipe matching, planner, shopping list, assistant.
6. Bento grid: favourites, diet and allergies, use it up, waste stats, installable app.
7. About the project: Westminster final-year project, the story, tech stack.
8. Call-to-action band on deep sage: "Open the kitchen →".
9. Footer: links, GitHub, author.

### 4.2 App shell
Deep-sage sidebar on desktop (Dashboard, Kitchen, Recipes, Favourites, Planner, Shopping, plus the waste stat); bottom tab bar on mobile. Header with greeting, assistant button and avatar.

### 4.3 App pages
- **Dashboard:** bento layout with a "Tonight's pick" hero `MealCard`, a row of 3 suggestions, expiring list with countdown bars, this week's plan, waste stat, notes.
- **Kitchen:** quick-add bar that parses entries like "2 red peppers", plus category and expiry; Fridge/Pantry/Freezer tabs with counts; sort; "Use it up" banner; item cards with colour-coded expiry bar (coral today / butter soon / sage fine) and a `⋯` menu (edit, move, mark used, delete); dashed add card.
- **Recipes:** search, sticky filter chips (cuisine, type, diet), "matches my kitchen" toggle, masonry grid of `MealCard`s.
- **Recipe detail:** magazine layout with a wide hero; sticky ingredients sidebar with have/missing ticks and servings scaler; numbered steps; cook mode; buttons for add to plan and favourite.
- **Planner:** week board with breakfast/lunch/dinner rows, previous/next week, add/remove dialogs.
- **Shopping:** grouped by aisle, animated check-off, "move to kitchen" toast, clear checked, print styles.
- **Favourites:** grid of saved `MealCard`s.
- **Profile:** display name, diet, intolerances, password change; demo user sees a read-only note.
- **Onboarding:** starter-ingredient picker on first login.
- Every empty state gets an illustration and one call to action.

**`MealCard` contents:** image (favourite heart overlay), Fraunces title, description clamped to 2 lines, badges (time, servings, diet), have/missing chips, quick actions on hover. Sizes: hero, standard, compact.

## 5. Architecture

```
Browser ──► Vercel (Next.js 15, App Router, TypeScript)
              │ rewrites /api/* and /admin/* ──► Render (Django 4.2 + DRF, gunicorn)
              │                                    ├─► Postgres
              │                                    ├─► Spoonacular (through RecipeCache)
              │                                    └─► Groq
```

### Repository layout
- `backend/`: Django project `meal_hacker` with apps `accounts`, `kitchen`, `recipes`, `planner`, `assistant`. Each app has its own models, serializers, views, urls and tests. Existing `core` data is migrated into these apps.
- `frontend/`: Next.js. Route groups `app/(marketing)`, `app/(auth)`, `app/(app)`; `components/ui`, `components/features`; `lib/api.ts` (typed client); TanStack Query with optimistic updates.
- `docs/superpowers/`: specs and plans. `.github/workflows/`: CI. `render.yaml`.

### Auth
Same-origin through the Vercel rewrite. Uses Django session cookies and CSRF; the frontend reads the `csrftoken` cookie and sends `X-CSRFToken`. `(app)` routes check the session on the server and redirect to `/login` if needed. `POST /api/auth/demo/` logs in the shared demo user; a nightly cron reruns `seed_demo --reset`.

### Spoonacular client
`recipes/spoonacular.py` is the only module that calls Spoonacular.
- Checks `RecipeCache` first (key = sha256 of endpoint + sorted params). Searches are kept 24 hours, details 7 days.
- Turns summary HTML into a plain description of about 160 characters, cut at a word boundary.
- Returns typed dicts.
- On API failure or quota exhaustion, serves stale cache and the API sets `X-Stale: true`; with no cache, it returns a clean 503.
- Suggestions come from `findByIngredients` + `informationBulk` (for descriptions, time, diets), both cached.

### Groq client
Only `assistant/groq.py` calls Groq. The system prompt keeps answers to kitchen topics and includes the user's inventory names. Rate limit: 20 messages per hour per user (DRF throttle).

## 6. Data model

| Model | App | Fields and changes |
|---|---|---|
| `InventoryItem` | kitchen | existing fields + `unit`, `updated_at`, `used_at` (nullable); `category` uses enforced choices |
| `Note` | kitchen | renamed from `Reminder` |
| `Profile` | accounts | new, one per user: `display_name`, `diet`, `intolerances` (JSON list), `onboarded`, `is_demo` |
| `RecipeCache` | recipes | new: `key` (unique), `endpoint`, `payload` (JSON), `fetched_at`, `expires_at` |
| `FavouriteRecipe` | recipes | new: `user`, `recipe_id`, `title`, `image`, `description`; unique per user and recipe |
| `MealPlan` | planner | + `slot` (breakfast/lunch/dinner), `description`; `recipe_id` must be positive |
| `ShoppingListItem` | planner | + `checked`, `aisle`, `meal_plan` (FK, nullable); auto-added items de-duplicated on lowercased name |

## 7. API (`/api/`; everything requires login except auth and health)

| Area | Endpoints |
|---|---|
| Auth | `GET csrf/` · `POST auth/login/` · `POST auth/signup/` · `POST auth/logout/` · `POST auth/demo/` · `GET/PATCH auth/me/` |
| Kitchen | `GET/POST inventory/` · `PATCH/DELETE inventory/{id}/` · `POST inventory/{id}/use/` · `GET/PUT note/` |
| Recipes | `GET recipes/suggestions/` · `GET recipes/search/?q=&cuisine=&type=&matches_kitchen=` · `GET recipes/{id}/` · `GET/POST favourites/` · `DELETE favourites/{recipe_id}/` |
| Planner | `GET plans/?week=YYYY-MM-DD` · `POST plans/` (option to add missing ingredients to shopping) · `PATCH/DELETE plans/{id}/` · `GET/POST shopping/` · `PATCH/DELETE shopping/{id}/` · `POST shopping/{id}/to-inventory/` · `POST shopping/clear-checked/` |
| Stats | `GET stats/` |
| Assistant | `POST assistant/chat/` |
| Health | `GET health/` |

- Error envelope: `{"error": {"code": str, "message": str, "fields": {...}}}`.
- OpenAPI schema via drf-spectacular; frontend types generated with `openapi-typescript`.

## 8. Deployment
- Vercel project rooted at `frontend/`; rewrites `/api/:path*` to `BACKEND_URL`; PR preview deployments.
- Render, set up from `render.yaml`: web service (`gunicorn`, whitenoise), free Postgres, nightly cron for `seed_demo --reset`. Migrations and seeding run on deploy.
- Secrets live only in the Render and Vercel dashboards. `.env.example` lists variable names.
- If the user hasn't set up Render yet: deploy only the Vercel preview and verify the backend locally. Report this in the morning.

## 9. Testing
- Backend: existing tests ported and passing; test-first for every new endpoint; Spoonacular and Groq always mocked (no real calls in tests).
- Frontend: Vitest + Testing Library for components; Playwright for landing → Open the kitchen → dashboard → add to plan → shopping.
- Visual review: screenshots at 375, 768, 1280 and 1440px in the built-in browser after each page; iterate until nothing looks generic. Use antislop checks.
- Lighthouse and axe on landing and dashboard.
- CI must be green before the PR is marked ready.

## 10. Overnight run order
1. Tier 0: security clean-up, monorepo move, app split with data migrations, CI.
2. API, Spoonacular/Groq clients and cache, `seed_demo`.
3. Frontend foundation: tokens, fonts, UI components, `/styleguide`, illustrations, logo.
4. Landing page, then visual review.
5. App pages in order: dashboard, kitchen, recipes and detail, planner, shopping, favourites, profile, onboarding. Visual review after each.
6. Tier 2, then Tier 3 as time allows.
7. Deploy previews, end-to-end run, Lighthouse, morning report with screenshots and links.

**Commits:** small commits on `redesign`; nothing pushed to `main`.

## 11. User actions (cannot be automated)
1. Replace the leaked Spoonacular and Groq keys; generate a new Django `SECRET_KEY`.
2. Create a Render account linked to GitHub; enter secrets in the Render and Vercel dashboards.
3. Keep the machine awake and the session in auto mode.
