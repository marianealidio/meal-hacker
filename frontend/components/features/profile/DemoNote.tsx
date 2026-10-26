import { ScriptNote } from "@/components/brand/ScriptNote";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "./LogoutButton";

export function DemoNote() {
  return (
    <Card as="section" tone="paper" aria-labelledby="demo-note" className="flex flex-col items-start gap-3 p-5 sm:p-6">
      <h2 id="demo-note" className="m-0">
        <ScriptNote>you&apos;re in the demo kitchen</ScriptNote>
      </h2>
      <p className="max-w-prose text-ink">
        This shared kitchen resets every day, so profile changes are switched off. Create your own account to save preferences.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/signup">Create an account</ButtonLink>
        <LogoutButton />
      </div>
    </Card>
  );
}
