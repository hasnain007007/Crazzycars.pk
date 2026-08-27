import Link from "next/link";
import { categoryHref } from "@/lib/categories";
import { FAST_404_CATEGORIES } from "@/lib/missingProductHelpers";
import { ServerProductCard } from "@/components/store/ServerProductCard";

function whatsappUrl(message) {
  const digits = String(
    process.env.NEXT_PUBLIC_WHATSAPP ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      "923284010007"
  ).replace(/\D/g, "");
  const text = encodeURIComponent(
    message ||
      "Hi CrazzyCars.pk — I landed on a missing page. Can you help me find the right product?"
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Shared empty/discontinued landing — no extra Mongo on the generic 404 path.
 * `kind`: "missing" | "unavailable"
 */
export function MissingProductView({
  kind = "missing",
  heading,
  productName,
  suggestions = [],
  categories = FAST_404_CATEGORIES,
}) {
  const unavailable = kind === "unavailable";
  const title =
    heading ||
    (unavailable ? "This product is no longer available." : "This page has driven away.");
  const blurb = unavailable
    ? suggestions.length
      ? `${productName || "This item"} is not in the live catalog. Here are current products that match this vehicle.`
      : `${productName || "This item"} is not in the live catalog. Search below or browse a category — we will not guess a random replacement.`
    : suggestions.length
      ? "This URL is not on CrazzyCars.pk. These look like a close match — we did not send you to a random product."
      : "This URL is not on CrazzyCars.pk. Search for the product or category you need — we do not send missing pages to the homepage.";

  const wa = unavailable
    ? whatsappUrl(
        `Hi CrazzyCars.pk — I landed on a discontinued product${
          productName ? ` (${productName})` : ""
        }. Can you suggest a replacement?`
      )
    : whatsappUrl();

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-5xl flex-col items-center px-4 py-10 text-center md:px-6 md:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-700">
        {unavailable ? "Unavailable" : "404"}
      </p>
      <h1 className="mt-2 max-w-3xl text-2xl font-bold md:mt-3 md:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-gray-600">{blurb}</p>

      <form action="/shop" method="get" className="mt-8 flex w-full max-w-md gap-2">
        <input
          type="search"
          name="q"
          placeholder="Search accessories"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-left"
          aria-label="Search accessories"
        />
        <button type="submit" className="rounded bg-red-700 px-4 py-2 font-semibold text-white">
          Search
        </button>
      </form>

      {suggestions.length > 0 ? (
        <div className="mt-10 w-full text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {unavailable ? "You might like these instead" : "You might be looking for"}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((p) => (
              <li key={p.id || p.slug}>
                <ServerProductCard product={p} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div className="mt-10 w-full max-w-lg text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Popular categories
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={categoryHref(cat.slug)}
                  className="block rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-red-700 hover:text-red-700"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/shop" className="text-sm font-semibold text-red-700 underline">
          Browse the shop
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
