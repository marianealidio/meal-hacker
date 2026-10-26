import Link from "next/link";
import { Doodle } from "@/components/brand/Doodle";
import { Logo } from "@/components/brand/Logo";
import { PaperGrain } from "@/components/brand/PaperGrain";
import { OpenKitchenButton } from "@/components/marketing/OpenKitchenButton";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="relative min-h-dvh bg-cream">
      <PaperGrain />
      <header className="mx-auto flex max-w-5xl px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Meal Hacker home" className="rounded-pill no-underline">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 pb-24 pt-12 text-center sm:pt-20">
        <Doodle name="whisk" className="mb-6 h-24 w-24 text-coral-deep" />
        <h1 className="text-display-lg">This shelf is empty</h1>
        <p className="mt-4 text-lg text-muted">We couldn&apos;t find that page. It may have been eaten.</p>
        <div className="mt-8 flex flex-wrap items-start justify-center gap-3">
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
          <OpenKitchenButton />
        </div>
      </main>
    </div>
  );
}
