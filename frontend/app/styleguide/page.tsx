import type { Metadata } from "next";
import { Clock, Leaf, Search, ShoppingBasket } from "lucide-react";
import { ArchImage } from "@/components/brand/ArchImage";
import { Blob } from "@/components/brand/Blob";
import { Doodle } from "@/components/brand/Doodle";
import { Logo } from "@/components/brand/Logo";
import { PaperGrain } from "@/components/brand/PaperGrain";
import { ScriptNote } from "@/components/brand/ScriptNote";
import { WaveDivider } from "@/components/brand/WaveDivider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { DOODLES, SWATCHES, TYPE_SCALE } from "./data";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

const PHOTO = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80";

function Section({ id, title, note, children }: { id: string; title: string; note: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line py-12 first-of-type:border-t-0 sm:py-16">
      <div className="mb-8 max-w-2xl">
        <h2 id={id} className="text-display-md">
          {title}
        </h2>
        <p className="mt-2 text-muted">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Specimen({ caption, children, className }: { caption: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className="m-0">
      <div className={className}>{children}</div>
      <figcaption className="mt-3 text-xs font-medium uppercase tracking-wider text-muted">{caption}</figcaption>
    </figure>
  );
}

export default function Styleguide() {
  return (
    <div className="relative min-h-dvh bg-cream">
      <PaperGrain />
      <header className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Logo />
          <h1 className="mt-8 text-display-lg">Meal Hacker design system</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Every token and component in one place: a sage and coral kitchen, set in Fraunces, DM Sans and a pinch of Caveat.
          </p>
          <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2">
            {["colours", "type", "buttons", "chips", "fields", "cards", "tabs", "dialog", "empty", "skeletons", "brand"].map((id) => (
              <a key={id} href={`#${id}`} className="rounded-pill border border-line bg-card px-3 py-1 text-sm font-medium capitalize text-sage-deep no-underline hover:bg-sage-tint">
                {id}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Section id="colours" title="Colours" note="Each swatch is paired with the text colour that keeps it at WCAG AA. Never set cream text on sage.">
          <ul className="grid list-none grid-cols-1 gap-4 p-0 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {SWATCHES.map((s) => (
              <li key={s.name} className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
                <div className={`${s.bg} ${s.text} flex h-24 items-end justify-between px-4 py-3`}>
                  <span className="font-display text-xl">Aa</span>
                  <span data-testid={`swatch-label-${s.name}`} className="text-xs font-medium">on {s.textName}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="font-mono text-sm text-muted">{s.hex}</p>
                  <p className="mt-1 text-xs text-muted">{s.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="type" title="Type scale" note="Fluid display sizes for headings, DM Sans for everything you read, Caveat once per section at most.">
          <div className="divide-y divide-line rounded-card border border-line bg-card shadow-soft">
            {TYPE_SCALE.map((t) => (
              <div key={t.token} className="grid gap-2 px-5 py-5 md:grid-cols-[11rem_1fr] md:gap-6">
                <div>
                  <p className="font-bold text-ink">{t.token}</p>
                  <p className="text-xs text-muted">{t.spec}</p>
                </div>
                <p className={`${t.cls} m-0 min-w-0 break-words`}>{t.sample}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="buttons" title="Buttons" note="Four variants, three sizes, and a pending state that keeps its width.">
          <div className="grid gap-8">
            <Specimen caption="Variants">
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="dark">Dark</Button>
              </div>
            </Specimen>
            <Specimen caption="Sizes">
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </Specimen>
            <Specimen caption="Pending and disabled">
              <div className="flex flex-wrap gap-3">
                <Button pending>Saving</Button>
                <Button variant="secondary" pending>
                  Loading
                </Button>
                <Button disabled>Disabled</Button>
              </div>
            </Specimen>
          </div>
        </Section>

        <Section id="chips" title="Chips and badges" note="Chips describe pantry state; badges label things.">
          <div className="grid gap-8 sm:grid-cols-2">
            <Specimen caption="Chip tones">
              <div className="flex flex-wrap gap-2">
                <Chip>Neutral</Chip>
                <Chip tone="have" icon={<Leaf className="size-3.5" aria-hidden="true" />}>
                  Have it
                </Chip>
                <Chip tone="missing" icon={<ShoppingBasket className="size-3.5" aria-hidden="true" />}>
                  Missing
                </Chip>
                <Chip tone="soon" icon={<Clock className="size-3.5" aria-hidden="true" />}>
                  Expires soon
                </Chip>
              </div>
            </Specimen>
            <Specimen caption="Badge">
              <div className="flex flex-wrap gap-2">
                <Badge>Vegetarian</Badge>
                <Badge>25 min</Badge>
                <Badge>Serves 4</Badge>
              </div>
            </Specimen>
          </div>
        </Section>

        <Section id="fields" title="Fields" note="Labelled, with hints and errors wired up through aria-describedby.">
          <div className="grid gap-6 md:grid-cols-3">
            <Specimen caption="Normal">
              <TextField label="Ingredient" name="sg-normal" placeholder="Cherry tomatoes" />
            </Specimen>
            <Specimen caption="With hint">
              <TextField label="Quantity" name="sg-hint" hint="Grams, or just say a handful." defaultValue="200" />
            </Specimen>
            <Specimen caption="With error">
              <TextField label="Email" name="sg-error" type="email" defaultValue="mari@" error="Enter a valid email address." />
            </Specimen>
            <Specimen caption="Select">
              <SelectField
                label="Meal"
                name="sg-select"
                options={[
                  { value: "breakfast", label: "Breakfast" },
                  { value: "lunch", label: "Lunch" },
                  { value: "dinner", label: "Dinner" },
                ]}
              />
            </Specimen>
            <Specimen caption="Text area" className="md:col-span-2">
              <TextAreaField label="Notes" name="sg-area" rows={3} placeholder="Less salt, more lemon." />
            </Specimen>
          </div>
        </Section>

        <Section id="cards" title="Cards" note="Card for raised content, paper for quieter groupings.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Specimen caption="tone: card">
              <Card className="p-6">
                <h3 className="text-title">Lemon chickpea skillet</h3>
                <p className="mt-2 text-sm text-muted">Pantry staples, one pan, ready in 25 minutes.</p>
              </Card>
            </Specimen>
            <Specimen caption="tone: paper">
              <Card tone="paper" className="p-6">
                <h3 className="text-title">Weekly shop</h3>
                <p className="mt-2 text-sm text-muted">Eight things missing for the week ahead.</p>
              </Card>
            </Specimen>
          </div>
        </Section>

        <Section id="tabs" title="Tabs" note="Arrow keys move between tabs; the active tab carries a coral underline.">
          <Tabs defaultValue="have">
            <TabsList aria-label="Pantry views">
              <TabsTrigger value="have">In the kitchen</TabsTrigger>
              <TabsTrigger value="missing">Missing</TabsTrigger>
              <TabsTrigger value="soon">Use soon</TabsTrigger>
            </TabsList>
            <TabsContent value="have" className="pt-5 text-ink">
              Rice, chickpeas, lemons and a very patient bunch of parsley.
            </TabsContent>
            <TabsContent value="missing" className="pt-5 text-ink">
              Garlic, plain yoghurt and something green.
            </TabsContent>
            <TabsContent value="soon" className="pt-5 text-ink">
              Spinach, by Thursday.
            </TabsContent>
          </Tabs>
        </Section>

        <Section id="dialog" title="Dialog" note="Focus is trapped, Escape closes it, and focus returns to the trigger.">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent title="Remove this ingredient?" description="It will disappear from your kitchen and from any recipe matches.">
              <div className="flex flex-wrap justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="ghost">Keep it</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Remove</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </Section>

        <Section id="empty" title="Empty state" note="An illustration, a short title, one line of help and an action.">
          <Card tone="paper" className="p-6">
            <EmptyState
              illustration={<Doodle name="lemon" className="size-16 text-coral-deep" />}
              title="Nothing in the kitchen yet"
              titleAs="h3"
              body="Add what you have and we will find something to cook."
              action={
                <Button size="sm">
                  <Search className="size-4" aria-hidden="true" />
                  Add ingredients
                </Button>
              }
            />
          </Card>
        </Section>

        <Section id="skeletons" title="Skeletons" note="Quiet pulsing paper shapes that hold the layout while data loads.">
          <Card className="grid gap-4 p-6 sm:grid-cols-[8rem_1fr]">
            <Skeleton className="h-28 w-full sm:w-32" />
            <div className="grid content-start gap-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </Card>
        </Section>

        <Section id="brand" title="Brand" note="Logo, wave dividers, arched photography, blobs and hand-drawn doodles.">
          <div className="grid gap-10">
            <Specimen caption="Logo, default and light">
              <div className="flex flex-wrap gap-4">
                <div className="rounded-card border border-line bg-card p-6">
                  <Logo />
                </div>
                <div className="rounded-card bg-sage-deep p-6">
                  <Logo tone="light" />
                </div>
              </div>
            </Specimen>

            <Specimen caption="Wave dividers, variants 1 to 4">
              <div className="overflow-hidden rounded-card border border-line">
                {([1, 2, 3, 4] as const).map((v) => (
                  <div key={v} className="bg-cream">
                    <WaveDivider variant={v} from="fill-cream" to="bg-sage" />
                    <p className="bg-sage px-4 py-3 text-sm font-medium text-sage-ink">Variant {v}</p>
                  </div>
                ))}
              </div>
            </Specimen>

            <div className="grid gap-8 sm:grid-cols-2">
              <Specimen caption="Arch image">
                <ArchImage src={PHOTO} alt="A bowl of colourful vegetables on a table" sizes="(min-width: 640px) 40vw, 90vw" className="mx-auto h-72 w-56" />
              </Specimen>
              <Specimen caption="Blobs: sage, blush, butter, coral">
                <div className="grid grid-cols-4 gap-2">
                  <Blob tone="sage" shape={1} className="w-full" />
                  <Blob tone="blush" shape={2} className="w-full" />
                  <Blob tone="butter" shape={3} className="w-full" />
                  <Blob tone="coral" shape={1} className="w-full" />
                </div>
              </Specimen>
            </div>

            <Specimen caption="Doodles">
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
                {DOODLES.map((name) => (
                  <li key={name} className="flex flex-col items-center gap-2 rounded-card border border-line bg-card px-3 py-5">
                    <Doodle name={name} className="size-12 text-coral-deep" />
                    <span className="font-mono text-xs text-muted">{name}</span>
                  </li>
                ))}
              </ul>
            </Specimen>

            <Specimen caption="Script note">
              <ScriptNote arrow="down-right">a little hand-lettered aside</ScriptNote>
            </Specimen>
          </div>
        </Section>
      </main>
    </div>
  );
}
