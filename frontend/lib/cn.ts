import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our custom theme so e.g. `text-display-md` is a font size, not a colour clashing with `text-sage-deep`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display-xl", "display-lg", "display-md", "title"],
      shadow: ["soft", "lift"],
      radius: ["card", "pill", "arch"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
