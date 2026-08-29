import Link from "next/link";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";
import { STORE_CONTACT, STORE_POLICY } from "@/config/store-policy";
import { formatPkrAmount } from "@/lib/storePolicyCopy";

function iconKind(item) {
  const title = String(item?.title || "").toLowerCase();
  const blob = `${title} ${item?.description || ""} ${item?.icon || ""}`.toLowerCase();
  if (/return|refund|exchange|🔄/.test(title) || /return|refund|exchange|🔄/.test(blob)) return "returns";
  if (/pay|cash|cod|💰/.test(title)) return "cod";
  if (/deliver|ship|truck|nationwide|🚚/.test(title)) return "delivery";
  if (/quality|real product|checked|✅/.test(title)) return "quality";
  if (/pay|cash|cod|💰/.test(blob) && !/deliver|ship|truck/.test(title)) return "cod";
  if (/deliver|ship|truck|🚚/.test(blob)) return "delivery";
  return "quality";
}

function TrustGlyph({ kind }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (kind === "delivery") {
    return (
      <svg {...common}>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    );
  }
  if (kind === "cod") {
    return (
      <svg {...common}>
        <rect x="2.5" y="7" width="19" height="12" rx="1.5" />
        <circle cx="12" cy="13" r="2.4" />
        <path d="M6 7V5.8A1.8 1.8 0 0 1 7.8 4h8.4A1.8 1.8 0 0 1 18 5.8V7" />
      </svg>
    );
  }
  if (kind === "returns") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default function WhyChooseUs({ settings }) {
  const raw = settings?.whyChooseUs;
  const items = (Array.isArray(raw) && raw.length ? raw : DEFAULT_HOMEPAGE_SETTINGS.whyChooseUs)
    .filter((item) => item.isActive !== false && (item.title || item.description))
    .slice(0, 4);

  if (!items.length) return null;

  const city = STORE_CONTACT.address.city;
  const fee = formatPkrAmount(STORE_POLICY.shipping.standardFeePKR);
  const days = STORE_POLICY.returns.windowDays;

  return (
    <section className="shop-close" aria-label="About the shop">
      <div className="shop-close__inner">
        <div className="shop-close__intro">
          <p className="shop-close__kicker">Based in {city}</p>
          <h2 className="shop-close__title">Built in {city}. Shipped nationwide.</h2>
          <p className="shop-close__lead">
            Year-fitment splitters, kits, carbon, and LED — Cash on Delivery, flat {fee} courier,
            and a {days}-day window if the part is defective or wrong.
          </p>
          <Link href="/about" className="shop-close__about">
            About the shop
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <ul className="shop-close__grid">
          {items.map((item, i) => (
            <li key={`${item.title}-${i}`} className="shop-close__card">
              <span className="shop-close__icon">
                <TrustGlyph kind={iconKind(item)} />
              </span>
              <div className="shop-close__copy">
                <p className="shop-close__card-title">{item.title}</p>
                <p className="shop-close__card-desc">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
