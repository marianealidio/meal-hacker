"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useLogout } from "@/lib/queries";

export function LogoutButton({ variant = "secondary" }: { variant?: "secondary" | "ghost" }) {
  const router = useRouter();
  const logout = useLogout();
  return (
    <Button
      variant={variant}
      pending={logout.isPending}
      onClick={() =>
        logout.mutate(undefined, {
          onSuccess: () => {
            router.replace("/");
            router.refresh();
          },
        })
      }
    >
      <LogOut className="size-4" aria-hidden="true" />
      Log out
    </Button>
  );
}
