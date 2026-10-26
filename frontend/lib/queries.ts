"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SearchParams } from "./api";
import type { Category } from "./types";

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

export function useDemoLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.demo(),
    onSuccess: (me) => qc.setQueryData(queryKeys.me, me),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(queryKeys.me, null);
    },
  });
}
