import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line bg-card px-4 text-[0.95rem] text-ink placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-150 hover:border-sage/60 " +
  "focus-visible:border-coral-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep " +
  "disabled:cursor-not-allowed disabled:bg-paper disabled:text-muted " +
  "aria-invalid:border-coral-deep";

type Shared = { label: ReactNode; name: string; error?: string; hint?: string; id?: string };

function describe(name: string, error?: string, hint?: string, extra?: string) {
  const ids = [error && `${name}-error`, hint && `${name}-hint`, extra].filter(Boolean).join(" ");
  return ids || undefined;
}

function FieldShell({
  id,
  name,
  label,
  error,
  hint,
  className,
  children,
}: Shared & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-sage-deep">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="text-xs font-medium text-coral-deep">
          {error}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = Shared & Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function TextField({ label, name, error, hint, id, className, "aria-describedby": describedBy, ...rest }: TextFieldProps) {
  const fieldId = id ?? name;
  return (
    <FieldShell id={fieldId} name={name} label={label} error={error} hint={hint} className={className}>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(name, error, hint, describedBy)}
        className={cn(control, "h-11")}
        {...rest}
      />
    </FieldShell>
  );
}

export type SelectFieldProps = Shared &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & { options: { value: string; label: string }[] };

export function SelectField({ label, name, error, hint, id, options, className, "aria-describedby": describedBy, ...rest }: SelectFieldProps) {
  const fieldId = id ?? name;
  return (
    <FieldShell id={fieldId} name={name} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(name, error, hint, describedBy)}
          className={cn(control, "h-11 appearance-none pr-10")}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-sage-deep"
        />
      </div>
    </FieldShell>
  );
}

export type TextAreaFieldProps = Shared & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name">;

export function TextAreaField({ label, name, error, hint, id, className, rows = 4, "aria-describedby": describedBy, ...rest }: TextAreaFieldProps) {
  const fieldId = id ?? name;
  return (
    <FieldShell id={fieldId} name={name} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(name, error, hint, describedBy)}
        className={cn(control, "min-h-24 resize-y py-3 leading-relaxed")}
        {...rest}
      />
    </FieldShell>
  );
}
