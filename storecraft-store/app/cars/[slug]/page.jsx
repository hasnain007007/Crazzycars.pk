import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/db";
import {
  loadProductsForVehicle,
  loadVehicleBySlug,
  serializeVehicleProduct,
} from "@/lib/vehiclePageData";
import { getSiteUrl } from "@/lib/siteUrl";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { formatPrice } from "@/lib/currency";

export const revalidate = 300;

const BASE_URL = getSiteUrl();
const BRAND = process.env.NEXT_PUBLIC_STORE_NAME || process.env.NEXT_PUBLIC_APP_NAME || "CrazzyCars.pk";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  try {
    await dbConnect();
    const vehicle = await loadVehicleBySlug(slugStr);
    if (!vehicle) return { title: "Vehicle Not Found", robots: { index: false, follow: false } };

    const title = (vehicle.metaTitle || "").trim() || `${vehicle.displayName} Accessories | ${BRAND}`;
    const description =
      (vehicle.metaDescription || "").trim() ||
      `Shop ${vehicle.displayName} accessories in Pakistan — body kits, LED lights & more. Cash on Delivery.`;

    return {
      title,
      description,
      alternates: { canonical: `${BASE_URL}/cars/${vehicle.slug}` },
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/cars/${vehicle.slug}`,
        images: vehicle.image ? [{ url: vehicle.image, alt: vehicle.displayName }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: vehicle.image ? [vehicle.image] : [],
      },
    };
  } catch {
    return { title: "Car Accessories" };
  }
}

export default async function VehicleSlugPage({ params }) {
  const { slug } = await params;
  const slugStr = String(slug || "").trim();
  if (!slugStr) notFound();

  await dbConnect();
  const vehicle = await loadVehicleBySlug(slugStr);
  if (!vehicle) notFound();

  const rawProducts = await loadProductsForVehicle(vehicle._id);
  const products = rawProducts.map(serializeVehicleProduct);

  const yearLabel =
    vehicle.yearTo == null
      ? `${vehicle.yearFrom}–Present`
      : `${vehicle.yearFrom}–${vehicle.yearTo}`;

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Shop by Car", url: "/#shop-by-car" },
    { name: vehicle.displayName, url: `/cars/${vehicle.slug}` },
  ];
  const breadcrumbLd = breadcrumbJsonLd(crumbs);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", color: "#111111" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section className="border-b border-[#E5E7EB] bg-gradient-to-b from-[#111111] to-[#1a1a1a]">
        <div className="store-container grid gap-8 py-10 md:grid-cols-2 md:items-center md:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#C41E1E]">
              {vehicle.make} · {yearLabel}
            </p>
            <h1 className="font-heading mt-2 text-3xl font-bold text-white md:text-4xl">
              {vehicle.displayName} Accessories &amp; Body Kits
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
              {(vehicle.metaDescription || "").trim() ||
                `Browse premium accessories for your ${vehicle.displayName}. Fitment-matched parts plus universal upgrades — Cash on Delivery nationwide from ${BRAND}.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a81818]"
              >
                Shop all accessories
              </Link>
              <Link
                href="/categories"
                className="rounded-lg border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Browse categories
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-[16/10] w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#222]">
            {vehicle.image ? (
              <Image
                src={vehicle.image}
                alt={`${vehicle.displayName} accessories in Pakistan`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl text-white/40">🚗</div>
            )}
          </div>
        </div>
      </section>

      <section className="store-container py-10 md:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#111111]">Compatible products</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {products.length
                ? `${products.length} product${products.length === 1 ? "" : "s"} for this vehicle (includes universal fit)`
                : "No linked products yet — universal and fitment products will appear here."}
            </p>
          </div>
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="group overflow-hidden rounded-xl border border-[#E5E7EB] bg-white transition hover:border-[#C41E1E] hover:shadow-md"
              >
                <div className="relative aspect-square bg-[#F3F4F6]">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover transition group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : null}
                  {p.isUniversal ? (
                    <span className="absolute left-2 top-2 rounded bg-[#111111]/85 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Universal
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-[#111111]">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-[#C41E1E]">{formatPrice(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-6 py-12 text-center">
            <p className="text-sm text-[#6B7280]">
              Products for this car will show once assigned via <code>compatibleVehicles</code> or marked{" "}
              <code>isUniversal</code>.
            </p>
            <Link href="/shop" className="mt-4 inline-block text-sm font-bold text-[#C41E1E] hover:underline">
              Browse the shop →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
