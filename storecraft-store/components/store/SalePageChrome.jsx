import Link from "next/link";

/**
 * Server-rendered sale page hero — Homefy cream/terracotta, not the car-store red panel.
 */
export function SalePageChrome() {
  return (
    <section
      className="relative overflow-hidden py-8 md:py-16"
      style={{
        background: "linear-gradient(180deg, #FAF7F2 0%, #F5EBE3 100%)",
        borderBottom: "1px solid #E8D9CC",
      }}
    >
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <nav className="mb-3 text-[10px] tracking-widest text-[#6B7280] uppercase md:mb-6 md:text-xs">
          <Link href="/" className="hover:text-[#111]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#111]">Sale</span>
        </nav>
        <span
          className="mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase md:mb-4 md:px-4 md:py-1.5 md:text-[11px]"
          style={{ background: "#C6633B", color: "#fff" }}
        >
          On sale now
        </span>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-[#111] md:text-5xl">
          Sale
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#6B7280] md:mt-4 md:text-lg">
          Marked-down kitchen pieces and bags — cookware, pouches, totes and clutches — while stock lasts.
        </p>
      </div>
    </section>
  );
}
