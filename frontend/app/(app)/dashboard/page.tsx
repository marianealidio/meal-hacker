"use client";

import { PageHeader } from "@/components/features/PageHeader";
import { ExpiringList } from "@/components/features/dashboard/ExpiringList";
import { NotesCard } from "@/components/features/dashboard/NotesCard";
import { SuggestionsRow } from "@/components/features/dashboard/SuggestionsRow";
import { TonightsPick } from "@/components/features/dashboard/TonightsPick";
import { WasteStat } from "@/components/features/dashboard/WasteStat";
import { WeekPeek } from "@/components/features/dashboard/WeekPeek";
import { ButtonLink } from "@/components/ui/Button";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        kicker="what's cooking"
        title="Dashboard"
        actions={<ButtonLink href="/recipes" variant="secondary">Browse recipes</ButtonLink>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
        <TonightsPick className="lg:col-span-2" />
        <ExpiringList className="lg:self-start" />
        <SuggestionsRow className="lg:col-span-3" />
        <WeekPeek className="lg:col-span-2" />
        <div className="flex flex-col gap-5">
          <WasteStat />
          <NotesCard />
        </div>
      </div>
    </>
  );
}
