import { ArchImage } from "@/components/brand/ArchImage";
import { Blob } from "@/components/brand/Blob";
import { Reveal } from "@/components/brand/Reveal";
import { ScriptNote } from "@/components/brand/ScriptNote";

const STACK = [
  "Django",
  "Django REST Framework",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "TanStack Query",
  "PostgreSQL",
  "Spoonacular API",
  "Groq",
];

export function AboutProject() {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 overflow-x-clip bg-paper">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] lg:gap-24 lg:px-8 lg:py-28">
        <Reveal>
          <ScriptNote>the story</ScriptNote>
          <h2 id="about-title" className="mt-1 max-w-[14ch] text-display-lg">
            Built as a final-year project
          </h2>
          <p className="mt-6 max-w-[54ch] text-[1.05rem] leading-relaxed text-ink">
            Meal Hacker started as my BSc Computer Science final-year project at the University of Westminster in 2026: a
            small app to stop good food going in the bin. This version is a full rebuild, with a Django REST API, a Next.js
            front end and a design system made from scratch.
          </p>
          <p className="mt-6 -rotate-2 font-script text-[1.9rem] leading-none text-coral-deep">— Mariane</p>
        </Reveal>

        <Reveal delay={0.1} className="relative">
          <ArchImage
            src="https://images.unsplash.com/photo-1760445529235-00eaa84b81ca?auto=format&fit=crop&w=900&q=80"
            alt="Hands arranging cherry tomatoes on a wooden board"
            sizes="(min-width: 768px) 420px, 92vw"
            shape="soft"
            className="ml-auto aspect-[5/4] w-[88%]"
          >
            <Blob tone="blush" shape={3} className="absolute -right-[14%] -top-[18%] -z-10 w-[70%]" />
          </ArchImage>

          <div className="relative -mt-16 w-[86%] rounded-[24px] border border-line bg-card p-5 shadow-lift sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Built with</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {STACK.map((tech) => (
                <li key={tech} className="rounded-pill border border-line bg-cream px-3 py-1.5 text-[0.8rem] font-medium text-sage-deep">
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
