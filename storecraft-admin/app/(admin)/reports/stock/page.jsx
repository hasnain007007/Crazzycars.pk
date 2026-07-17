/**
 * Admin stock report: inventory levels, exports, and restock workflows.
 */
import { StockReport } from "@/components/reports/StockReport";

export default function StockReportPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <StockReport />
    </div>
  );
}
