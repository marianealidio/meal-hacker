import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Doodle } from "./Doodle";

export type ScriptNoteProps = {
  children: ReactNode;
  className?: string;
  arrow?: "down-right" | "down-left" | "none";
};

/** A handwritten aside in Caveat. Use at most one per section. */
export function ScriptNote({ children, className, arrow = "none" }: ScriptNoteProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-col font-script text-[1.6rem] leading-[1.05] text-coral-deep",
        arrow === "down-left" ? "items-start" : "items-end",
        className,
      )}
    >
      <span className={arrow === "down-left" ? "rotate-2" : "-rotate-2"}>{children}</span>
      {arrow !== "none" && (
        <Doodle
          name="arrow"
          className={cn(
            "-mt-1 size-11",
            arrow === "down-right" ? "mr-[-0.75rem]" : "ml-[-0.75rem] -scale-x-100",
          )}
        />
      )}
    </span>
  );
}
