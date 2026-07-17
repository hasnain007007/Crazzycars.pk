import { ReviewsPage } from "@/components/reviews/ReviewsPage";

export const metadata = {
  title: "Reviews | StoreCraft Admin",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl">
      <ReviewsPage />
    </div>
  );
}
