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
    try {
      await fetch("/api/csrf/", { credentials: "same-origin" });
    } catch {
      throw new ApiError(0, "network", NETWORK_MESSAGE);
    }
    token = readCookie("csrftoken");
  }
  return token ?? "";
}

const CSRF_MESSAGE = "Your session needs a refresh. Reload the page and try again.";

type Body = { error?: { code?: unknown; message?: string; fields?: Record<string, string[]> } } | null;

async function readBody(res: Response): Promise<Body> {
  if (res.status === 204) return null;
  const isJson = (res.headers.get("Content-Type") ?? "").includes("application/json");
  return isJson ? await res.json().catch(() => null) : null;
}

function isJsonResponse(res: Response): boolean {
  return (res.headers.get("Content-Type") ?? "").includes("application/json");
}

function isCsrfFailure(res: Response, body: Body): boolean {
  return res.status === 403 && typeof body?.error?.message === "string" && body.error.message.startsWith("CSRF Failed");
}

export async function apiFetch<R>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<{ data: R; stale: boolean }> {
  const [pathname] = path.split("?");
  if (!pathname.startsWith("/api/") || !pathname.endsWith("/")) throw new Error("API paths must end with /");
  const method = (init.method ?? "GET").toUpperCase();
  const attempt = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (UNSAFE.has(method)) headers["X-CSRFToken"] = await ensureCsrf();
    try {
      return await fetch(path, {
        method,
        headers,
        credentials: "same-origin",
        signal: init.signal,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new ApiError(0, "network", NETWORK_MESSAGE);
    }
  };

  let res = await attempt();
  let body = await readBody(res);
  if (isCsrfFailure(res, body)) {
    try {
      await fetch("/api/csrf/", { credentials: "same-origin" });
    } catch {
      throw new ApiError(0, "network", NETWORK_MESSAGE);
    }
    res = await attempt();
    body = await readBody(res);
    if (isCsrfFailure(res, body)) throw new ApiError(403, "csrf", CSRF_MESSAGE);
  }
  const stale = res.headers.get("X-Stale") === "true";
  if (res.status === 204) return { data: undefined as R, stale };
  if (!res.ok) {
    const e = body?.error;
    if (e && typeof e.code === "string") {
      throw new ApiError(res.status, e.code, e.message ?? "Something went wrong.", e.fields ?? {});
    }
    throw new ApiError(res.status, "network", NETWORK_MESSAGE);
  }
  if (body === null && isJsonResponse(res)) throw new ApiError(res.status, "network", NETWORK_MESSAGE);
  return { data: body as unknown as R, stale };
}

const get = <R>(p: string) => apiFetch<R>(p).then((r) => r.data);
const send = <R>(method: string, p: string, body?: unknown) => apiFetch<R>(p, { method, body }).then((r) => r.data);

export type SearchParams = {
  q?: string;
  cuisine?: string;
  type?: string;
  diet?: string;
  matches_kitchen?: boolean;
};

export type InventoryInput = {
  /** Required unless `text` is given; the server parses `text` ("2 red peppers") into name and quantity. */
  name?: string;
  text?: string;
  quantity?: string;
  unit?: string;
  category: T.Category;
  expiry_date?: string | null;
};
export type ProfilePatch = Partial<Pick<T.Me, "display_name" | "diet" | "intolerances" | "onboarded">>;
export type PlanInput = { recipe_id: number; planned_date: string; slot: T.Slot; add_missing?: boolean };
export type ShoppingInput = { ingredient_name: string; quantity?: string; aisle?: string };

function searchQuery(p: SearchParams): string {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.cuisine) qs.set("cuisine", p.cuisine);
  if (p.type) qs.set("type", p.type);
  if (p.diet) qs.set("diet", p.diet);
  if (p.matches_kitchen) qs.set("matches_kitchen", "1");
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const api = {
  me: () => get<T.Me>("/api/auth/me/"),
  login: (username: string, password: string) => send<T.Me>("POST", "/api/auth/login/", { username, password }),
  signup: (username: string, password: string) => send<T.Me>("POST", "/api/auth/signup/", { username, password }),
  logout: () => send<void>("POST", "/api/auth/logout/"),
  demo: () => send<T.Me>("POST", "/api/auth/demo/"),
  updateMe: (patch: ProfilePatch) => send<T.Me>("PATCH", "/api/auth/me/", patch),
  changePassword: (old_password: string, new_password: string) =>
    send<void>("POST", "/api/auth/password/", { old_password, new_password }),

  inventory: (category?: T.Category) =>
    get<T.InventoryItem[]>(`/api/inventory/${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  addInventory: (input: InventoryInput) => send<T.InventoryItem>("POST", "/api/inventory/", input),
  updateInventory: (id: number, patch: Partial<InventoryInput>) =>
    send<T.InventoryItem>("PATCH", `/api/inventory/${id}/`, patch),
  deleteInventory: (id: number) => send<void>("DELETE", `/api/inventory/${id}/`),
  useInventory: (id: number) => send<T.InventoryItem>("POST", `/api/inventory/${id}/use/`),
  note: () => get<T.Note>("/api/note/"),
  saveNote: (note: string) => send<T.Note>("PUT", "/api/note/", { note }),

  suggestions: () => apiFetch<T.Suggestions>("/api/recipes/suggestions/"),
  search: (params: SearchParams) => apiFetch<T.Suggestions>(`/api/recipes/search/${searchQuery(params)}`),
  recipe: (id: number) => apiFetch<T.RecipeDetail>(`/api/recipes/${id}/`),
  favourites: () => get<T.Favourite[]>("/api/favourites/"),
  addFavourite: (recipeId: number) => send<T.Favourite>("POST", "/api/favourites/", { recipe_id: recipeId }),
  removeFavourite: (recipeId: number) => send<void>("DELETE", `/api/favourites/${recipeId}/`),

  week: (date?: string) => get<T.Week>(`/api/plans/${date ? `?week=${encodeURIComponent(date)}` : ""}`),
  addPlan: (input: PlanInput) => send<T.MealPlan & { added_to_shopping: number }>("POST", "/api/plans/", input),
  updatePlan: (id: number, patch: { planned_date?: string; slot?: T.Slot }) =>
    send<T.MealPlan>("PATCH", `/api/plans/${id}/`, patch),
  deletePlan: (id: number) => send<void>("DELETE", `/api/plans/${id}/`),

  shopping: () => get<T.ShoppingItem[]>("/api/shopping/"),
  addShopping: (input: ShoppingInput) => send<T.ShoppingItem>("POST", "/api/shopping/", input),
  updateShopping: (id: number, patch: { checked?: boolean; quantity?: string; ingredient_name?: string }) =>
    send<T.ShoppingItem>("PATCH", `/api/shopping/${id}/`, patch),
  deleteShopping: (id: number) => send<void>("DELETE", `/api/shopping/${id}/`),
  shoppingToInventory: (id: number, input: { category: T.Category; expiry_date: string | null }) =>
    send<T.InventoryItem>("POST", `/api/shopping/${id}/to-inventory/`, input),
  clearChecked: () => send<{ deleted: number }>("POST", "/api/shopping/clear-checked/"),

  stats: () => get<T.Stats>("/api/stats/"),
  chat: (messages: T.ChatMessage[]) => send<{ reply: string }>("POST", "/api/assistant/chat/", { messages }),
};
