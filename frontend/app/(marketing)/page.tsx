import type { Metadata } from "next";
import { WaveDivider } from "@/components/brand/WaveDivider";
import { Reveal } from "@/components/brand/Reveal";
import { AboutProject } from "@/components/marketing/AboutProject";
import { Bento } from "@/components/marketing/Bento";
import { CtaBand } from "@/components/marketing/CtaBand";
import { FeatureRow, type FeatureRowProps } from "@/components/marketing/FeatureRow";
import { HERO_SUB, Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import {
  MiniAssistantPreview,
  MiniKitchenPreview,
  MiniMealCardPreview,
  MiniPlannerPreview,
  MiniShoppingPreview,
} from "@/components/marketing/MiniPreviews";
import { ProblemBand } from "@/components/marketing/ProblemBand";

const TITLE = "Cook what you have, waste nothing";

export const metadata: Metadata = {
  title: TITLE,
  description: HERO_SUB,
  openGraph: { title: TITLE, description: HERO_SUB, type: "website" },
};

type Feature = Omit<FeatureRowProps, "index" | "total" | "reverse">;

const FEATURES: Feature[] = [
  {
    kicker: "know what you've got",
    title: "Your kitchen, at a glance",
    body: "Fridge, pantry and freezer in one place, sorted by what expires first. Colour-coded countdowns tell you what to use tonight.",
    bullets: ["Quick-add in plain English", "Expiry countdowns", "Mark items as used"],
    visual: <MiniKitchenPreview />,
    visualLabel: "Preview of the kitchen: spinach expires today, Greek yoghurt in 2 days, red peppers in 6 days.",
    tone: "sage",
    shape: 1,
  },
  {
    kicker: "no more 'what's for dinner?'",
    title: "Recipes that fit your fridge",
    body: "Every suggestion shows what you already have and what's missing, with a short description and cook time.",
    bullets: ["Ranked by expiring items", "Diet and allergy aware", "Save favourites"],
    visual: <MiniMealCardPreview />,
    visualLabel: "Preview of a recipe card: pasta with garlic, scallions and cauliflower, 30 minutes, uses 5 of your ingredients, 2 missing.",
    tone: "blush",
    shape: 2,
  },
  {
    kicker: "breakfast, lunch and dinner",
    title: "A week that plans itself",
    body: "Drag meals into your week and move them around. Missing ingredients go straight onto your list.",
    bullets: ["Drag and drop meals", "Three slots a day", "Missing items listed for you"],
    visual: <MiniPlannerPreview />,
    visualLabel: "Preview of the week planner: seven days with breakfast, lunch and dinner slots and a few meals planned.",
    tone: "butter",
    shape: 3,
  },
  {
    kicker: "tick, done, stored",
    title: "A shopping list that shops back",
    body: "Tick items off as you shop, then move them into your kitchen with one tap.",
    bullets: ["Grouped by aisle", "Tick off as you go", "One tap to your kitchen"],
    visual: <MiniShoppingPreview />,
    visualLabel: "Preview of the shopping list grouped by aisle, with lemons ticked off and moved to the kitchen.",
    tone: "sage",
    shape: 2,
  },
  {
    kicker: "ask me anything",
    title: "A kitchen assistant on call",
    body: "Ask what to do with half a lemon or how long rice keeps. It knows what's in your kitchen.",
    bullets: ["Knows your kitchen", "Storage and swap tips", "Plain, quick answers"],
    visual: <MiniAssistantPreview />,
    visualLabel: "Preview of the assistant answering what to do with half a lemon.",
    tone: "coral",
    shape: 1,
  },
];

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 overflow-x-clip bg-cream">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="features-title" className="text-display-lg">
            Everything your kitchen needs
          </h2>
        </Reveal>
        <div className="mt-16 flex flex-col gap-24 md:mt-24 md:gap-32">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.title} {...f} index={i + 1} total={FEATURES.length} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <WaveDivider variant={1} from="fill-cream" to="bg-sage" />
      <ProblemBand />
      <WaveDivider variant={2} from="fill-sage" to="bg-paper" />
      <HowItWorks />
      <WaveDivider variant={3} from="fill-paper" to="bg-cream" />
      <Features />
      <Bento />
      <WaveDivider variant={2} from="fill-cream" to="bg-paper" flip />
      <AboutProject />
      <WaveDivider variant={3} from="fill-paper" to="bg-sage-deep" flip />
      <CtaBand />
    </>
  );
}
