import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { STORE_POLICY } from "@/config/store-policy";
import { COD_LINE, PREPAID_LINE } from "@/lib/paymentCopy";

const STD = Number(STORE_POLICY.shipping.standardFeePKR).toLocaleString("en-PK");
const BULKY = Number(STORE_POLICY.shipping.bulkyFeePKR || 500).toLocaleString("en-PK");

/**
 * ~150 words of indexable copy inside <main> on the home page.
 * H1 lives in BrandHero — this block is supporting body text only.
 */
export default function HomeIndexableIntro() {
  return (
    <section
      className="store-container home-indexable-intro"
      style={{ padding: "20px 16px 8px", maxWidth: 920 }}
      aria-label={`About ${BRAND_NAME}`}
    >
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#444" }}>
        {BRAND_NAME} is a Gujranwala car accessories shop selling since 2023. Browse body kits,
        LED lighting, carbon fiber trims, floor mats, spoilers and interior upgrades for Honda
        Civic, Toyota Corolla, Honda City and more — each listing shows make, model and year
        fitment. Delivery is Rs {STD} regular, Rs {BULKY} if the order has bulky items.{" "}
        {COD_LINE} on eligible products; body kits use prepaid JazzCash or bank transfer (
        {PREPAID_LINE}). Confirm fitment on WhatsApp 03284010007 before bulky kits ship.
      </p>
      <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: "#555" }}>
        Start with{" "}
        <Link href="/categories" className="font-semibold text-[#C41E1E] underline">
          categories
        </Link>
        ,{" "}
        <Link href="/cars" className="font-semibold text-[#C41E1E] underline">
          shop by car
        </Link>
        , or{" "}
        <Link href="/shop" className="font-semibold text-[#C41E1E] underline">
          shop all
        </Link>
        .
      </p>
    </section>
  );
}
