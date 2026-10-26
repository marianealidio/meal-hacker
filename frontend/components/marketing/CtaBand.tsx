import { Doodle } from "@/components/brand/Doodle";
import { Reveal } from "@/components/brand/Reveal";
import { OpenKitchenButton } from "./OpenKitchenButton";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-sage-deep text-cream [&_button:focus-visible]:outline-butter">
      <Doodle name="leaf" className="pointer-events-none absolute -left-6 top-10 -z-10 size-40 -rotate-12 text-sage opacity-30 lg:left-[8%] lg:size-52" />
      <Doodle name="sparkle" className="pointer-events-none absolute -right-2 bottom-8 -z-10 size-24 text-sage opacity-35 lg:right-[12%] lg:top-14 lg:bottom-auto" />
      <Doodle name="sprig" className="pointer-events-none absolute bottom-0 left-[58%] -z-10 hidden size-28 rotate-[20deg] text-sage opacity-20 md:block" />

      <Reveal className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:py-28">
        <h2 id="cta-title" className="text-display-lg text-cream">
          Your kitchen is already full of dinners.
        </h2>
        <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-cream/85">
          Open the demo kitchen and see what it can make tonight.
        </p>
        <div className="mt-9">
          <OpenKitchenButton arrow size="lg" />
        </div>
      </Reveal>
    </section>
  );
}
