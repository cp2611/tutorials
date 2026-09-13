export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="card mx-auto max-w-3xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
      {updated && <p className="mt-1 text-sm text-ink-500">Last updated {updated}</p>}
      <div className="mt-6 grid gap-5 text-sm leading-relaxed text-ink-700 [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink-900 [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
      <p className="mt-8 rounded-xl bg-ink-100 px-4 py-3 text-xs leading-relaxed text-ink-600">
        This is a starting template, not legal advice. Have a lawyer review it before you take real
        bookings — and a chartered accountant review your GST position on aggregator commission.
      </p>
    </article>
  );
}
