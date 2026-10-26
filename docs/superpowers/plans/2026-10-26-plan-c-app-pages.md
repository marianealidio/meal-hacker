# Meal Hacker Plan C: App Pages, Tier 2 Features and End-to-End Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder app pages with the real signed-in experience: dashboard, kitchen, recipes and favourites, recipe detail with cook mode, planner, shopping list, profile and onboarding, plus the kitchen assistant panel. Finish with Playwright end-to-end and accessibility tests.

**Architecture:** Each page is a client component under `app/(app)/<route>/page.tsx`. It reads and writes through TanStack Query hooks in `lib/queries.ts`, which wrap `lib/api.ts`. Mutations update optimistically where the spec says "instant", roll back on error, and show a toast. Shared feature components live in `components/features/`. Everything uses the Plan B design system: tokens, `components/ui/*` and `components/brand/*`.

**Tech Stack:** As Plan B, plus `@playwright/test` 1.64.1 and `@axe-core/playwright` for end-to-end and accessibility checks.

**Spec:** `docs/superpowers/specs/2026-10-26-meal-hacker-redesign-design.md` (§2 Tier 1–3, §4.2, §4.3, §9).

## Global Constraints

Every Plan B global constraint still applies; read `docs/superpowers/plans/2026-10-26-plan-b-frontend-foundation.md` § Global Constraints. In particular:
- Tokens only, WCAG AA contrast.
- Fonts: Fraunces, DM Sans and Caveat.
- Reduced motion respected.
- Every API path ends in `/`.
- No "Try the demo" copy.
- 44px tap targets and visible focus.
- One `<h1>` per page.
- Mobile first at 375px.
- Commit trailer.

Plan C adds:
- Every mutation has user feedback: a success toast where it helps, and **always** an error toast (`ApiError.message`) with the cache rolled back.
- Every page has three states, built and tested: **loading** (content-shaped `Skeleton`s), **empty** (`EmptyState` with a doodle illustration and one action), and **error** (inline card with a "Try again" button that refetches).
- When an API response has `stale: true`, show a quiet `StaleNotice` ("Showing saved recipes — live results are taking a break.").
- Dates: the API uses `YYYY-MM-DD`. Display them in en-GB ("Mon 26 Oct"). Use local dates, never `toISOString()` on a local midnight, which can shift the day.
- Demo users (`me.is_demo`): the profile is read-only and shows a note. Everything else works.
- Toasts must not cover the mobile bottom tabs (`BottomTabs` is fixed at the bottom below `lg`).
- New feature components go in `frontend/components/features/`. Each file has one purpose.

## Review Focus

1. Optimistic updates that fail, for example ticking a shopping item while the backend is down: the tick rolls back and an error toast appears. Nothing stays half-applied. (Tasks 1, 7)
2. Timezone day-shift: a user in Europe/London at 23:30 adds a meal for "today". The planner must store and show the same local date. Week navigation across a month boundary and the BST change (25 Oct 2026) must stay on Mondays. (Tasks 1, 6)
3. Empty kitchen (fewer than 3 items, so the API returns `reason: "need_more_ingredients"`): the dashboard shows an invitation to add ingredients or run onboarding, not an error or a blank card. (Tasks 2, 8)
4. Assistant throttled (429) or unavailable (503): the panel shows the friendly message in the thread and keeps the user's typed message so they can retry. (Task 9)
5. Recipe detail for an unknown id (404 `not_found`): show a "This recipe has gone off" empty state with a link back to recipes, not a crash. (Task 5)

---

## File structure

```
frontend/
  lib/
    queries.ts         + hooks for every resource (Task 1)
    dates.ts           local-date helpers (Task 1)
    format.ts          formatters: minutes, quantities, servings scaling (Task 1, 5)
  components/features/
    MealCard.tsx            (hero | standard | compact) (Task 1)
    StaleNotice.tsx, ErrorCard.tsx, PageHeader.tsx (Task 1)
    ExpiryBar.tsx           (Task 1)
    AddToPlanDialog.tsx     (Task 5, reused in 2/4)
    FavouriteButton.tsx     (Task 1)
    kitchen/ QuickAdd.tsx, InventoryCard.tsx, EditItemDialog.tsx, UseItUpBanner.tsx (Task 3)
    recipes/ FilterBar.tsx (Task 4)
    recipe/  IngredientList.tsx, Steps.tsx, CookMode.tsx, ServingsScaler.tsx (Task 5)
    planner/ WeekBoard.tsx, DayColumn.tsx, MoveMealDialog.tsx (Task 6)
    shopping/ ShoppingGroup.tsx, ShoppingRow.tsx, MoveToKitchenDialog.tsx, AddShoppingItem.tsx (Task 7)
    profile/  ProfileForm.tsx, PasswordForm.tsx (Task 8)
    onboarding/ StarterPicker.tsx (Task 8)
    assistant/ AssistantPanel.tsx, ChatThread.tsx (Task 9)
  app/(app)/
    dashboard/page.tsx  kitchen/page.tsx  recipes/page.tsx  recipes/[id]/page.tsx
    favourites/page.tsx planner/page.tsx  shopping/page.tsx profile/page.tsx  onboarding/page.tsx
  e2e/  playwright.config.ts, demo-flow.spec.ts, a11y.spec.ts (Task 10)
```

---

### Task 1: Data hooks, date helpers and shared feature components

**Files:**
- Modify: `frontend/lib/queries.ts`, `frontend/lib/api.ts` (typing fixes)
- Create: `frontend/lib/dates.ts`, `frontend/lib/format.ts`, `frontend/components/features/{MealCard,StaleNotice,ErrorCard,PageHeader,ExpiryBar,FavouriteButton}.tsx`
- Test: `frontend/test/dates.test.ts`, `frontend/test/format.test.ts`, `frontend/test/queries.test.tsx`, `frontend/test/meal-card.test.tsx`

**Interfaces:**
- `lib/dates.ts`:
  - `toISODate(d: Date): string` — local `YYYY-MM-DD`.
  - `parseISODate(s: string): Date` — local midnight.
  - `startOfWeek(d: Date): Date` — local Monday.
  - `addDays(d, n): Date`.
  - `formatDay(s: string): string` → "Mon 26 Oct".
  - `formatLong(s): string` → "Monday 26 October".
  - `isToday(s): boolean`.
  - `relativeExpiry(daysLeft: number | null): { label: string; tone: "today"|"soon"|"fine"|"expired"|"none" }`:
    - `null` → `{"No date","none"}`
    - `<0` → `{"Expired N day(s) ago","expired"}`
    - `0` → `{"Expires today","today"}`
    - `1` → `{"1 day left","soon"}`
    - `2–3` → `{"N days left","soon"}`
    - `>3` → `{"N days left","fine"}`
- `lib/format.ts`:
  - `formatMinutes(m: number | null): string` → "30 min", "1 hr 15 min", "" for null.
  - `scaleAmount(amount: number | null, from: number, to: number): string` — rounds to friendly fractions (¼ ½ ¾, ⅓ ⅔) or 1 decimal.
- `lib/api.ts`: change `addInventory` and `updateInventory` to return `T.InventoryItem`, `useInventory` to return `T.InventoryItem`, `addShopping`/`updateShopping` to `T.ShoppingItem`, `addFavourite` to `T.Favourite`. Make `apiFetch` throw `ApiError(status, "network", NETWORK_MESSAGE)` when a 2xx JSON response body fails to parse (other than a 204).
- `lib/queries.ts` adds these hooks. Each mutation has `onError` with a toast of `err.message`; optimistic hooks also roll back:
  - **Reads:** `useInventory(category?)`, `useNote()`, `useSuggestions()`, `useSearch(params, { enabled })`, `useRecipe(id)`, `useFavourites()`, `useWeek(date: string)`, `useShopping()`, `useStats()`.
  - **Kitchen and notes:** `useAddInventory()`, `useUpdateInventory()`, `useDeleteInventory()` (optimistic remove), `useUseInventory()` (optimistic remove; success toast "Marked as used"), `useSaveNote()`.
  - **Recipes:** `useToggleFavourite()`, optimistic. It flips `is_favourite` in every cached `suggestions`, `search` and `recipe` entry and adds or removes the item in `favourites`.
  - **Planner:** `useAddPlan()`, which invalidates `week`, `shopping` and `stats`. Its success toast reads "Added to {formatDay}" and, when `added_to_shopping > 0`, adds " · {n} items on your list". Also `useUpdatePlan()` and `useDeletePlan()`, both optimistic within the week.
  - **Shopping:** `useAddShopping()`, `useUpdateShopping()` (optimistic `checked`), `useDeleteShopping()`, `useShoppingToInventory()` (invalidates shopping, inventory and stats; toast "Moved to your kitchen"), `useClearChecked()`.
  - **Profile and assistant:** `useUpdateMe()`, `useChangePassword()`, `useChat()`.
  - Mutations that change inventory also invalidate `suggestions` and `stats`.
- `MealCard({ recipe: RecipeSummary, size: "hero"|"standard"|"compact", onAddToPlan?: () => void })`:
  - **Image:** `next/image` with `rounded-arch` on hero and standard, a soft rounded rectangle on compact, and a `FavouriteButton` overlay at the top right.
  - **Text:** Fraunces title linking to `/recipes/{id}` (the whole card is clickable via a stretched link; the buttons sit above it with `relative z-10`), then the description clamped to 2 lines (3 on hero).
  - **Chips:** time chip (`formatMinutes`) if present, "Serves N" if present, the first diet chip, `have` chip "uses {used.length}", and a `missing` chip "missing {missing.length}" when above 0. A `soon` chip "uses your {uses_expiring[0]}" when `uses_expiring` is non-empty.
  - **Hero:** adds a Caveat "tonight's pick" kicker and an "Add to plan" dark button calling `onAddToPlan`. The compact size hides the description and chips except time.
- `FavouriteButton({ recipeId, isFavourite })` — a heart button with `aria-pressed` and `aria-label` "Save to favourites" or "Remove from favourites". It uses `useToggleFavourite`, and on toggle on the heart pops (scale 1→1.25→1, 250ms, disabled under reduced motion).
- `ExpiryBar({ daysLeft })` — a 5px bar. Fill percentage is `clamp(100 - daysLeft*10, 8, 100)`; colour is coral for today or expired, butter for soon, sage for fine, and line for none. It is `aria-hidden`, because the label is printed next to it.
- `StaleNotice()` — a small paper chip with an info icon and the copy from the constraints.
- `ErrorCard({ error, onRetry })` — a card with the `error.message` and a "Try again" secondary button.
- `PageHeader({ kicker?, title, actions? })` — an optional Caveat kicker, an `<h1>` title in `text-display-md`, and right-aligned actions that wrap below on mobile.

- [ ] **Step 1: Write the failing tests**

`frontend/test/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDays, formatDay, parseISODate, relativeExpiry, startOfWeek, toISODate } from "@/lib/dates";

describe("dates", () => {
  it("round-trips local dates without shifting the day", () => {
    const d = new Date(2026, 9, 26, 23, 30);
    expect(toISODate(d)).toBe("2026-10-26");
    expect(toISODate(parseISODate("2026-10-26"))).toBe("2026-10-26");
  });

  it("finds Monday across the BST change and month ends", () => {
    expect(toISODate(startOfWeek(parseISODate("2026-10-25")))).toBe("2026-10-19");
    expect(toISODate(startOfWeek(parseISODate("2026-11-01")))).toBe("2026-10-26");
    expect(toISODate(addDays(parseISODate("2026-10-26"), 7))).toBe("2026-11-02");
    expect(toISODate(addDays(parseISODate("2026-10-26"), -7))).toBe("2026-10-19");
  });

  it("formats en-GB", () => {
    expect(formatDay("2026-10-26")).toBe("Mon 26 Oct");
  });

  it.each([
    [null, "No date", "none"], [-2, "Expired 2 days ago", "expired"], [-1, "Expired 1 day ago", "expired"],
    [0, "Expires today", "today"], [1, "1 day left", "soon"], [3, "3 days left", "soon"], [9, "9 days left", "fine"],
  ])("relativeExpiry(%s)", (n, label, tone) => {
    expect(relativeExpiry(n as number | null)).toEqual({ label, tone });
  });
});
```

`frontend/test/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatMinutes, scaleAmount } from "@/lib/format";

describe("format", () => {
  it.each([[null, ""], [30, "30 min"], [60, "1 hr"], [75, "1 hr 15 min"]])("formatMinutes(%s)", (m, s) => {
    expect(formatMinutes(m as number | null)).toBe(s);
  });

  it.each([
    [2, 2, 4, "4"], [1, 2, 1, "½"], [0.5, 2, 3, "¾"], [1, 3, 1, "⅓"], [250, 2, 3, "375"], [1.3, 1, 1, "1.3"], [null, 2, 4, ""],
  ])("scaleAmount(%s, %s→%s)", (a, from, to, s) => {
    expect(scaleAmount(a as number | null, from as number, to as number)).toBe(s);
  });
});
```

`frontend/test/queries.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/Toaster";
import { queryKeys, useToggleFavourite, useUpdateShopping } from "@/lib/queries";
import type { RecipeSummary, ShoppingItem } from "@/lib/types";

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}><Toaster>{children}</Toaster></QueryClientProvider>
  );
  return { qc, wrapper };
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

describe("optimistic mutations", () => {
  it("rolls back a shopping tick when the request fails", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const item: ShoppingItem = { id: 1, ingredient_name: "Milk", quantity: "", aisle: "Dairy", checked: false, source: "manual", meal_plan: null, date_added: "" };
    qc.setQueryData(queryKeys.shopping, [item]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: { code: "network", message: "Down", fields: {} } }, 500));
    const { result } = renderHook(() => useUpdateShopping(), { wrapper });
    act(() => result.current.mutate({ id: 1, patch: { checked: true } }));
    expect((qc.getQueryData(queryKeys.shopping) as ShoppingItem[])[0].checked).toBe(true);
    await waitFor(() => expect((qc.getQueryData(queryKeys.shopping) as ShoppingItem[])[0].checked).toBe(false));
  });

  it("flips is_favourite across cached recipe lists", async () => {
    document.cookie = "csrftoken=t; path=/";
    const { qc, wrapper } = setup();
    const r = { id: 7, is_favourite: false } as RecipeSummary;
    qc.setQueryData(queryKeys.suggestions, { data: { results: [r], reason: null }, stale: false });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ recipe_id: 7, title: "x", image: "", description: "", created_at: "" }, 201));
    const { result } = renderHook(() => useToggleFavourite(), { wrapper });
    act(() => result.current.mutate({ recipeId: 7, isFavourite: false }));
    const cached = qc.getQueryData(queryKeys.suggestions) as { data: { results: RecipeSummary[] } };
    expect(cached.data.results[0].is_favourite).toBe(true);
  });
});
```

`frontend/test/meal-card.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MealCard } from "@/components/features/MealCard";
import { Toaster } from "@/components/ui/Toaster";
import type { RecipeSummary } from "@/lib/types";

const recipe: RecipeSummary = {
  id: 716429, title: "Pasta with garlic", image: "https://img.spoonacular.com/recipes/716429-556x370.jpg",
  description: "A bright weeknight pasta.", ready_in_minutes: 45, servings: 2, diets: ["dairy free"],
  used: ["garlic", "spinach"], missing: [{ name: "scallions", aisle: "Produce" }], is_favourite: false, uses_expiring: ["spinach"],
};
const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}><Toaster>{ui}</Toaster></QueryClientProvider>);

describe("MealCard", () => {
  it("shows description, time, have/missing and expiring chips, linking to the recipe", () => {
    wrap(<MealCard recipe={recipe} size="standard" />);
    expect(screen.getByRole("link", { name: /Pasta with garlic/ })).toHaveAttribute("href", "/recipes/716429");
    expect(screen.getByText("A bright weeknight pasta.")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();
    expect(screen.getByText("uses 2")).toBeInTheDocument();
    expect(screen.getByText("missing 1")).toBeInTheDocument();
    expect(screen.getByText("uses your spinach")).toBeInTheDocument();
    expect(screen.getByAltText("Pasta with garlic")).toBeInTheDocument();
  });

  it("hero has the Add to plan action and a labelled favourite toggle", async () => {
    const onAdd = vi.fn();
    wrap(<MealCard recipe={recipe} size="hero" onAddToPlan={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(onAdd).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save to favourites" })).toHaveAttribute("aria-pressed", "false");
  });

  it("compact hides the description", () => {
    wrap(<MealCard recipe={recipe} size="compact" />);
    expect(screen.queryByText("A bright weeknight pasta.")).not.toBeInTheDocument();
  });
});
```

(The card image's alt is the recipe title.)

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** to the Interfaces spec.
- [ ] **Step 4: Verify** `npm test && npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 5: Commit** `feat(frontend): data hooks with optimistic updates, date helpers and MealCard`.

---

### Task 2: Dashboard

**Files:** Create `frontend/app/(app)/dashboard/page.tsx`, `frontend/components/features/dashboard/{TonightsPick,SuggestionsRow,ExpiringList,WeekPeek,WasteStat,NotesCard}.tsx`, `frontend/components/features/AddToPlanDialog.tsx`; test `frontend/test/dashboard.test.tsx`.

**Behaviour:**
- **Layout:** `PageHeader` with kicker "what's cooking", title "Dashboard", and a `ButtonLink` "Browse recipes" (`/recipes`). Below it, a bento grid. On desktop (≥lg) it has 3 columns:
  - Row 1: `TonightsPick` (col-span 2), `ExpiringList`.
  - Row 2: `SuggestionsRow` (col-span 3).
  - Row 3: `WeekPeek` (col-span 2), with `WasteStat` and `NotesCard` stacked in the third column.
  - On mobile, a single column in this order: pick, expiring, suggestions, week, stat, notes.
- **TonightsPick:**
  - Uses `useSuggestions()` and shows the first result as `MealCard size="hero"`. "Add to plan" opens `AddToPlanDialog`.
  - If `reason === "need_more_ingredients"`, show an `EmptyState` with the lemon doodle, title "Add a few more ingredients", body "Meal ideas appear once your kitchen has at least three ingredients.", and two buttons: "Add ingredients" (`/kitchen`) and "Quick start" (`/onboarding`).
  - If the results are empty for another reason, show title "No matches yet" and body "Try adding a staple like rice, pasta or eggs."
  - Show `StaleNotice` when stale.
- **SuggestionsRow:** `<h2>` "More ideas", results 2–4 as standard `MealCard`s in a horizontal scroll-snap row on mobile and a 3-column grid on desktop. Hide it if there are fewer than 2 results.
- **ExpiringList:** `<h2>` "Expiring soon". Shows `useInventory()` items with `days_left !== null && days_left <= 3`, sorted ascending, up to 6. Each row has the name, an `ExpiryBar` and a `relativeExpiry` label in its tone colour (today → `text-coral-tint-ink`, soon → `text-butter-ink`, fine → `text-sage-deep`, expired → `text-coral-tint-ink`). The footer link reads "Open your kitchen →". The empty state says "Nothing's about to go off. Nice." with a sparkle doodle.
- **WeekPeek:** `<h2>` "This week". Uses `useWeek(toISODate(startOfWeek(new Date())))` and shows 7 day pills (Mon–Sun) with meal thumbnails (compact, up to 2 per day, then "+N"); today has a coral ring. Footer link "Open planner →".
- **WasteStat:** sage tile (`bg-sage text-sage-ink`) with a big Fraunces `used_this_month` number, the line "items used before they went off this month", and a small line with `expiring_soon` and `items_in_kitchen`.
- **NotesCard:** `<h2>` "Notes". A textarea (label "Your notes", visually hidden) that autosaves 800ms after typing stops via `useSaveNote` and shows "Saved" with a check, or the error in the toast. It is prefilled from `useNote()`.
- **AddToPlanDialog({ recipe: { id, title }, open, onOpenChange })**: a date input (default today, `toISODate`), slot radios (Breakfast, Lunch, Dinner, default Dinner), and a checkbox "Add missing ingredients to my shopping list" (default on). The submit button reads "Add to plan" and calls `useAddPlan`, closing on success.
- **States:** every widget has its own skeleton and its own `ErrorCard`, so one failing request does not blank the page.

**Tests (`frontend/test/dashboard.test.tsx`):** mock `fetch` by URL.
- (a) With suggestions and inventory, the hero title, "More ideas" with 3 cards, and the expiring item labels render.
- (b) With `reason: "need_more_ingredients"`, the "Add a few more ingredients" invitation shows with links to `/kitchen` and `/onboarding`.
- (c) The notes autosave: after typing, wait 900ms with fake timers, and a PUT to `/api/note/` is sent with the text.
- (d) If suggestions returns 503 but inventory returns 200, the `ErrorCard` "Try again" shows in the pick slot and the expiring list still renders.
- (e) The AddToPlanDialog sends `POST /api/plans/` with `{recipe_id, planned_date: today local, slot: "dinner", add_missing: true}`.

Steps: failing tests → implement → verify → commit `feat(frontend): dashboard with tonight's pick, expiring, week peek, waste stat and notes`.

---

### Task 3: Kitchen (inventory)

**Files:** `frontend/app/(app)/kitchen/page.tsx`, `frontend/components/features/kitchen/{QuickAdd,InventoryCard,EditItemDialog,UseItUpBanner}.tsx`; test `frontend/test/kitchen.test.tsx`.

**Behaviour** (matches the approved kitchen mockup):
- **Header:** `PageHeader` with kicker "what's in the cupboards" and title "Your kitchen".
- **QuickAdd:**
  - A pill bar with a "+" icon and a text input (label "Add an ingredient", placeholder "2 red peppers").
  - A category `SelectField` (Fridge, Pantry, Freezer; defaults to the current tab) and an optional date input labelled "Expiry".
  - A primary "Add" button. Enter submits.
  - It sends `{ text, category, expiry_date }`. Note: `api.addInventory` must support `text`. Add `text?: string` to `InventoryInput` and make `name` optional when `text` is given.
  - On success it clears the input and keeps focus on it, with the toast "Added {name}".
  - The server's field error (`fields.name`) shows under the input.
- **Tabs and sorting:** `Tabs` for Fridge, Pantry and Freezer, each label with its count (from `useInventory()` grouped client-side). Next to them, a sort `SelectField` with "Expiring first" (default) and "A–Z".
- **UseItUpBanner:** shown when any item has `days_left <= 2`. Coral-tint background with a sparkles icon. Copy: "**Use it up:** {a} and {b} expire soon." with a link "See recipes", which goes to `/recipes?matches_kitchen=1`.
- **InventoryCard grid:** 1 column on mobile, 2 on md, 3 on lg. Each card shows:
  - a Fraunces name and a muted quantity;
  - an `ExpiryBar` and a `relativeExpiry` label;
  - a `⋯` `Menu` (`aria-label` "Actions for {name}") with "Edit", "Move to …" (the two other categories), "Mark as used", and "Delete" (tone danger).
  - Delete opens a `Dialog` titled "Delete {name}?" with "Delete" and "Cancel".
- **Dashed add card:** the last card in the grid, "Add to {category}". It focuses the QuickAdd input and sets its category.
- **EditItemDialog:** name, quantity, category and expiry fields, saved with `useUpdateInventory`. Field errors are shown.
- **Empty tab:** EmptyState with the leaf doodle, title "Your {category} is empty", body "Add what you've got and we'll keep an eye on the dates.", and an action that focuses QuickAdd.
- **Mobile:** QuickAdd stacks as the input row, then category and date side by side, then a full-width Add button.

**Tests:**
- (a) Quick add sends `{text: "2 red peppers", category: "Fridge"}` and clears the input.
- (b) Tab counts are correct and switching tabs filters.
- (c) The banner appears for an item with `days_left` 0 and links to `/recipes?matches_kitchen=1`.
- (d) The menu's "Mark as used" POSTs `/api/inventory/{id}/use/` and removes the card optimistically.
- (e) Delete asks for confirmation, then sends DELETE.
- (f) "A–Z" sort reorders.
- (g) A server error on add shows the field error.

Commit `feat(frontend): kitchen page with quick add, tabs, expiry bars and item actions`.

---

### Task 4: Recipes library and favourites

**Files:** `frontend/app/(app)/recipes/page.tsx`, `frontend/app/(app)/favourites/page.tsx`, `frontend/components/features/recipes/FilterBar.tsx`; test `frontend/test/recipes.test.tsx`.

**Behaviour:**
- **Recipes page:** `PageHeader` with kicker "find something good" and title "Recipes".
  - **FilterBar:** sticky below the header on scroll. It has:
    - a search input (label "Search recipes", placeholder "Soup, pasta, curry…", debounced 400ms);
    - chip toggles for type: Main course, Breakfast, Soup, Salad, Side dish, Dessert (single select, API values lowercase);
    - a cuisine `SelectField` with Any, Italian, Mexican, Indian, Chinese, Thai, Mediterranean, American, British and French;
    - a diet `SelectField` with Any, Vegetarian, Vegan, Gluten free, Ketogenic and Pescetarian;
    - a "Matches my kitchen" switch (a `role="switch"` button).
  - **URL state:** the filter state lives in the URL query (`?q=&type=&cuisine=&diet=&matches_kitchen=1`) through `useRouter().replace`, so links like `/recipes?matches_kitchen=1` work.
  - **Results:** a grid of standard `MealCard`s (1 column on mobile, 2 on md, 3 on xl) with "Add to plan" in the card footer, opening `AddToPlanDialog`. The heading "{n} recipes" is announced in an `aria-live="polite"` region.
  - **Empty:** "No recipes match" with a "Clear filters" button.
  - `StaleNotice` when stale; loading skeleton cards.
- **Favourites page:** `PageHeader` with kicker "the keepers" and title "Favourites".
  - A grid of saved recipes from `useFavourites()` as compact cards: image, title link, description, and an unfavourite heart.
  - Empty: heart doodle, "No favourites yet", "Tap the heart on any recipe to keep it here.", and a "Browse recipes" button.

**Tests:**
- (a) Typing in search updates the URL and fetches `/api/recipes/search/?q=soup` after the debounce.
- (b) Toggling "Matches my kitchen" adds `matches_kitchen=1`.
- (c) The initial URL `?matches_kitchen=1` makes the switch `aria-checked="true"`.
- (d) Empty results show "Clear filters", and clicking it resets the URL.
- (e) The favourites empty state renders, and unfavouriting removes the card optimistically.

Commit `feat(frontend): recipe library with URL filters and favourites page`.

---

### Task 5: Recipe detail with servings scaler and cook mode

**Files:** `frontend/app/(app)/recipes/[id]/page.tsx`, `frontend/components/features/recipe/{IngredientList,Steps,CookMode,ServingsScaler}.tsx`; test `frontend/test/recipe-detail.test.tsx`.

**Behaviour:**
- **Hero:** magazine layout. A wide image (`rounded-card`, 16:9 on mobile and 21:9 on desktop, cropped), then the `<h1>` title, the description (the full `description`), and a chips row (time, servings, diets, cuisines).
- **Actions:** `FavouriteButton`, "Add to plan" (primary, opens `AddToPlanDialog`), "Cook mode" (dark), and "Original recipe ↗" (only if `source_url`, opens in a new tab).
- **Layout:** two columns at ≥lg. The left is a sticky `IngredientList` card; the right is `Steps`.
- **IngredientList:**
  - `<h2>` "Ingredients" plus a `ServingsScaler` (− / count / + buttons labelled "Fewer servings" and "More servings", minimum 1, maximum 12, starting at `servings ?? 2`).
  - Each row: a have/missing icon (sage-tint check "You have this" or coral-tint dot "Missing"), the scaled amount and unit plus the name, or the `original` text when the amount is null.
  - A summary line: "You have {h} of {n}". A button "Add {m} missing to shopping list" posts each missing ingredient with `useAddShopping` (aisle included), then toasts "Added {m} items to your list". It is disabled while pending.
- **Steps:** `<h2>` "Method", an ordered list with large coral number badges. If there are no steps: "No method was provided for this one." plus the link to the original.
- **CookMode:**
  - A full-screen `Dialog` showing one step at a time in `text-display-md`, with a progress "Step 2 of 6" and Previous/Next buttons. Arrow keys also navigate.
  - The last step shows "Done — enjoy!" with a Close button.
  - It requests a screen wake lock while open (`navigator.wakeLock?.request("screen")`), releases it on close, and silently ignores unsupported browsers.
- **Not found** (ApiError code `not_found`): EmptyState with a lemon doodle, "This recipe has gone off", "We couldn't find that recipe.", and a "Back to recipes" button. **Other errors:** `ErrorCard`.

**Tests:**
- (a) Renders the title as the h1, the have/missing rows and "You have 1 of 3".
- (b) The servings scaler doubles amounts: with servings 2 and amount 1, clicking "More servings" twice shows 2.
- (c) "Add 2 missing to shopping list" sends 2 POSTs.
- (d) Cook mode moves through the steps with Next and the keyboard, and calls `wakeLock.request` (mock it).
- (e) A 404 shows "This recipe has gone off".

Commit `feat(frontend): recipe detail with servings scaler, missing-to-list and cook mode`.

---

### Task 6: Planner

**Files:** `frontend/app/(app)/planner/page.tsx`, `frontend/components/features/planner/{WeekBoard,DayColumn,MoveMealDialog}.tsx`; test `frontend/test/planner.test.tsx`.

**Behaviour:**
- **Header:** `PageHeader` with kicker "breakfast, lunch and dinner" and title "Planner".
- **Week navigation:** "Previous week" and "Next week" icon buttons with aria-labels, a "This week" ghost button, and the range label "26 Oct – 1 Nov 2026". The week lives in the URL (`?week=YYYY-MM-DD`, always a Monday, normalised with `startOfWeek`).
- **WeekBoard layout:** on desktop (≥lg), a 7-column grid with slot rows labelled Breakfast, Lunch and Dinner. On mobile, a vertical list of days; each day is a card with the three slots.
  - Today's column or card is highlighted with a coral top border and the label "Today".
- **Meal pill:** the compact image, the title (2-line clamp) linking to the recipe, and a `⋯` Menu with "Move…" (opens `MoveMealDialog` with date and slot fields, using `useUpdatePlan`) and "Remove" (`useDeletePlan`, toast "Removed from your plan").
- **Empty slot:** a "+" button (aria-label "Add {slot} on {formatLong(date)}") that links to `/recipes`, carrying the intended date and slot in the query (`?plan_date=…&plan_slot=…`). `AddToPlanDialog` then pre-fills from those params. Update `AddToPlanDialog` to read optional `defaultDate`/`defaultSlot` props and pass them from the recipes page.
- **Empty week:** the board stays visible, with a Caveat note over it: "an empty week — add something tasty".

**Tests:**
- (a) Fetches `/api/plans/?week=2026-10-26` for `?week=2026-10-28` (normalised to Monday).
- (b) Next week updates the URL to `?week=2026-11-02`.
- (c) Meals render in the correct day and slot.
- (d) Remove deletes optimistically.
- (e) Move sends PATCH with the new date and slot.
- (f) The empty slot link carries `plan_date` and `plan_slot`.

Commit `feat(frontend): weekly planner with slots, navigation and move/remove`.

---

### Task 7: Shopping list

**Files:** `frontend/app/(app)/shopping/page.tsx`, `frontend/components/features/shopping/{ShoppingGroup,ShoppingRow,MoveToKitchenDialog,AddShoppingItem}.tsx`; test `frontend/test/shopping.test.tsx`; print CSS in `globals.css`.

**Behaviour:**
- **Header:** `PageHeader` with kicker "tick, done, stored" and title "Shopping list". Actions: "Print" (calls `window.print()`) and "Clear ticked" (shown only when any item is checked; uses `useClearChecked`; toast "Cleared {n} items").
- **AddShoppingItem:** an item input (label "Add an item"), an optional quantity input, and an "Add" button.
- **Groups:** unchecked items are grouped by `aisle` (blank aisle → "Other"), sorted by aisle name with "Other" last. Each group is a card with an `<h2>` aisle name. Checked items sit in a final "In the basket" group with reduced visual emphasis but still AA contrast.
- **ShoppingRow:**
  - A large checkbox (44px target) with the label "{name} {quantity}". Toggling it uses `useUpdateShopping` (optimistic). When it becomes checked, the tick draws (SVG stroke animation, disabled under reduced motion) and the name gets a line-through.
  - When an item is checked, a toast appears: "{name} ticked" with the action "Move to kitchen", which opens `MoveToKitchenDialog`. Each row also has a "Move to kitchen" icon button (aria-label "Move {name} to your kitchen") and a delete icon button.
  - Rows with `source === "auto"` show a tiny "from your plan" badge.
- **MoveToKitchenDialog:** category select and expiry date, then "Move" → `useShoppingToInventory`, then toast "Moved to your kitchen".
- **Print CSS (`@media print`):** hide the app shell chrome (sidebar, bottom tabs, header, buttons), show only the list in black on white with checkboxes as ☐/☑ characters, and keep groups together.
- **Empty:** basket doodle, "Your list is empty", "Add items here, or add a recipe to your plan and we'll list what's missing.", and a "Browse recipes" button.

**Tests:**
- (a) Grouping by aisle with "Other" last and "In the basket" at the end.
- (b) A tick sends PATCH `{checked: true}` and shows the "Move to kitchen" toast action.
- (c) A failed tick rolls back and shows an error toast.
- (d) Move to kitchen sends POST `/api/shopping/{id}/to-inventory/` with `{category, expiry_date}`.
- (e) Clear ticked appears only with checked items and POSTs `clear-checked`.
- (f) Add item POSTs and clears the input.

Commit `feat(frontend): shopping list grouped by aisle with tick-off, move to kitchen and print`.

---

### Task 8: Profile and onboarding

**Files:** `frontend/app/(app)/profile/page.tsx`, `frontend/app/(app)/onboarding/page.tsx`, `frontend/components/features/profile/{ProfileForm,PasswordForm}.tsx`, `frontend/components/features/onboarding/StarterPicker.tsx`; update `frontend/middleware.ts` matcher with `/onboarding/:path*`; test `frontend/test/profile.test.tsx`, `frontend/test/onboarding.test.tsx`.

**Behaviour:**
- **Profile:** `PageHeader` with kicker "make it yours" and title "Profile".
  - **ProfileForm card:**
    - Fields: display name; a diet `SelectField` (None, Vegetarian, Vegan, Pescetarian, Gluten free, Ketogenic, Paleo; values exactly the backend's `DIETS`); and intolerances as a chip checkbox group (Dairy, Egg, Gluten, Grain, Peanut, Seafood, Sesame, Shellfish, Soy, Sulfite, Tree nut, Wheat; values lowercase as in the backend).
    - "Save changes" calls `useUpdateMe`, toasts "Profile saved", and invalidates suggestions and search.
    - Helper text: "Diet applies to every suggestion and search. Intolerances apply to recipe search."
  - **PasswordForm card:** current password and new password fields, then "Change password" → `useChangePassword`. Field errors from the envelope; toast "Password changed".
  - **Demo user:** both forms are replaced by a paper card. Caveat note "you're in the demo kitchen". Body: "This shared kitchen resets every day, so profile changes are switched off. Create your own account to save preferences." Buttons: "Create an account" (`/signup`) and "Log out".
  - **Account card** (all users): username, and a "Log out" button.
- **Onboarding** (`/onboarding`): `PageHeader` with kicker "let's stock up" and title "What's in your kitchen?".
  - **StarterPicker:** 18 one-tap starter chips in three groups.
    - Fridge: eggs, milk, butter, cheddar, greek yogurt, spinach.
    - Pantry: rice, pasta, onion, garlic, tinned tomatoes, olive oil.
    - Freezer: frozen peas, chicken breast, berries, sweetcorn, bread, mince.
  - Chips toggle with `aria-pressed`. An optional "Expires in" select for the fridge group (3, 5 or 7 days; default 5) sets the `expiry_date` of the fridge items.
  - "Add {n} ingredients" posts each selected item with `useAddInventory` (category from its group), then PATCHes `/api/auth/me/` with `{onboarded: true}`, then goes to `/dashboard` with the toast "Your kitchen is stocked".
  - "Skip for now" PATCHes onboarded and goes to `/dashboard`.
  - Demo users are redirected to `/dashboard`, since they're already onboarded.
- **First login:** in `(app)/layout.tsx`, if `me.onboarded === false` and the current path is not `/onboarding` or `/profile`, `redirect("/onboarding")`. Update the guard tests.

**Tests:**
- (a) Profile save PATCHes `{display_name, diet, intolerances}`.
- (b) A demo user sees the read-only card and no form.
- (c) Password field errors render.
- (d) Onboarding: selecting 3 chips and confirming sends 3 POSTs with the right categories, then the onboarded PATCH, then navigates.
- (e) Skip PATCHes and navigates.
- (f) The guard redirects a non-onboarded user to `/onboarding`.

Commit `feat(frontend): profile preferences, demo read-only note and onboarding starter picker`.

---

### Task 9: Kitchen assistant panel, sidebar stat and toast placement

**Files:** `frontend/components/features/assistant/{AssistantPanel,ChatThread}.tsx`; modify `frontend/components/shell/{AppShell,AppHeader,Sidebar}.tsx`, `frontend/components/ui/Toaster.tsx`; test `frontend/test/assistant.test.tsx`.

**Behaviour:**
- **AssistantPanel:** a `Sheet` (right on desktop, bottom on mobile) titled "Kitchen assistant", opened by the AppHeader assistant button.
  - **Layout:** a Caveat intro "ask me anything about food". Three suggestion chips when the thread is empty: "What can I make with spinach?", "How long does cooked rice keep?", "Swap for buttermilk?". Then the thread, then a composer (textarea with label "Message", Enter sends and Shift+Enter adds a newline, and a "Send" icon button).
  - **History:** the thread is kept in `sessionStorage` (`mh-assistant-thread`, wrapped in try/catch) so it survives navigation. Only the last 20 messages are sent to `POST /api/assistant/chat/`.
  - **Messages:** the user's messages are right-aligned sage-deep bubbles with cream text; assistant messages are left-aligned paper bubbles with the logo mark. A typing indicator (three dots, static under reduced motion) shows while pending. New messages are announced with `aria-live="polite"`.
  - **Errors:** on 429 or 503 the error message is shown as an assistant-styled notice in the thread, and the typed text is restored into the composer.
  - A "Clear chat" ghost button.
- **Sidebar stat:** `AppShell` fetches `useStats()` and passes `stat={stats.used_this_month}` to Sidebar. The card shows the number, or "—" while loading.
- **Toasts:** inside the app shell below `lg`, the toast viewport sits above the bottom tabs (`bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`). Make this a prop on `Toaster` or a CSS variable set by AppShell.

**Tests:**
- (a) Opening the panel from the header button shows the dialog "Kitchen assistant".
- (b) Clicking a suggestion chip sends it, and the reply renders.
- (c) A 429 shows the throttle message and restores the text.
- (d) The thread persists across unmount/remount via sessionStorage.
- (e) The sidebar stat shows `used_this_month`.

Commit `feat(frontend): kitchen assistant panel, live waste stat and toast placement`.

---

### Task 10: Playwright end-to-end and accessibility tests, CI

**Files:** `frontend/e2e/playwright.config.ts`, `frontend/e2e/demo-flow.spec.ts`, `frontend/e2e/a11y.spec.ts`, `frontend/package.json` (scripts `e2e`), `.github/workflows/ci.yml` (e2e job).

**Behaviour:**
- **Config:** `webServer` starts two servers:
  - the Django backend: `cd ../backend && python manage.py migrate --noinput && python manage.py seed_demo && python manage.py runserver 127.0.0.1:8010`, with env `SPOONACULAR_API_KEY=""`, `GROQ_API_KEY=""`, `DJANGO_SETTINGS_MODULE=meal_hacker.settings.dev`;
  - the frontend: `npm run build && npm run start -- -p 3010` with `BACKEND_URL=http://127.0.0.1:8010`.
  - Add `http://localhost:3010` and `http://127.0.0.1:3010` to the dev CSRF trusted origins in `backend/meal_hacker/settings/dev.py`, plus a backend test.
  - Use a separate SQLite file for e2e via env `E2E_DB=1`, so `dev.py` uses `db-e2e.sqlite3`. Add it to `.gitignore`.
  - Projects: chromium desktop (1280×800) and mobile (Pixel 7).
- **demo-flow.spec.ts:**
  1. Landing → click "Open the kitchen" → the URL is `/dashboard` and the heading "Dashboard" is visible.
  2. Kitchen → quick add "2 lemons" → a card "lemons" appears.
  3. Recipes → open the first recipe → "Add to plan" → submit → toast "Added to".
  4. Planner shows the meal on today's date.
  5. Shopping shows at least one "from your plan" item → tick it → the "In the basket" group contains it.
  6. Log out (sidebar on desktop, account menu on mobile) → lands on `/`.
- **a11y.spec.ts:** with `@axe-core/playwright`, run axe (tags wcag2a, wcag2aa) on `/`, `/login`, `/signup`, and, after demo login, on `/dashboard`, `/kitchen`, `/recipes`, `/recipes/716429`, `/planner`, `/shopping` and `/profile`. Expect zero violations.
- **CI:** an `e2e` job after `backend` and `frontend`:
  - Set up Python 3.9 and Node 24.
  - Run `pip install -r backend/requirements.txt`, `npm ci`, `npx playwright install --with-deps chromium`, then `npm run e2e`.
  - Upload `playwright-report` on failure.

Steps: write the specs → run `npm run e2e` locally (the implementer runs it) → fix any real bugs found (each fix gets a unit test) → commit `test(frontend): Playwright demo flow and axe accessibility checks in CI`.

---

### Task 11: Visual review pass (controller-run)

Same procedure as Plan B Task 10, covering every app page:
- Widths: 375, 768, 1280 and 1440px.
- Checks: content-shaped loading states, empty and error states (force an error by stopping the backend), the assistant panel, cook mode, print preview of the shopping list, and reduced motion.
- Process: findings go into one fix dispatch, with at most 3 rounds.
