"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealTag = "div" | "section" | "article" | "li" | "ul" | "p" | "span" | "header" | "footer" | "figure";

export type RevealProps = {
  children: ReactNode;
  /** Seconds before the fade starts, for staggering siblings. */
  delay?: number;
  /** Starting offset in px. */
  y?: number;
  as?: RevealTag;
  className?: string;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function Reveal({ children, delay = 0, y = 14, as = "div", className }: RevealProps) {
  const reduced = useReducedMotion();

  // The server can't know the user's preference, so it renders the motion version
  // (inline opacity 0). data-reveal lets globals.css force it visible under reduced
  // motion, and suppressHydrationWarning covers the expected style mismatch.
  if (reduced) {
    const Tag = as;
    return (
      <Tag className={className} data-reveal="" suppressHydrationWarning>
        {children}
      </Tag>
    );
  }

  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      data-reveal=""
      suppressHydrationWarning
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay }}
    >
      {children}
    </MotionTag>
  );
}
