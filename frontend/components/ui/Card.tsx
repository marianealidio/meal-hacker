import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: "card" | "paper";
  className?: string;
  children?: ReactNode;
};

export function Card({ as: Tag = "div", tone = "card", className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-line shadow-soft",
        tone === "paper" ? "bg-paper" : "bg-card",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
