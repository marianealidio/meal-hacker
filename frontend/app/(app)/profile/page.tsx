"use client";

import { AccountCard } from "@/components/features/profile/AccountCard";
import { DemoNote } from "@/components/features/profile/DemoNote";
import { PasswordForm } from "@/components/features/profile/PasswordForm";
import { ProfileForm } from "@/components/features/profile/ProfileForm";
import { ErrorCard } from "@/components/features/ErrorCard";
import { PageHeader } from "@/components/features/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMe } from "@/lib/queries";

export default function ProfilePage() {
  const { data: me, isPending, isError, error, refetch } = useMe();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader kicker="make it yours" title="Profile" />
      {isError && !me ? (
        <ErrorCard error={error} onRetry={() => refetch()} />
      ) : isPending || !me ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-72" />
          <Skeleton className="h-52" />
        </div>
      ) : (
        <>
          {me.is_demo ? (
            <DemoNote />
          ) : (
            <>
              <ProfileForm key={me.id} me={me} />
              <PasswordForm />
            </>
          )}
          <AccountCard username={me.username} showLogout={!me.is_demo} />
        </>
      )}
    </div>
  );
}
