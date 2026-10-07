import Link from "next/link";
import { COD_ADVANCE_AMOUNT, PREPAID_DISCOUNT_PERCENT } from "@/config/checkout-money";
import { STORE_CONTACT } from "@/config/store-policy";
import { formatPkrAmount } from "@/lib/storePolicyCopy";
import { editorialCoverUrl, editorialInsetUrl } from "@/lib/cloudinaryImage";

function mediaUrl(field) {
  if (field == null) return "";
  if (typeof field === "string") return field.trim();
  if (typeof field === "object") {
    const u = field.url ?? field.secure_url ?? field.secureUrl;
    return typeof u === "string" ? u.trim() : "";
  }
  return "";
}

export default function WhyChooseUs({ story = null, heroImage = "" }) {
  const city = STORE_CONTACT.address.city;
  const coverRaw = mediaUrl(story?.image1) || String(heroImage || "").trim();
  const insetRaw = mediaUrl(story?.image2);
  const visual = coverRaw ? editorialCoverUrl(coverRaw) || coverRaw : "";
  const inset = insetRaw && insetRaw !== coverRaw ? editorialInsetUrl(insetRaw) || insetRaw : "";

  return (
    <section className="shop-band" aria-label="About Crazzycars.pk">
      <div className="shop-band__visual">
        {visual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visual}
            alt="Crazzycars.pk — car accessories from Gujranwala"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="shop-band__fallback" aria-hidden />
        )}
        <div className="shop-band__grade" aria-hidden />
        <div className="shop-band__fade" aria-hidden />
        {inset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="shop-band__inset" src={inset} alt="" loading="lazy" decoding="async" />
        ) : null}
      </div>

      <div className="shop-band__copy">
        <p className="shop-band__kicker">{city} · Pakistan</p>
        <h2 className="shop-band__title">
          <span className="shop-band__brand">Crazzycars.pk</span>
          <span className="shop-band__rule" aria-hidden />
          <span className="shop-band__headline">
            Exterior performance styling
            <br />
            for Pakistani cars
          </span>
        </h2>
        <p className="shop-band__lead">
          Splitters, LED lighting, body kits, and carbon from our Gujranwala flagship —
          395+ accessories with year fitment on every listing. Cash on Delivery nationwide.
        </p>
        <p className="shop-band__lead shop-band__lead--offer">
          After you order on COD, send the {formatPkrAmount(COD_ADVANCE_AMOUNT)} booking /
          confirmation amount on WhatsApp. That small payment confirms your order is real so we
          can pack and dispatch quickly — it is deducted from your total and refunded if the item
          doesn&apos;t fit. Prefer full payment? Get {PREPAID_DISCOUNT_PERCENT}% off with JazzCash
          or bank transfer.
        </p>
        <div className="shop-band__actions">
          <Link href="/shop" className="shop-band__btn shop-band__btn--primary">
            Shop accessories
            <span aria-hidden="true"> →</span>
          </Link>
          <Link href="/cars" className="shop-band__btn shop-band__btn--ghost">
            Find your car
          </Link>
        </div>
        <p className="shop-band__chips">
          <span>Year-fit catalog</span>
          <span>COD booking {formatPkrAmount(COD_ADVANCE_AMOUNT)}</span>
          <span>{PREPAID_DISCOUNT_PERCENT}% off full pay</span>
          <span>From {city}</span>
        </p>
      </div>
    </section>
  );
}
