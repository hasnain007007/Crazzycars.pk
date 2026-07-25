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
    vehicle.yearTo == null || Number(vehicle.yearTo) >= new Date().getFullYear()
      ? `${vehicle.yearFrom}–Present`
      : `${vehicle.yearFrom}–${vehicle.yearTo}`;

  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Shop by Car", url: "/#shop-by-car" },
    { name: vehicle.displayName, url: `/cars/${vehicle.slug}` },
  ];
  const breadcrumbLd = breadcrumbJsonLd(crumbs);

  const heroDesc =
    (vehicle.metaDescription || "").trim() ||
    `Upgrade your ${vehicle.displayName} with premium accessories in Pakistan — body kits, LED lights, interior styling & carbon fiber. Cash on Delivery nationwide.`;

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <section
        className="vehicle-page-hero"
        style={{
          background: "linear-gradient(135deg, #141414 0%, #1f1f1f 55%, #2a1515 100%)",
          borderBottom: "1px solid #2a2a2a",
        }}
      >
        <div
          className="store-container"
          style={{
            display: "grid",
            gap: 24,
            alignItems: "center",
            padding: "28px 16px 32px",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 24,
              alignItems: "center",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            }}
            className="vehicle-hero-grid"
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#F87171",
                }}
              >
                {vehicle.make} · {yearLabel}
              </p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-heading), Rajdhani, sans-serif",
                  fontSize: "clamp(22px, 3.2vw, 34px)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#FFFFFF",
                }}
              >
                {vehicle.displayName}
              </h1>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#E5E7EB",
                }}
              >
                Accessories &amp; Body Kits
              </p>
              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 480,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#D1D5DB",
                }}
              >
                {heroDesc}
              </p>
              <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link
                  href="#compatible-products"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 8,
                    background: "#C41E1E",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "10px 18px",
                    textDecoration: "none",
                  }}
                >
                  Shop compatible parts
                </Link>
                <Link
                  href="/categories"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.45)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "10px 18px",
                    textDecoration: "none",
                  }}
                >
                  Browse categories
                </Link>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 440,
                marginLeft: "auto",
                marginRight: "auto",
                aspectRatio: "16 / 10",
                overflow: "hidden",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#0f0f0f",
                boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              }}
            >
              {vehicle.image ? (
                <Image
                  src={vehicle.image}
                  alt={`${vehicle.displayName} accessories in Pakistan`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 440px"
                  priority
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  🚗
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="compatible-products" className="store-container py-8 md:py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2
              className="font-heading text-xl font-bold md:text-2xl"
              style={{ color: "#111111", margin: 0 }}
            >
              Compatible products
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {products.length
                ? `${products.length} product${products.length === 1 ? "" : "s"} linked to this vehicle`
                : "No products linked to this vehicle yet."}
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
              Products for this car will show once you assign them in admin (compatible vehicles / car catalog).
              Universal products are not listed here unless you add them to this car.
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
