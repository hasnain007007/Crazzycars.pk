export default function FeaturedVideoSection() {
  return (
    <section className="bg-[#F8F8F8] py-10 md:py-14">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <h2 className="font-heading mb-6 text-2xl font-bold text-[#1A1A1A] md:text-3xl">See Our Products in Action</h2>
        <div
          className="flex aspect-video w-full items-center justify-center rounded-xl text-white"
          style={{
            background: "linear-gradient(135deg, #1A1A1A 0%, #2D0000 50%, #1A1A1A 100%)",
          }}
        >
          <div className="text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl">▶</span>
            <p className="mt-4 text-sm font-semibold text-white/80">Video showcase coming soon</p>
            <p className="mt-1 text-xs text-white/50">Installations, reviews &amp; product demos</p>
          </div>
        </div>
      </div>
    </section>
  );
}
