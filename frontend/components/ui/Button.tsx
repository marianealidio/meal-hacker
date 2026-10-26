import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, Ref } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill font-body font-medium " +
  "transition-[background-color,color,box-shadow,translate] duration-200 ease-out active:translate-y-px " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep " +
  "disabled:cursor-not-allowed disabled:active:translate-y-0 [&:disabled:not([aria-busy=true])]:opacity-55 aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-coral text-ink shadow-soft hover:brightness-95 hover:shadow-lift",
  secondary: "border-[1.5px] border-sage-deep bg-transparent text-sage-deep hover:bg-sage-deep/5",
  ghost: "bg-transparent text-sage-deep hover:bg-paper",
  dark: "bg-sage-deep text-cream shadow-soft hover:bg-sage-ink hover:shadow-lift",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 text-sm",
  md: "min-h-11 px-6 text-[0.95rem]",
  lg: "min-h-13 px-8 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

function Spinner() {
  return (
    <svg className="size-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  asChild?: false;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant,
  size,
  pending = false,
  asChild: _asChild,
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  void _asChild;
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || pending}
      aria-busy={pending ? "true" : undefined}
      {...rest}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}

export type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={cn(buttonClasses({ variant, size }), "no-underline", className)} {...rest} />;
}
