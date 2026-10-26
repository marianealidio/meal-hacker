"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useSignup } from "@/lib/queries";

export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const error = signup.error instanceof ApiError ? signup.error : signup.error ? new ApiError(0, "unknown", signup.error.message) : null;
  const fields = error?.fields ?? {};
  const hasFieldErrors = Object.keys(fields).length > 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    signup.mutate({ username, password }, { onSuccess: () => router.push("/dashboard") });
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
          hint="3–150 letters, numbers or . @ + - _"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fields.username?.[0]}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, not too common"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password?.[0]}
        />
        <Button type="submit" size="lg" pending={signup.isPending} className="mt-1 w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 pb-2 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-coral-deep underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
