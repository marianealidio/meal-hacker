import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your account" lead="Track what you have, plan what to cook, waste less.">
      <SignupForm />
    </AuthCard>
  );
}
