"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OpenKitchenButton } from "@/components/marketing/OpenKitchenButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/lib/queries";

/** Only same-site paths are honoured, so a crafted link cannot bounce people to another origin. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const error = login.error instanceof ApiError ? login.error : login.error ? new ApiError(0, "unknown", login.error.message) : null;
  const fields = error?.fields ?? {};
  const hasFieldErrors = Object.keys(fields).length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ username, password }, { onSuccess: () => router.push(safeNext(next)) });
  }

  return (
    <div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && !hasFieldErrors && (
          <p role="alert" className="rounded-xl bg-coral-tint px-4 py-3 text-sm font-medium leading-snug text-coral-tint-ink">
            {error.message}
          </p>
        )}
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fields.username?.[0]}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password?.[0]}
        />
        <Button type="submit" size="lg" pending={login.isPending} className="mt-1 w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-coral-deep underline underline-offset-4">
          Create an account
        </Link>
      </p>

      <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-widest text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col items-center gap-2 pb-6">
        <OpenKitchenButton variant="dark" size="lg" className="w-full" />
        <p className="text-center text-xs text-muted">Explore a ready-made demo kitchen</p>
      </div>
    </div>
  );
}
