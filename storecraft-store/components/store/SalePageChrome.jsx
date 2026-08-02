import Link from "next/link";

/**
 * Server-rendered sale page hero — always emits one H1 for crawlers.
 */
export function SalePageChrome() {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-28"
      style={{
        background: "linear-gradient(135deg, #1a0505 0%, #2a0707 50%, #0a0a0a 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-50 blur-[140px]"
        style={{ background: "rgba(220,38,38,0.25)" }}
      />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <nav className="mb-6 text-xs tracking-widest text-white/50 uppercase">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Sale</span>
        </nav>
        <span className="mb-4 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.2em] text-red-400 uppercase">
          Limited Time Offers
        </span>
        <h1 className="font-display text-6xl text-white uppercase md:text-8xl">Sale</h1>
        <p className="mt-4 max-w-xl text-base text-white/60 md:text-lg">
          Discover up to 50% off premium car accessories, from everyday basics to statement designs.
        </p>
      </div>
    </section>
  );
}
