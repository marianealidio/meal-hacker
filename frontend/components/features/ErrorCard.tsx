import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ErrorCard({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card role="alert" className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[0.95rem] text-ink">{error.message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
