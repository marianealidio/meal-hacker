import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { ArchImage } from "@/components/brand/ArchImage";
import { PaperGrain } from "@/components/brand/PaperGrain";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { getSession } from "@/lib/session";

const PHOTO = "https://images.unsplash.com/photo-1626200419537-f07108a01aac?auto=format&fit=crop&w=900&q=80";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/dashboard");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <PaperGrain />
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sage-deep p-10 text-cream md:flex lg:p-14">
        <Link
          href="/"
          className="w-fit rounded-pill no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blush"
        >
          <Logo tone="light" />
        </Link>
        <div className="flex flex-col items-center gap-6 py-8">
          <ScriptNote className="text-blush">welcome back to the kitchen</ScriptNote>
          <ArchImage
            src={PHOTO}
            alt="A bowl of green soup with fresh herbs"
            sizes="(min-width: 768px) 40vw, 0px"
            className="w-full max-w-72"
          />
        </div>
        <figure>
          <blockquote className="font-display text-xl italic leading-snug text-cream/90">
            Cook what you have, before it goes off.
          </blockquote>
        </figure>
      </aside>
      <div className="flex min-h-dvh flex-col bg-cream md:min-h-0">
        <header className="px-4 py-5 md:hidden">
          <Link href="/" className="inline-flex rounded-pill no-underline">
            <Logo />
          </Link>
        </header>
        <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 py-8 focus:outline-none md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
