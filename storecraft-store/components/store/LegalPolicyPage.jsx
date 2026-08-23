import Link from "next/link";

export function LegalPolicyPage({ title, intro, sections = [] }) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Home
        </Link>
        <span className="px-2">/</span>
        <span>{title}</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>
      {intro ? <p className="mt-4 text-zinc-600 leading-relaxed">{intro}</p> : null}
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-zinc-900">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-2 text-zinc-700 leading-relaxed">
                {p}
              </p>
            ))}
            {section.list?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-700">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-zinc-500">
        Questions?{" "}
        <Link href="/contact" className="font-semibold text-[var(--brand-primary,#b91c1c)]">
          Contact us
        </Link>{" "}
        or message WhatsApp.
      </p>
    </article>
  );
}
