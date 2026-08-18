import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { categoryHref } from "@/lib/categories";
import { loadStoreCategoriesTree } from "@/lib/storeCategoryData";
import { ROBOTS_NOINDEX_FOLLOW } from "@/lib/seo/robotsMeta";

export const metadata = {
  title: "Page not found",
  description: "This page does not exist on CrazzyCars.pk.",
  robots: ROBOTS_NOINDEX_FOLLOW,
  alternates: { canonical: null },
};

function pickPopularCategories(tree, limit = 8) {
  const flat = [];
  for (const root of tree || []) {
    flat.push(root);
    for (const child of root.children || []) flat.push(child);
  }
  return flat
    .filter((c) => Number(c.productCount || 0) > 0 && c.slug)
    .sort((a, b) => Number(b.productCount || 0) - Number(a.productCount || 0))
    .slice(0, limit);
}

function whatsappUrl() {
  const digits = String(
    process.env.NEXT_PUBLIC_WHATSAPP ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
      "923284010007"
  ).replace(/\D/g, "");
  const text = encodeURIComponent(
    "Hi CrazzyCars.pk — I landed on a missing page. Can you help me find the right product?"
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export default async function NotFound() {
  let popular = [];
  try {
    await dbConnect();
    const tree = await loadStoreCategoriesTree(true);
    popular = pickPopularCategories(tree);
  } catch (e) {
    console.error("404 categories load error:", e?.message || e);
  }

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-700">404</p>
      <h1 className="mt-3 text-4xl font-bold">This page has driven away.</h1>
      <p className="mt-4 text-gray-600">
        This URL is not on CrazzyCars.pk. Search for the product or category you need — we do not
        send missing pages to the homepage.
      </p>

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

      {popular.length > 0 ? (
        <div className="mt-10 w-full max-w-lg text-left">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Popular categories
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {popular.map((cat) => (
              <li key={cat._id || cat.slug}>
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
          href={whatsappUrl()}
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
