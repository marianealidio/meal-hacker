import { Sprout } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <h1 className="font-display text-title text-sage-deep">{title}</h1>
      <EmptyState
        titleAs="h2"
        illustration={<Sprout className="size-14 text-sage-deep" strokeWidth={1.5} />}
        title="Coming together"
        body={`${title} is being prepared and will be ready soon.`}
      />
    </>
  );
}
