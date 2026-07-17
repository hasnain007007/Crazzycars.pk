import { SalesReport } from "@/components/reports/SalesReport";

export const metadata = { title: "Sales report" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl">
      <SalesReport />
    </div>
  );
}
