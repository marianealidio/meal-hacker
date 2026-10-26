"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toaster";
import { api, type InventoryInput, type PlanInput, type ProfilePatch, type SearchParams, type ShoppingInput } from "./api";
import { formatDay } from "./dates";
import type {
  Category, ChatMessage, Favourite, InventoryItem, MealPlan, RecipeDetail, RecipeSummary, ShoppingItem, Slot,
  Suggestions, Week,
} from "./types";

export const queryKeys = {
  me: ["me"] as const,
  inventory: (category?: Category) => ["inventory", category ?? "all"] as const,
  note: ["note"] as const,
  suggestions: ["suggestions"] as const,
  search: (params: SearchParams) => ["search", params] as const,
  recipe: (id: number) => ["recipe", id] as const,
  favourites: ["favourites"] as const,
  week: (date?: string) => ["week", date ?? "current"] as const,
  shopping: ["shopping"] as const,
  stats: ["stats"] as const,
};

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me, retry: false });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { username: string; password: string }) => api.login(v.username, v.password),
    onSuccess: (me) => qc.setQueryData(queryKeys.me, me),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { username: string; password: string }) => api.signup(v.username, v.password),
    onSuccess: (me) => qc.setQueryData(queryKeys.me, me),
  });
}

/**
 * `onSuccess` is attached to the mutation itself rather than to `mutate()`, so it still
 * runs if the calling component unmounts before the response arrives.
 */
export function useDemoLogin(options: { onSuccess?: () => void } = {}) {
  const qc = useQueryClient();
  const { onSuccess } = options;
  return useMutation({
    mutationFn: () => api.demo(),
    onSuccess: (me) => {
      qc.setQueryData(queryKeys.me, me);
      onSuccess?.();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => api.logout(),
    onError: () => toast({ title: "Couldn't log out. Try again." }),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(queryKeys.me, null);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers

type Snapshot = [QueryKey, unknown][];
type Cached<T> = { data: T; stale: boolean };

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

function useErrorToast() {
  const { toast } = useToast();
  return (err: unknown) => toast({ title: messageOf(err) });
}

/**
 * Cancels in-flight reads under `key`, applies `update` to each cached entry, and returns the prior values.
 * Synchronous on purpose: the UI must change in the same tick as the click.
 */
function optimistic<T>(qc: QueryClient, key: QueryKey, update: (old: T) => T): Snapshot {
  void qc.cancelQueries({ queryKey: key });
  const snapshot = qc.getQueriesData<T>({ queryKey: key }) as Snapshot;
  for (const [k, old] of snapshot) {
    if (old !== undefined) qc.setQueryData<T>(k, update(old as T));
  }
  return snapshot;
}

function rollback(qc: QueryClient, ...snapshots: (Snapshot | undefined)[]) {
  for (const snap of snapshots) for (const [k, old] of snap ?? []) qc.setQueryData(k, old);
}

function invalidateKitchen(qc: QueryClient) {
  for (const key of ["inventory", "suggestions", "stats"]) qc.invalidateQueries({ queryKey: [key] });
}

// ---------------------------------------------------------------------------
// Reads

export function useInventory(category?: Category) {
  return useQuery({ queryKey: queryKeys.inventory(category), queryFn: () => api.inventory(category) });
}

export function useNote() {
  return useQuery({ queryKey: queryKeys.note, queryFn: api.note });
}

export function useSuggestions() {
  return useQuery({ queryKey: queryKeys.suggestions, queryFn: api.suggestions });
}

export function useSearch(params: SearchParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: queryKeys.search(params), queryFn: () => api.search(params), enabled });
}

export function useRecipe(id: number) {
  return useQuery({ queryKey: queryKeys.recipe(id), queryFn: () => api.recipe(id) });
}

export function useFavourites() {
  return useQuery({ queryKey: queryKeys.favourites, queryFn: api.favourites });
}

export function useWeek(date: string) {
  return useQuery({ queryKey: queryKeys.week(date), queryFn: () => api.week(date) });
}

export function useShopping() {
  return useQuery({ queryKey: queryKeys.shopping, queryFn: api.shopping });
}

export function useStats() {
  return useQuery({ queryKey: queryKeys.stats, queryFn: api.stats });
}

// ---------------------------------------------------------------------------
// Kitchen and notes

export function useAddInventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (input: InventoryInput) => api.addInventory(input),
    onError,
    onSuccess: (item) => {
      toast({ title: `Added ${item.name} to your kitchen` });
      invalidateKitchen(qc);
    },
  });
}

export function useUpdateInventory() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { id: number; patch: Partial<InventoryInput> }) => api.updateInventory(v.id, v.patch),
    onError,
    onSuccess: () => invalidateKitchen(qc),
  });
}

export function useDeleteInventory() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: number) => api.deleteInventory(id),
    onMutate: (id) => optimistic<InventoryItem[]>(qc, ["inventory"], (list) => list.filter((i) => i.id !== id)),
    onError: (err, _id, snapshot) => {
      rollback(qc, snapshot);
      onError(err);
    },
    onSettled: () => invalidateKitchen(qc),
  });
}

export function useUseInventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: number) => api.useInventory(id),
    onMutate: (id) => optimistic<InventoryItem[]>(qc, ["inventory"], (list) => list.filter((i) => i.id !== id)),
    onError: (err, _id, snapshot) => {
      rollback(qc, snapshot);
      onError(err);
    },
    onSuccess: () => toast({ title: "Marked as used" }),
    onSettled: () => invalidateKitchen(qc),
  });
}

export function useSaveNote() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (note: string) => api.saveNote(note),
    onError,
    onSuccess: (saved) => qc.setQueryData(queryKeys.note, saved),
  });
}

// ---------------------------------------------------------------------------
// Recipes

function flipFavourite<T extends { id: number; is_favourite: boolean }>(item: T, recipeId: number, to: boolean): T {
  return item.id === recipeId ? { ...item, is_favourite: to } : item;
}

export function useToggleFavourite() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { recipeId: number; isFavourite: boolean }) =>
      v.isFavourite ? api.removeFavourite(v.recipeId) : api.addFavourite(v.recipeId).then(() => undefined),
    onMutate: ({ recipeId, isFavourite }) => {
      const to = !isFavourite;
      const lists = (c: Cached<Suggestions>) => ({
        ...c,
        data: { ...c.data, results: c.data.results.map((r) => flipFavourite(r, recipeId, to)) },
      });
      // Read what we know about the recipe before the caches change, for the optimistic favourite row.
      const known =
        qc.getQueriesData<Cached<Suggestions>>({ queryKey: ["suggestions"] })
          .concat(qc.getQueriesData<Cached<Suggestions>>({ queryKey: ["search"] }))
          .flatMap(([, c]) => c?.data.results ?? [])
          .find((r) => r.id === recipeId) ??
        qc.getQueryData<Cached<RecipeDetail>>(queryKeys.recipe(recipeId))?.data;

      const snapshots = [
        optimistic<Cached<Suggestions>>(qc, ["suggestions"], lists),
        optimistic<Cached<Suggestions>>(qc, ["search"], lists),
        optimistic<Cached<RecipeDetail>>(qc, ["recipe", recipeId], (c) => ({
          ...c,
          data: flipFavourite(c.data, recipeId, to),
        })),
        optimistic<Favourite[]>(qc, queryKeys.favourites, (list) => {
          if (!to) return list.filter((f) => f.recipe_id !== recipeId);
          if (list.some((f) => f.recipe_id === recipeId)) return list;
          const r: Pick<RecipeSummary, "title" | "image" | "description"> = known ?? { title: "", image: "", description: "" };
          return [
            { recipe_id: recipeId, title: r.title, image: r.image, description: r.description, created_at: "" },
            ...list,
          ];
        }),
      ];
      return snapshots;
    },
    onError: (err, _v, snapshots) => {
      rollback(qc, ...(snapshots ?? []));
      onError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.favourites }),
  });
}

// ---------------------------------------------------------------------------
// Planner

export function useAddPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (input: PlanInput) => api.addPlan(input),
    onError,
    onSuccess: (plan) => {
      const extra = plan.added_to_shopping > 0 ? ` · ${plan.added_to_shopping} items on your list` : "";
      toast({ title: `Added to ${formatDay(plan.planned_date)}${extra}` });
      for (const key of ["week", "shopping", "stats"]) qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

function mapWeek(week: Week, fn: (meals: MealPlan[], date: string) => MealPlan[]): Week {
  return { ...week, days: week.days.map((d) => ({ ...d, meals: fn(d.meals, d.date) })) };
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { id: number; patch: { planned_date?: string; slot?: Slot } }) => api.updatePlan(v.id, v.patch),
    onMutate: ({ id, patch }) =>
      optimistic<Week>(qc, ["week"], (week) => {
        const moving = week.days.flatMap((d) => d.meals).find((m) => m.id === id);
        if (!moving) return week;
        const moved = { ...moving, ...patch };
        return mapWeek(week, (meals, date) => {
          const rest = meals.filter((m) => m.id !== id);
          return date === moved.planned_date ? [...rest, moved] : rest;
        });
      }),
    onError: (err, _v, snapshot) => {
      rollback(qc, snapshot);
      onError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["week"] }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: number) => api.deletePlan(id),
    onMutate: (id) => optimistic<Week>(qc, ["week"], (week) => mapWeek(week, (meals) => meals.filter((m) => m.id !== id))),
    onError: (err, _id, snapshot) => {
      rollback(qc, snapshot);
      onError(err);
    },
    onSettled: () => {
      for (const key of ["week", "stats"]) qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

// ---------------------------------------------------------------------------
// Shopping

export function useAddShopping() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (input: ShoppingInput) => api.addShopping(input),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shopping }),
  });
}

export function useUpdateShopping() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { id: number; patch: { checked?: boolean; quantity?: string; ingredient_name?: string } }) =>
      api.updateShopping(v.id, v.patch),
    onMutate: ({ id, patch }) =>
      optimistic<ShoppingItem[]>(qc, queryKeys.shopping, (list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    onError: (err, _v, snapshot) => {
      rollback(qc, snapshot);
      onError(err);
    },
  });
}

export function useDeleteShopping() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (id: number) => api.deleteShopping(id),
    onMutate: (id) => optimistic<ShoppingItem[]>(qc, queryKeys.shopping, (list) => list.filter((i) => i.id !== id)),
    onError: (err, _id, snapshot) => {
      rollback(qc, snapshot);
      onError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.shopping }),
  });
}

export function useShoppingToInventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { id: number; category: Category; expiry_date: string | null }) =>
      api.shoppingToInventory(v.id, { category: v.category, expiry_date: v.expiry_date }),
    onError,
    onSuccess: () => {
      toast({ title: "Moved to your kitchen" });
      for (const key of ["shopping", "inventory", "suggestions", "stats"]) qc.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useClearChecked() {
  const qc = useQueryClient();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: () => api.clearChecked(),
    onError,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shopping }),
  });
}

// ---------------------------------------------------------------------------
// Profile and assistant

export function useUpdateMe() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.updateMe(patch),
    onError,
    onSuccess: (me) => {
      qc.setQueryData(queryKeys.me, me);
      qc.invalidateQueries({ queryKey: queryKeys.suggestions });
      toast({ title: "Profile saved" });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (v: { old_password: string; new_password: string }) => api.changePassword(v.old_password, v.new_password),
    onError,
    onSuccess: () => toast({ title: "Password changed" }),
  });
}

export function useChat() {
  const onError = useErrorToast();
  return useMutation({ mutationFn: (messages: ChatMessage[]) => api.chat(messages), onError });
}
