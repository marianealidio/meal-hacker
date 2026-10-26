export function Steps({ steps, sourceUrl }: { steps: string[]; sourceUrl: string }) {
  return (
    <section aria-labelledby="method-heading">
      <h2 id="method-heading" className="text-display-md text-sage-deep">Method</h2>
      {steps.length === 0 ? (
        <p className="mt-4 text-[0.95rem] text-muted">
          No method was provided for this one.
          {sourceUrl && (
            <>
              {" "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-coral-deep underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-deep"
              >
                View the original recipe ↗
              </a>
            </>
          )}
        </p>
      ) : (
        <ol className="mt-5 flex flex-col gap-6">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-coral font-display text-lg font-semibold text-ink"
              >
                {i + 1}
              </span>
              <p className="pt-1.5 text-[1.05rem] leading-relaxed text-ink">{s}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
