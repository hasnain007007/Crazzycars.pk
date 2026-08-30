import Image from "next/image";
import Link from "next/link";
import { dbConnect } from "@/lib/db";
import { isAllowedNextImageSrc } from "@/lib/productCardShape";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getSiteUrl } from "@/lib/siteUrl";
import { loadShopByCarIndex } from "@/lib/vehiclePageData";

// Runtime fetch — avoid build-time Atlas IP whitelist failures on Vercel/Coolify.
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Shop by Car | Homefy.pk",
  description:
    "Browse car accessories by make and model — Honda Civic, Toyota Corolla, Suzuki Alto, and more. Fitment-first parts with Cash on Delivery across Pakistan.",
  path: "/cars",
  absoluteTitle: true,
});

function yearLabel(v) {
  const from = v.yearFrom;
  const to = v.yearTo;
  if (!from) return "";
  if (to == null || Number(to) >= new Date().getFullYear()) return `${from}–Present`;
  return `${from}–${to}`;
}

export default async function CarsIndexPage() {
  await dbConnect();
  const vehicles = await loadShopByCarIndex();
  const byMake = new Map();
  for (const v of vehicles) {
    const make = v.make || "Other";
    if (!byMake.has(make)) byMake.set(make, []);
    byMake.get(make).push(v);
  }
  const groups = [...byMake.entries()];

  const site = getSiteUrl();
  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Shop by Car", url: "/cars" },
  ]);
  const listLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shop by Car",
    url: `${site}/cars`,
    description: "Car accessories by make and model in Pakistan.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: vehicles.length,
      itemListElement: vehicles.slice(0, 80).map((v, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${site}/cars/${v.slug}`,
        name: v.displayName,
      })),
    },
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />

      <div
        className="cat-index-chrome"
        style={{
          background: "linear-gradient(180deg, #F8F8F8, #FFFFFF)",
          padding: "16px 16px",
          borderBottom: "1px solid #E5E5E5",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <h1
            className="font-heading text-xl font-extrabold uppercase md:text-[32px]"
            style={{ margin: 0, color: "#111111" }}
          >
            Shop by Car
          </h1>
          <p className="mt-1 text-sm text-[#555555]">
            Home / Shop by Car · {vehicles.length} models
          </p>
        </div>
      </div>

      <div className="store-container mx-auto max-w-7xl px-4 py-6 md:py-10">
        {groups.length === 0 ? (
          <p className="text-sm text-[#6B7280]">
            Vehicle pages will appear here once products are assigned in admin.{" "}
            <Link href="/shop" className="font-semibold text-[var(--color-primary)] hover:underline">
              Browse the shop →
            </Link>
          </p>
        ) : (
          groups.map(([make, list]) => (
            <section key={make} className="mb-8 md:mb-10">
              <h2 className="font-heading mb-3 text-lg font-bold text-[#111111] md:text-xl">{make}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
                {list.map((v) => (
                  <Link
                    key={v.slug}
                    href={`/cars/${v.slug}`}
                    className="group overflow-hidden rounded-xl border border-[#E8E8E8] bg-white transition hover:border-[var(--color-primary)]/45 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F4F6] md:aspect-square">
                      {v.image ? (
                        isAllowedNextImageSrc(v.image) ? (
                          <Image
                            src={v.image}
                            alt={v.displayName}
                            fill
                            className="object-contain object-center p-2 transition duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 46vw, 20vw"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.image}
                            alt={v.displayName}
                            className="h-full w-full object-contain object-center p-2"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl text-[#9CA3AF]">🚗</div>
                      )}
                    </div>
                    <div className="px-2 py-2 md:px-2.5">
                      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                        {v.make}
                      </p>
                      <p className="font-heading truncate text-[13px] font-bold leading-tight text-[#111111]">
                        {v.nickname || v.generation || v.model}
                      </p>
                      {yearLabel(v) ? (
                        <p className="mt-0.5 truncate text-[10px] text-[#6B7280]">{yearLabel(v)}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
