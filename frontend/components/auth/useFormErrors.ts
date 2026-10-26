import { useEffect, useRef } from "react";
import { ApiError } from "@/lib/api";

/** Same-origin targets only, found by parsing the way a browser would (tabs and backslashes included). */
export function safeNext(next: string | null): string {
  if (!next) return "/dashboard";
  try {
    const u = new URL(next, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search + u.hash : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

const join = (m?: string[]) => (m && m.length ? m.join(" ") : undefined);

/**
 * Splits a mutation error into per-field messages and a form-level banner. The banner shows
 * whenever neither rendered field carries an error, so nothing the server says is swallowed.
 * After a failed submit, focus moves to the first invalid field, or to the banner.
 */
export function useFormErrors(raw: Error | null) {
  const error = raw instanceof ApiError ? raw : raw ? new ApiError(0, "unknown", raw.message) : null;
  const fields = error?.fields ?? {};
  const username = join(fields.username);
  const password = join(fields.password);
  const other = Object.entries(fields).find(([k, v]) => k !== "username" && k !== "password" && v?.length)?.[1][0];
  const banner = error && !username && !password ? (other ?? error.message) : undefined;

  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!raw) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? bannerRef.current)?.focus();
  }, [raw]);

  return { username, password, banner, formRef, bannerRef };
}
