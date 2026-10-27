import { headers } from "next/headers";
import { BACKEND_URL } from "./backend";
import type { Me } from "./types";

/** Server-side session lookup; forwards the browser's cookies to Django. */
export async function getSession(): Promise<Me | null> {
  try {
    const cookie = (await headers()).get("cookie") ?? "";
    const res = await fetch(`${BACKEND_URL}/api/auth/me/`, {
      headers: { cookie, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.status !== 200) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}
