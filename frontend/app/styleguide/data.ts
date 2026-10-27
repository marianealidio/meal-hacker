import type { DoodleName } from "@/components/brand/Doodle";

export type Swatch = { name: string; hex: string; bg: string; text: string; textName: string; role: string };

export const SWATCHES: Swatch[] = [
  { name: "cream", hex: "#FBF6EE", bg: "bg-cream", text: "text-ink", textName: "ink", role: "Page background" },
  { name: "paper", hex: "#F3EBDD", bg: "bg-paper", text: "text-ink", textName: "ink", role: "Alt sections, cards" },
  { name: "card", hex: "#FFFDF8", bg: "bg-card", text: "text-ink", textName: "ink", role: "Raised cards" },
  { name: "sage", hex: "#8FA98B", bg: "bg-sage", text: "text-sage-ink", textName: "sage-ink", role: "Wave sections, chips" },
  { name: "sage-deep", hex: "#34503F", bg: "bg-sage-deep", text: "text-cream", textName: "cream", role: "Headings, sidebar, footer" },
  { name: "sage-ink", hex: "#1F3328", bg: "bg-sage-ink", text: "text-cream", textName: "cream", role: "Text on sage" },
  { name: "sage-tint", hex: "#DFE8DC", bg: "bg-sage-tint", text: "text-sage-deep", textName: "sage-deep", role: "“Have” chips" },
  { name: "coral", hex: "#E8836B", bg: "bg-coral", text: "text-ink", textName: "ink", role: "Primary buttons" },
  { name: "coral-deep", hex: "#A3472F", bg: "bg-coral-deep", text: "text-cream", textName: "cream", role: "Coral text, accents" },
  { name: "coral-tint", hex: "#F7DDD5", bg: "bg-coral-tint", text: "text-coral-tint-ink", textName: "coral-tint-ink", role: "“Missing” chips" },
  { name: "blush", hex: "#F4C9C0", bg: "bg-blush", text: "text-ink", textName: "ink", role: "Avatars, accents" },
  { name: "butter", hex: "#F2D08A", bg: "bg-butter", text: "text-ink", textName: "ink", role: "Stars, “soon” bars" },
  { name: "ink", hex: "#2A2A26", bg: "bg-ink", text: "text-cream", textName: "cream", role: "Body text" },
  { name: "muted", hex: "#5C5C55", bg: "bg-muted", text: "text-cream", textName: "cream", role: "Secondary text" },
  { name: "line", hex: "#E6DCCB", bg: "bg-line", text: "text-ink", textName: "ink", role: "Hairlines" },
];

export const TYPE_SCALE = [
  { token: "display-xl", cls: "font-display text-display-xl text-sage-deep", spec: "Fraunces, fluid 2.6 to 5rem", sample: "Fridge to feast" },
  { token: "display-lg", cls: "font-display text-display-lg text-sage-deep", spec: "Fraunces, fluid 2 to 3.4rem", sample: "Cook what you have" },
  { token: "display-md", cls: "font-display text-display-md text-sage-deep", spec: "Fraunces, fluid 1.5 to 2.1rem", sample: "Three dinners, one shop" },
  { token: "title", cls: "font-body text-title font-bold text-sage-deep", spec: "DM Sans bold, fluid 1.15 to 1.35rem", sample: "Lemon chickpea skillet" },
  { token: "body", cls: "font-body text-base text-ink", spec: "DM Sans, 1rem", sample: "Tell us what is in the fridge and we will work out dinner." },
  { token: "small", cls: "font-body text-sm text-muted", spec: "DM Sans, 0.875rem", sample: "Ready in 25 minutes. Uses 6 of your ingredients." },
  { token: "script", cls: "font-script text-3xl font-medium text-coral-deep", spec: "Caveat 500, accents only", sample: "that's the one!" },
];

export const DOODLES: DoodleName[] = ["leaf", "sprig", "sparkle", "whisk", "lemon", "heart", "arrow", "dashed-path"];
