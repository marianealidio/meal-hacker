import type { Metadata } from "next";
import { Caveat, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["400", "500", "700"], display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Meal Hacker — cook what you have", template: "%s · Meal Hacker" },
  description: "Turn the ingredients already in your kitchen into recipes, a week plan and a shopping list, before anything goes off.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${dmSans.variable} ${caveat.variable}`}>
      <body className="min-h-dvh bg-cream font-body text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
