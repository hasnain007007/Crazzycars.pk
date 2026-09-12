import { SettlementDetail } from "@/components/finance/SettlementDetail";

export const metadata = { title: "Settlement" };

export default async function Page({ params }) {
  const { id } = await params;
  return <SettlementDetail batchId={id} />;
}
