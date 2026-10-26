import { Card } from "@/components/ui/Card";
import { LogoutButton } from "./LogoutButton";

export function AccountCard({ username }: { username: string }) {
  return (
    <Card as="section" aria-labelledby="account-title" className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div>
        <h2 id="account-title" className="font-display text-xl text-sage-deep">
          Account
        </h2>
        <p className="mt-1 text-sm text-muted">
          Signed in as <span className="font-medium text-ink">{username}</span>
        </p>
      </div>
      <LogoutButton />
    </Card>
  );
}
