"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useChangePassword } from "@/lib/queries";

const join = (m?: string[]) => (m && m.length ? m.join(" ") : undefined);

export function PasswordForm() {
  const change = useChangePassword();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);

  const err = change.error instanceof ApiError ? change.error : null;
  const oldError = join(err?.fields.old_password);
  const newError = join(err?.fields.new_password);
  const banner = change.error && !oldError && !newError ? (change.error as Error).message : undefined;

  useEffect(() => {
    if (!change.error) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? bannerRef.current)?.focus();
  }, [change.error]);

  return (
    <Card as="section" aria-labelledby="password-title" className="p-5 sm:p-6">
      <h2 id="password-title" className="font-display text-xl text-sage-deep">
        Password
      </h2>
      <form
        ref={formRef}
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate(
            { old_password: oldPassword, new_password: newPassword },
            {
              onSuccess: () => {
                setOld("");
                setNew("");
                document.getElementById("old_password")?.focus();
              },
            },
          );
        }}
      >
        {banner && (
          <p ref={bannerRef} tabIndex={-1} role="alert" className="rounded-xl bg-coral-tint px-4 py-3 text-sm text-coral-tint-ink">
            {banner}
          </p>
        )}
        <TextField
          label="Current password"
          name="old_password"
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOld(e.target.value)}
          error={oldError}
          required
        />
        <TextField
          label="New password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          error={newError}
          required
        />
        <div>
          <Button type="submit" pending={change.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}
