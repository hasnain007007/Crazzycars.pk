import Link from "next/link";
import { buildProductSpecifics } from "@/lib/seo/buildProductSpecifics";

/**
 * Unique, DB-grounded block for each PDP — reduces shared boilerplate share (C19).
 */
export function ProductSpecificsPanel({ product, carLinks = [] }) {
  const s = buildProductSpecifics(product, carLinks);
  if (!s.hasContent) return null;

  return (
    <section
      className="product-specifics mt-4 rounded-lg border border-[#E5E5E5] bg-white p-4"
      aria-label="Product specifics"
    >
      <h2 className="m-0 text-sm font-bold text-[#111111]">This listing</h2>
      <dl className="mt-3 space-y-2 text-sm text-[#333333]">
        {s.sku ? (
          <div className="flex gap-2">
            <dt className="m-0 w-28 shrink-0 font-semibold text-[#666666]">SKU</dt>
            <dd className="m-0">{s.sku}</dd>
          </div>
        ) : null}
        {s.fitment.length ? (
          <div className="flex gap-2">
            <dt className="m-0 w-28 shrink-0 font-semibold text-[#666666]">Fitment</dt>
            <dd className="m-0">
              {s.fitment.join("; ")}
              {s.fitment.length >= 6 ? " (see table below for more)" : ""}
            </dd>
          </div>
        ) : null}
        {s.material ? (
          <div className="flex gap-2">
            <dt className="m-0 w-28 shrink-0 font-semibold text-[#666666]">Material</dt>
            <dd className="m-0">{s.material}</dd>
          </div>
        ) : null}
        {s.included ? (
          <div className="flex gap-2">
            <dt className="m-0 w-28 shrink-0 font-semibold text-[#666666]">In the box</dt>
            <dd className="m-0">{s.included.slice(0, 400)}</dd>
          </div>
        ) : null}
        {s.specs
          .filter((row) => !/material|finish|construction/i.test(row.label))
          .slice(0, 5)
          .map((row) => (
            <div key={row.label} className="flex gap-2">
              <dt className="m-0 w-28 shrink-0 font-semibold text-[#666666]">{row.label}</dt>
              <dd className="m-0">{row.value}</dd>
            </div>
          ))}
      </dl>
      {s.neighbors.length ? (
        <p className="mt-3 mb-0 text-sm text-[#555555]">
          Related vehicle hubs:{" "}
          {s.neighbors.map((n, i) => (
            <span key={n.href}>
              {i > 0 ? " · " : null}
              <Link href={n.href} className="font-semibold text-[#C41E1E] underline-offset-2 hover:underline">
                {n.label}
              </Link>
            </span>
          ))}
          . Match years on this listing.
        </p>
      ) : null}
    </section>
  );
}
