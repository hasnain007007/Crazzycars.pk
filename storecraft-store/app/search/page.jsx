import { permanentRedirect } from "next/navigation";

export default async function SearchRedirect({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp?.q || sp?.query || "").trim();
  if (q) permanentRedirect(`/shop?q=${encodeURIComponent(q)}`);
  permanentRedirect("/shop");
}
