import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ArchImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /**
   * Size the frame here. The wrapper defaults to `aspect-[4/5]` unless this contains
   * a height (`h-*`, `min-h-*`, `size-*`) or `aspect-*` class, because `next/image`
   * with `fill` needs a sized parent.
   */
  className?: string;
  shape?: "arch" | "soft";
  /** Decoration (a Blob, ring or Doodle) positioned absolutely around the frame; it is not clipped. */
  children?: ReactNode;
};

const SIZED = /(^|\s)(?:[a-z0-9-]+:)*(?:h-|min-h-|size-|aspect-)/;

export function ArchImage({ src, alt, sizes, priority, className, shape = "arch", children }: ArchImageProps) {
  return (
    <div className={cn("relative isolate", !SIZED.test(className ?? "") && "aspect-[4/5]", className)}>
      {children}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden bg-paper shadow-soft",
          shape === "arch" ? "rounded-arch" : "rounded-[28px]",
        )}
      >
        <Image src={src} alt={alt} sizes={sizes} priority={priority} fill className="object-cover" />
        {/* a hairline inner edge so light photos don't bleed into cream */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 ring-1 ring-inset ring-sage-ink/10",
            shape === "arch" ? "rounded-arch" : "rounded-[28px]",
          )}
        />
      </div>
    </div>
  );
}
