import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Log in" lead="Pick up where you left off in your kitchen.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
