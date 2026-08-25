import Link from "next/link";

/**
 * Server-rendered sale page hero — always emits one H1 for crawlers.
 */
export function SalePageChrome() {
  return (
    <section
      className="relative overflow-hidden py-8 md:py-28"
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
        <nav className="mb-3 text-[10px] tracking-widest text-white/50 uppercase md:mb-6 md:text-xs">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <span className="mx-2 text-white/30">/</span>
          <span className="text-white/80">Sale</span>
        </nav>
        <span className="mb-2 inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-red-400 uppercase md:mb-4 md:px-4 md:py-1.5 md:text-[11px] md:tracking-[0.2em]">
          Limited Time Offers
        </span>
        <h1 className="font-display text-2xl text-white uppercase md:text-8xl">Sale</h1>
        <p className="mt-2 max-w-xl text-sm text-white/60 md:mt-4 md:text-lg">
          Discover up to 50% off premium car accessories, from everyday basics to statement designs.
        </p>
      </div>
    </section>
  );
}
