import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Doodle } from "@/components/brand/Doodle";
import { Logo } from "@/components/brand/Logo";
import { WaveDivider } from "@/components/brand/WaveDivider";
import { cn } from "@/lib/cn";

const GITHUB_URL = "https://github.com/marianealidio/meal-hacker";

// Coral-deep would vanish on sage-deep, so links here use a butter ring instead.
const linkClass =
  "inline-flex min-h-11 items-center gap-1 rounded-md text-[0.95rem] text-cream no-underline decoration-coral decoration-2 underline-offset-[5px] " +
  "transition-colors hover:text-butter hover:underline focus-visible:outline-butter";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-body text-xs font-bold uppercase tracking-[0.16em] text-butter">{title}</h2>
      <ul className="mt-3 flex flex-col">{children}</ul>
    </div>
  );
}

export type SiteFooterProps = {
  /** Fill class of the section that ends above the footer; the torn edge continues its colour. */
  waveFrom?: string;
};

export function SiteFooter({ waveFrom = "fill-cream" }: SiteFooterProps) {
  return (
    <footer className="relative isolate">
      <WaveDivider variant={4} from={waveFrom} to="bg-sage-deep" />
      <div className="relative isolate overflow-hidden bg-sage-deep text-cream">
        <Doodle
          name="sprig"
          className="pointer-events-none absolute -right-6 -top-2 -z-10 size-48 rotate-12 text-sage opacity-25 sm:right-6 lg:size-64"
        />
        <Doodle
          name="leaf"
          className="pointer-events-none absolute -top-8 left-[36%] -z-10 hidden size-24 -rotate-12 text-sage opacity-15 lg:block"
        />

        <div className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 md:pt-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_2fr]">
            <div>
              <Link href="/" className="-m-1.5 inline-flex rounded-pill p-1.5 no-underline focus-visible:outline-butter">
                <Logo withWordmark tone="light" />
              </Link>
              <p className="mt-5 max-w-[16ch] font-display text-display-md text-cream">
                Less waste, <em className="text-blush">better dinners.</em>
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-10">
              <Column title="Product">
                <li><Link href="/#features" className={linkClass}>Features</Link></li>
                <li><Link href="/#how-it-works" className={linkClass}>How it works</Link></li>
                <li><Link href="/login" className={linkClass}>Log in</Link></li>
                <li><Link href="/signup" className={linkClass}>Sign up</Link></li>
              </Column>

              <Column title="Project">
                <li><Link href="/#about" className={linkClass}>About</Link></li>
                <li>
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={cn(linkClass, "group")}>
                    GitHub
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              </Column>
            </nav>
          </div>

          <div className="mt-12 border-t border-cream/15 pt-6">
            <p className="text-sm leading-relaxed text-cream/75">
              © 2026 Mariane Alidio · BSc Computer Science, University of Westminster · Photos: Unsplash · Recipe data:
              Spoonacular
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
