"use client";

import Link from "next/link";
import { useFormErrors, safeNext } from "./useFormErrors";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OpenKitchenButton } from "@/components/marketing/OpenKitchenButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useLogin } from "@/lib/queries";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const errs = useFormErrors(login.error);

  function submit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ username, password }, { onSuccess: () => router.push(safeNext(next)) });
  }

  return (
    <div>
      <form ref={errs.formRef} onSubmit={submit} noValidate className="flex flex-col gap-5">
        {errs.banner && (
          <p ref={errs.bannerRef} tabIndex={-1} role="alert" className="rounded-xl bg-coral-tint px-4 py-3 text-sm font-medium leading-snug text-coral-tint-ink focus:outline-none">
            {errs.banner}
          </p>
        )}
        <TextField
          label="Username"
          name="username"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errs.username}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errs.password}
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
