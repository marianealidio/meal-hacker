"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorCard } from "@/components/features/ErrorCard";
import { StarterPicker } from "@/components/features/onboarding/StarterPicker";
import { PageHeader } from "@/components/features/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMe } from "@/lib/queries";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: me, isPending, isError, error, refetch } = useMe();

  useEffect(() => {
    if (me?.is_demo) router.replace("/dashboard");
  }, [me?.is_demo, router]);

  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <PageHeader kicker="let's stock up" title="What's in your kitchen?" />
      {isError && !me ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : isPending || !me || me.is_demo ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <StarterPicker />
      )}
    </div>
  );
}
