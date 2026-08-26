"use client";

function whatsappUrl() {
  const digits = String(
    process.env.NEXT_PUBLIC_WHATSAPP ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      "923284010007"
  ).replace(/\D/g, "");
  const text = encodeURIComponent(
    "Hi Crazzycars.pk — a page failed to load and I still want to place an order."
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/** Shop-first recovery when a route throws. Never leave the customer on a dead end. */
export function StoreErrorFallback({ reset }) {
  return (
    <section className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-4 py-10 text-center md:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-700">Temporary error</p>
      <h1 className="mt-2 text-2xl font-bold md:mt-3 md:text-4xl">This page hit a snag.</h1>
      <p className="mt-4 text-gray-600">
        Your cart is safe. Reload this page, keep shopping, or message us on WhatsApp to finish the
        order.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {typeof reset === "function" ? (
          <button
            type="button"
            onClick={() => reset()}
            className="rounded bg-red-700 px-4 py-2 font-semibold text-white"
          >
            Try again
          </button>
        ) : null}
        <a href="/shop" className="rounded border border-zinc-300 px-4 py-2 font-semibold text-zinc-800">
          Browse the shop
        </a>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
