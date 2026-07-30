import PostexApp from "@/components/postex/PostexApp";

export const metadata = { title: "PostEx Courier" };

export default function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">PostEx</h1>
        <p className="text-sm text-slate-500">Book parcels, print shipping slips, loadsheet & cancel — Shopify-style workflow.</p>
      </div>
      <PostexApp />
    </div>
  );
}
