/**
 * Legacy admin tracking page — permanently send customers to the storefront.
 * Old WhatsApp / email links to admin.crazzycars.pk/track-order keep working via redirect.
 */
import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

function storeTrackBase() {
  const raw = String(process.env.NEXT_PUBLIC_STORE_URL || "https://crazzycars.pk")
    .trim()
    .replace(/\/$/, "");
  if (/admin\./i.test(raw)) return "https://crazzycars.pk";
  return raw || "https://crazzycars.pk";
}

export default async function AdminTrackOrderRedirect({ searchParams }) {
  const sp = await searchParams;
  const tn = String(sp?.tracking || sp?.trackingNumber || "").trim();
  const base = storeTrackBase();
  const dest = tn
    ? `${base}/track-order?tracking=${encodeURIComponent(tn)}`
    : `${base}/track-order`;
  permanentRedirect(dest);
}
