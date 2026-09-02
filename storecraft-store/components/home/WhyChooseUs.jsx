import Link from "next/link";
import { STORE_CONTACT } from "@/config/store-policy";
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
          <span>Cash on delivery</span>
          <span>From {city}</span>
        </p>
      </div>
    </section>
  );
}
