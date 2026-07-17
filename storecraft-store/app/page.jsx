import { HomePage } from "@/components/store/HomePage";
import { fetchProductsServer } from "@/lib/serverProductFetch";

export const metadata = {
  title: "Crazzycars.pk | Car Accessories Pakistan",
  description:
    "Buy premium car accessories online in Pakistan. Seat covers, floor mats, steering wheels, car lighting & more. Cash on delivery available nationwide from Sialkot.",
  keywords: [
    "car accessories pakistan",
    "seat covers pakistan",
    "Crazzycars.pk",
    "car parts online pakistan",
    "cod car accessories",
    "auto accessories pakistan",
  ],
};

export default async function Page() {
  const { products: bestSellers } = await fetchProductsServer({
    limit: 4,
    sort: "popular",
  });

  return <HomePage initialBestSellers={bestSellers} />;
}
